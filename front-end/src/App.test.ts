import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';

// jsdom doesn't ship `window.matchMedia`; useThemeStore reads it at init time
// to seed `systemDark`. Stub it before any store imports so the read returns
// a no-op MediaQueryList shape.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Module mocks (hoisted by vitest) ────────────────────────────────────────
// App.vue pulls in ~12 Pinia stores and several composables that touch
// Supabase, websockets, and the service-worker. Mock anything with side
// effects so the test stays a pure render check.

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  },
}));

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: () => ({
    needRefresh: ref(false),
    offlineReady: ref(false),
    updateServiceWorker: vi.fn(),
  }),
}));

vi.mock('./stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: null, sessionExpired: false, logout: vi.fn(), init: vi.fn() }),
}));

vi.mock('./stores/useHouseholdStore', () => ({
  useHouseholdStore: () => ({ householdId: null, partner: null, reset: vi.fn() }),
}));

vi.mock('./stores/useNotificationsStore', () => ({
  useNotificationsStore: () => ({ fetch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), items: [] }),
}));

vi.mock('./stores/useActivityStore', () => ({
  useActivityStore: () => ({ fetch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), items: [] }),
}));

vi.mock('./stores/usePresenceStore', () => ({
  usePresenceStore: () => ({ subscribe: vi.fn(), unsubscribe: vi.fn(), stopNetworkWatch: vi.fn() }),
}));

vi.mock('./stores/useOfflineQueue', () => ({
  useOfflineQueue: () => ({ startAutoFlush: vi.fn(), stopAutoFlush: vi.fn(), enqueue: vi.fn(), clearAll: vi.fn(), pending: [] }),
}));

vi.mock('./stores/useContributionsStore', () => ({
  useContributionsStore: () => ({ fetchForHousehold: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), items: [] }),
}));

vi.mock('./stores/useRecurringStore', () => ({
  useRecurringStore: () => ({ fetch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), items: [] }),
}));

vi.mock('./stores/useAchievementsStore', () => ({
  useAchievementsStore: () => ({ fetch: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), evaluate: vi.fn(), items: [] }),
}));

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from './App.vue';
import LandingPage from './components/LandingPage.vue';

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders TANGO header and landing copy on the root route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: LandingPage, meta: { public: true } },
        { path: '/login', component: { template: '<div/>' }, meta: { public: true } },
        { path: '/signup', component: { template: '<div/>' }, meta: { public: true } },
        { path: '/app/budget', component: { template: '<div/>' } },
        { path: '/onboarding', component: { template: '<div/>' } },
      ],
    });
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          // Heavy child components that pull in their own stores / dom apis
          NotificationSystem: true,
          GlobalSearch: true,
          NotificationsBell: true,
          ActivityFeed: true,
          PresenceBadge: true,
          PushPromptBanner: true,
          IosInstallHint: true,
          BottomNav: true,
        },
      },
    });

    expect(wrapper.text()).toContain('TANGO');
    expect(wrapper.text()).toContain('Finance & Planning');
  });
});
