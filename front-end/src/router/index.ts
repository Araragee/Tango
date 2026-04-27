import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useHouseholdStore } from '@/stores/useHouseholdStore'
import { isConfigured } from '@/lib/supabase'

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

router.beforeEach(async (to) => {
  // Demo mode: Supabase not configured → bypass all guards
  if (!isConfigured) return true

  const auth = useAuthStore()
  const household = useHouseholdStore()

  if (!auth.initialized) {
    await auth.init()
    if (auth.user) await household.load()
  }

  if (to.meta.requiresAuth && !auth.user) return '/login'
  if (to.meta.requiresHousehold && !household.householdId) return '/onboarding'

  // Redirect logged-in users away from public pages
  if (auth.user && (to.path === '/login' || to.path === '/signup' || to.path === '/')) {
    return household.householdId ? '/app/budget' : '/onboarding'
  }

  return true
})

export default router
