import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useHouseholdStore } from '@/stores/useHouseholdStore'
import { isConfigured } from '@/lib/supabase'
import { sanitiseRedirectParam } from './middleware'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/components/LandingPage.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      component: () => import('@/components/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/signup',
      component: () => import('@/components/SignUpView.vue'),
      meta: { public: true },
    },
    {
      path: '/join/:code',
      component: () => import('@/components/JoinInviteView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password',
      component: () => import('@/components/ResetPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/auth/confirm',
      component: () => import('@/components/AuthConfirmView.vue'),
      meta: { public: true },
    },
    {
      path: '/onboarding',
      component: () => import('@/components/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app/budget',
      component: () => import('@/components/BudgetTracker.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    {
      path: '/app/plans',
      component: () => import('@/components/TangoPlans.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    {
      path: '/app/todos',
      component: () => import('@/components/TangoTodo.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    {
      path: '/app/calendar',
      component: () => import('@/components/SharedCalendar.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    {
      path: '/app/settings',
      component: () => import('@/components/SettingsView.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    {
      path: '/app/archive',
      component: () => import('@/components/ArchiveView.vue'),
      meta: { requiresAuth: true, requiresHousehold: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// ── Security middleware (runs first, before auth checks) ─────────────────────
router.beforeEach(sanitiseRedirectParam)

// ── Auth + household guard ────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  if (!isConfigured) return true

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

export default router
