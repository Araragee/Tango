import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mock references ───────────────────────────────────────────────────

const { mockFetchAll, mockUnsubscribeRealtime } = vi.hoisted(() => ({
  mockFetchAll: vi.fn(async () => {}),
  mockUnsubscribeRealtime: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { signInWithOtp: vi.fn() },
  },
}))

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'u-1', email: 'alice@example.com' } }),
}))

vi.mock('./useStore', () => ({
  useAppStore: () => ({
    fetchAll: mockFetchAll,
    unsubscribeRealtime: mockUnsubscribeRealtime,
  }),
}))

import { useHouseholdStore } from './useHouseholdStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockFetchAll.mockClear()
  mockUnsubscribeRealtime.mockClear()
})

// ── createHousehold (demo mode) ───────────────────────────────────────────────

describe('createHousehold (demo mode)', () => {
  it('sets a demo household id', async () => {
    const store = useHouseholdStore()
    await store.createHousehold()
    expect(store.householdId).toBe('demo-household')
  })

  it('sets a demo invite code', async () => {
    const store = useHouseholdStore()
    await store.createHousehold()
    expect(store.inviteCode).toBe('DEMO01')
  })

  it('calls fetchAll after creating household', async () => {
    const store = useHouseholdStore()
    await store.createHousehold()
    expect(mockFetchAll).toHaveBeenCalledTimes(1)
  })

  it('sets an activeInvite with a code and future expiry', async () => {
    const store = useHouseholdStore()
    await store.createHousehold()
    expect(store.activeInvite).not.toBeNull()
    expect(store.activeInvite?.code).toBe('DEMO01')
    expect(new Date(store.activeInvite!.expires_at).getTime()).toBeGreaterThan(Date.now())
  })
})

// ── joinHousehold (demo mode) ─────────────────────────────────────────────────

describe('joinHousehold (demo mode)', () => {
  it('sets the household id to demo-household', async () => {
    const store = useHouseholdStore()
    await store.joinHousehold('ABC123')
    expect(store.householdId).toBe('demo-household')
  })

  it('normalises the invite code to uppercase', async () => {
    const store = useHouseholdStore()
    await store.joinHousehold('abc123')
    expect(store.inviteCode).toBe('ABC123')
  })

  it('calls fetchAll after joining', async () => {
    const store = useHouseholdStore()
    await store.joinHousehold('XYZ')
    expect(mockFetchAll).toHaveBeenCalledTimes(1)
  })
})

// ── createInvite (demo mode) ──────────────────────────────────────────────────

describe('createInvite (demo mode)', () => {
  it('returns an invite with a 6-char uppercase code', async () => {
    const store = useHouseholdStore()
    const invite = await store.createInvite()
    expect(invite?.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('sets activeInvite on the store', async () => {
    const store = useHouseholdStore()
    await store.createInvite()
    expect(store.activeInvite).not.toBeNull()
  })

  it('returns an expiry in the future', async () => {
    const store = useHouseholdStore()
    const invite = await store.createInvite()
    expect(new Date(invite!.expires_at).getTime()).toBeGreaterThan(Date.now())
  })
})

// ── revokeInvites (demo mode) ─────────────────────────────────────────────────

describe('revokeInvites (demo mode)', () => {
  it('clears activeInvite', async () => {
    const store = useHouseholdStore()
    await store.createInvite()
    await store.revokeInvites()
    expect(store.activeInvite).toBeNull()
  })
})

// ── removeMember (demo mode) ──────────────────────────────────────────────────

describe('removeMember (demo mode)', () => {
  it('removes the member from the list by user_id', async () => {
    const store = useHouseholdStore()
    store.members.push(
      { id: 'm-1', user_id: 'u-1', role: 'creator' },
      { id: 'm-2', user_id: 'u-2', role: 'partner' },
    )
    await store.removeMember('u-2')
    expect(store.members.find(m => m.user_id === 'u-2')).toBeUndefined()
    expect(store.members).toHaveLength(1)
  })
})

// ── renameHousehold ───────────────────────────────────────────────────────────

describe('renameHousehold', () => {
  it('updates householdName in demo mode', async () => {
    const store = useHouseholdStore()
    await store.renameHousehold('  Our Home  ')
    expect(store.householdName).toBe('Our Home')
  })

  it('throws when the name is empty or whitespace', async () => {
    const store = useHouseholdStore()
    await expect(store.renameHousehold('   ')).rejects.toThrow()
  })
})

// ── leaveHousehold (demo mode) ────────────────────────────────────────────────

describe('leaveHousehold (demo mode)', () => {
  it('resets all household state', async () => {
    const store = useHouseholdStore()
    await store.createHousehold()
    await store.leaveHousehold()
    expect(store.householdId).toBeNull()
    expect(store.inviteCode).toBeNull()
    expect(store.members).toHaveLength(0)
    expect(store.activeInvite).toBeNull()
  })
})

// ── reset ─────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears all state and calls unsubscribeRealtime', async () => {
    const store = useHouseholdStore()
    store.householdId = 'hh-1' as any
    store.householdName = 'Test Home' as any
    store.inviteCode = 'INVITE' as any
    store.members.push({ id: 'm-1', user_id: 'u-1', role: 'creator' })
    store.activeInvite = { code: 'XYZ', expires_at: '2099-01-01' } as any

    await store.reset()

    expect(store.householdId).toBeNull()
    expect(store.householdName).toBeNull()
    expect(store.inviteCode).toBeNull()
    expect(store.members).toHaveLength(0)
    expect(store.activeInvite).toBeNull()
    expect(mockUnsubscribeRealtime).toHaveBeenCalledTimes(1)
  })
})

// ── partner computed ──────────────────────────────────────────────────────────

describe('partner computed', () => {
  it('returns the member who is not the current user', () => {
    const store = useHouseholdStore()
    store.members.push(
      { id: 'm-1', user_id: 'u-1', role: 'creator' },
      { id: 'm-2', user_id: 'u-2', role: 'partner' },
    )
    expect(store.partner?.user_id).toBe('u-2')
  })

  it('returns undefined when there is only one member', () => {
    const store = useHouseholdStore()
    store.members.push({ id: 'm-1', user_id: 'u-1', role: 'creator' })
    expect(store.partner).toBeUndefined()
  })
})

// ── isCreator computed ────────────────────────────────────────────────────────

describe('isCreator computed', () => {
  it('returns true when current user is the creator', () => {
    const store = useHouseholdStore()
    store.members.push({ id: 'm-1', user_id: 'u-1', role: 'creator' })
    expect(store.isCreator).toBe(true)
  })

  it('returns false when current user is a partner', () => {
    const store = useHouseholdStore()
    store.members.push({ id: 'm-1', user_id: 'u-1', role: 'partner' })
    expect(store.isCreator).toBe(false)
  })

  it('returns false when there are no members', () => {
    const store = useHouseholdStore()
    expect(store.isCreator).toBe(false)
  })
})
