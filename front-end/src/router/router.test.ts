import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

// ── Store state the guards read ───────────────────────────────────────────────

let _authUser: any = null
let _authInitialized = true
let _authIsPasswordRecovery = false
let _householdId: string | null = null

const mockAuthInit = vi.fn(async () => {
  _authInitialized = true
})
const mockHouseholdLoad = vi.fn(async () => {})

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    get user() { return _authUser },
    get initialized() { return _authInitialized },
    get isPasswordRecovery() { return _authIsPasswordRecovery },
    init: mockAuthInit,
  }),
}))

vi.mock('@/stores/useHouseholdStore', () => ({
  useHouseholdStore: () => ({
    get householdId() { return _householdId },
    load: mockHouseholdLoad,
  }),
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: true,
}))

vi.mock('@/utils/safeRedirect', () => ({
  validateRedirect: (v: unknown, fallback = '/') => {
    if (typeof v !== 'string' || !v) return fallback
    if (v.startsWith('//') || v.includes(':')) return fallback
    if (!v.startsWith('/')) return fallback
    return v
  },
}))

// ── Build the router under test ───────────────────────────────────────────────
// We recreate it from scratch here so the guards are exercised without
// importing real Vue components (which would fail in jsdom).

async function buildRouter() {
  const { sanitiseRedirectParam } = await import('./middleware')

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' }, meta: { public: true } },
      { path: '/login', component: { template: '<div/>' }, meta: { public: true } },
      { path: '/signup', component: { template: '<div/>' }, meta: { public: true } },
      { path: '/reset-password', component: { template: '<div/>' }, meta: { public: true } },
      { path: '/onboarding', component: { template: '<div/>' }, meta: { requiresAuth: true } },
      { path: '/app/budget', component: { template: '<div/>' }, meta: { requiresAuth: true, requiresHousehold: true } },
      { path: '/app/settings', component: { template: '<div/>' }, meta: { requiresAuth: true, requiresHousehold: true } },
    ],
  })

  router.beforeEach(sanitiseRedirectParam)

  router.beforeEach(async (to) => {
    const { isConfigured } = await import('@/lib/supabase')
    if (!isConfigured) return true

    const { useAuthStore } = await import('@/stores/useAuthStore')
    const { useHouseholdStore } = await import('@/stores/useHouseholdStore')
    const auth = useAuthStore()
    const household = useHouseholdStore()

    if (!auth.initialized) {
      await auth.init()
      if (auth.user) await household.load()
    }

    if (auth.isPasswordRecovery && to.path !== '/reset-password') {
      return '/reset-password'
    }

    if (to.meta.requiresAuth && !auth.user) {
      const redirectAfter = encodeURIComponent(to.fullPath)
      return `/login?redirect=${redirectAfter}`
    }
    if (to.meta.requiresHousehold && !household.householdId) return '/onboarding'

    if (auth.user && (to.path === '/login' || to.path === '/signup' || to.path === '/')) {
      return household.householdId ? '/app/budget' : '/onboarding'
    }

    return true
  })

  return router
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  _authUser = null
  _authInitialized = true
  _authIsPasswordRecovery = false
  _householdId = null
  mockAuthInit.mockClear()
  mockHouseholdLoad.mockClear()
})

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('Auth guard', () => {
  it('redirects to /login when unauthenticated user hits a requiresAuth route', async () => {
    const router = await buildRouter()
    await router.push('/app/budget')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('includes the original path in the redirect query param', async () => {
    const router = await buildRouter()
    await router.push('/app/settings')
    // Vue Router decodes query params automatically; the guard encodes with
    // encodeURIComponent but the router stores it decoded.
    expect(router.currentRoute.value.query.redirect).toBe('/app/settings')
  })

  it('allows access to a requiresAuth route when user is authenticated', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    const router = await buildRouter()
    await router.push('/app/budget')
    expect(router.currentRoute.value.path).toBe('/app/budget')
  })
})

// ── Household guard ───────────────────────────────────────────────────────────

describe('Household guard', () => {
  it('redirects to /onboarding when authenticated but no household', async () => {
    _authUser = { id: 'u-1' }
    _householdId = null
    const router = await buildRouter()
    await router.push('/app/budget')
    expect(router.currentRoute.value.path).toBe('/onboarding')
  })

  it('allows access to requiresHousehold route when household is set', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    const router = await buildRouter()
    await router.push('/app/settings')
    expect(router.currentRoute.value.path).toBe('/app/settings')
  })
})

// ── Login/signup redirect for authenticated users ─────────────────────────────

describe('Auth user redirect from public routes', () => {
  it('redirects authenticated user with household from / to /app/budget', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    const router = await buildRouter()
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/app/budget')
  })

  it('redirects authenticated user without household from / to /onboarding', async () => {
    _authUser = { id: 'u-1' }
    _householdId = null
    const router = await buildRouter()
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/onboarding')
  })

  it('redirects authenticated user with household from /login to /app/budget', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    const router = await buildRouter()
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/app/budget')
  })

  it('redirects authenticated user with household from /signup to /app/budget', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    const router = await buildRouter()
    await router.push('/signup')
    expect(router.currentRoute.value.path).toBe('/app/budget')
  })
})

// ── Password recovery guard ───────────────────────────────────────────────────

describe('Password recovery guard', () => {
  it('redirects any navigation to /reset-password during recovery flow', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    _authIsPasswordRecovery = true
    const router = await buildRouter()
    await router.push('/app/budget')
    expect(router.currentRoute.value.path).toBe('/reset-password')
  })

  it('allows navigation to /reset-password itself during recovery', async () => {
    _authUser = { id: 'u-1' }
    _householdId = 'hh-1'
    _authIsPasswordRecovery = true
    const router = await buildRouter()
    await router.push('/reset-password')
    expect(router.currentRoute.value.path).toBe('/reset-password')
  })
})

// ── middleware: sanitiseRedirectParam ─────────────────────────────────────────

describe('sanitiseRedirectParam in router', () => {
  it('strips an unsafe redirect before the auth guard runs', async () => {
    _authUser = null
    const router = await buildRouter()
    await router.push('/login?redirect=https%3A%2F%2Fevil.com')
    // The unsafe redirect should be stripped; the user lands on /login without it
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('preserves a safe redirect param on /login', async () => {
    _authUser = null
    const router = await buildRouter()
    await router.push('/login?redirect=%2Fapp%2Fbudget')
    expect(router.currentRoute.value.query.redirect).toBe('/app/budget')
  })
})
