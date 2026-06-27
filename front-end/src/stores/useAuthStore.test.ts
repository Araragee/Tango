import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mock references ───────────────────────────────────────────────────
// vi.mock factories are hoisted before const declarations, so any variables
// shared between the factory and test bodies must be declared with vi.hoisted().

const {
  mockGetSession,
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
  mockOnAuthStateChange,
  mockResetPasswordForEmail,
  mockUpdateUser,
  fakeSubscription,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  fakeSubscription: { unsubscribe: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signInWithOAuth: vi.fn(async () => ({ error: null })),
      signInWithOtp: vi.fn(async () => ({ error: null })),
      resend: vi.fn(async () => ({ error: null })),
    },
  },
}))

vi.mock('./useHouseholdStore', () => ({
  useHouseholdStore: () => ({ reset: vi.fn(async () => {}) }),
}))

import { useAuthStore } from './useAuthStore'

// ── Auth state event emitter ──────────────────────────────────────────────────
let _authListener: ((event: string, session: any) => void) | null = null

const fakeUser = { id: 'u-1', email: 'alice@example.com' } as any
const fakeSession = { user: fakeUser }

function setupDefaultMocks() {
  mockGetSession.mockResolvedValue({ data: { session: fakeSession } })
  mockOnAuthStateChange.mockImplementation((cb: any) => {
    _authListener = cb
    return { data: { subscription: fakeSubscription } }
  })
  mockSignInWithPassword.mockResolvedValue({ data: { user: fakeUser }, error: null })
  mockSignUp.mockResolvedValue({ data: { user: fakeUser, session: fakeSession }, error: null })
  mockSignOut.mockResolvedValue({ error: null })
  mockResetPasswordForEmail.mockResolvedValue({ error: null })
  mockUpdateUser.mockResolvedValue({ error: null })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  sessionStorage.clear()
  fakeSubscription.unsubscribe.mockClear()
  setupDefaultMocks()
})

// ── init ──────────────────────────────────────────────────────────────────────

describe('init', () => {
  it('sets user from the active session', async () => {
    const auth = useAuthStore()
    await auth.init()
    expect(auth.user?.id).toBe('u-1')
  })

  it('sets initialized to true', async () => {
    const auth = useAuthStore()
    await auth.init()
    expect(auth.initialized).toBe(true)
  })

  it('sets user to null when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const auth = useAuthStore()
    await auth.init()
    expect(auth.user).toBeNull()
  })

  it('is idempotent — calling twice does not register a second listener', async () => {
    const auth = useAuthStore()
    // Clear any calls accumulated by prior tests in this file before asserting.
    mockOnAuthStateChange.mockClear()
    await auth.init()
    await auth.init() // second call should short-circuit: initialized=true
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('flags PASSWORD_RECOVERY event', async () => {
    const auth = useAuthStore()
    await auth.init()
    _authListener?.('PASSWORD_RECOVERY', null)
    expect(auth.isPasswordRecovery).toBe(true)
  })

  it('sets sessionExpired on unexpected SIGNED_OUT', async () => {
    const auth = useAuthStore()
    await auth.init()
    _authListener?.('SIGNED_OUT', null)
    expect(auth.sessionExpired).toBe(true)
  })

  it('clears persisted session when tango:no-persist is set and no session-alive sentinel', async () => {
    localStorage.setItem('tango:no-persist', '1')
    const sbKey = 'sb-test-auth-token'
    localStorage.setItem(sbKey, 'old-token')
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const auth = useAuthStore()
    await auth.init()

    expect(localStorage.getItem(sbKey)).toBeNull()
  })
})

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('sets user on successful login', async () => {
    const auth = useAuthStore()
    await auth.login('alice@example.com', 'secret')
    expect(auth.user?.id).toBe('u-1')
  })

  it('stores no-persist flag when keepLoggedIn is false', async () => {
    const auth = useAuthStore()
    await auth.login('alice@example.com', 'secret', false)
    expect(localStorage.getItem('tango:no-persist')).toBe('1')
    expect(sessionStorage.getItem('tango:session-alive')).toBe('1')
  })

  it('removes no-persist flag when keepLoggedIn is true', async () => {
    localStorage.setItem('tango:no-persist', '1')
    const auth = useAuthStore()
    await auth.login('alice@example.com', 'secret', true)
    expect(localStorage.getItem('tango:no-persist')).toBeNull()
  })

  it('throws on Supabase auth error', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid credentials') })
    const auth = useAuthStore()
    await expect(auth.login('bad@example.com', 'wrong')).rejects.toThrow('Invalid credentials')
  })
})

// ── signup ────────────────────────────────────────────────────────────────────

describe('signup', () => {
  it('returns needsConfirm=false when session is returned immediately', async () => {
    const auth = useAuthStore()
    const result = await auth.signup('alice@example.com', 'password')
    expect(result.needsConfirm).toBe(false)
  })

  it('returns needsConfirm=true when no session (email confirmation flow)', async () => {
    mockSignUp.mockResolvedValue({ data: { user: fakeUser, session: null }, error: null })
    const auth = useAuthStore()
    const result = await auth.signup('alice@example.com', 'password')
    expect(result.needsConfirm).toBe(true)
  })

  it('throws on Supabase auth error', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: new Error('Email taken') })
    const auth = useAuthStore()
    await expect(auth.signup('alice@example.com', 'pw')).rejects.toThrow('Email taken')
  })
})

// ── logout ────────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('clears the user', async () => {
    const auth = useAuthStore()
    await auth.init()
    await auth.logout()
    expect(auth.user).toBeNull()
  })

  it('resets initialized to false so init() can run again', async () => {
    const auth = useAuthStore()
    await auth.init()
    await auth.logout()
    expect(auth.initialized).toBe(false)
  })

  it('does not set sessionExpired when logout is voluntary', async () => {
    const auth = useAuthStore()
    await auth.init()

    // In real Supabase, signOut fires onAuthStateChange('SIGNED_OUT') while
    // _loggingOut is still true. Replicate that by firing the listener inside
    // the signOut mock, before _loggingOut resets to false.
    mockSignOut.mockImplementation(async () => {
      _authListener?.('SIGNED_OUT', null)
      return { error: null }
    })

    await auth.logout()
    expect(auth.sessionExpired).toBe(false)
  })

  it('removes session storage flags', async () => {
    localStorage.setItem('tango:no-persist', '1')
    sessionStorage.setItem('tango:session-alive', '1')
    const auth = useAuthStore()
    await auth.logout()
    expect(localStorage.getItem('tango:no-persist')).toBeNull()
    expect(sessionStorage.getItem('tango:session-alive')).toBeNull()
  })
})

// ── resetPassword ──────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  it('calls supabase with the correct email', async () => {
    const auth = useAuthStore()
    await auth.resetPassword('alice@example.com')
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/confirm') }),
    )
  })

  it('throws on supabase error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: new Error('Not found') })
    const auth = useAuthStore()
    await expect(auth.resetPassword('nobody@example.com')).rejects.toThrow('Not found')
  })
})

// ── updatePassword ─────────────────────────────────────────────────────────────

describe('updatePassword', () => {
  it('clears isPasswordRecovery flag on success', async () => {
    const auth = useAuthStore()
    await auth.init()
    _authListener?.('PASSWORD_RECOVERY', null)
    expect(auth.isPasswordRecovery).toBe(true)
    await auth.updatePassword('newSecret123')
    expect(auth.isPasswordRecovery).toBe(false)
  })

  it('throws on supabase error', async () => {
    mockUpdateUser.mockResolvedValue({ error: new Error('Weak password') })
    const auth = useAuthStore()
    await expect(auth.updatePassword('123')).rejects.toThrow('Weak password')
  })
})

// ── email computed ────────────────────────────────────────────────────────────

describe('email computed', () => {
  it('returns the email from user', async () => {
    const auth = useAuthStore()
    await auth.init()
    expect(auth.email).toBe('alice@example.com')
  })

  it('returns null when no user', () => {
    const auth = useAuthStore()
    expect(auth.email).toBeNull()
  })
})
