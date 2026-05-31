<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import NotificationSystem from './components/NotificationSystem.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import NotificationsBell from './components/NotificationsBell.vue';
import ActivityFeed from './components/ActivityFeed.vue';
import PresenceBadge from './components/PresenceBadge.vue';
import PushPromptBanner from './components/PushPromptBanner.vue';
import IosInstallHint from './components/IosInstallHint.vue';
import { usePwaUpdate } from './composables/usePwaUpdate';
import { useIdleTimeout } from './composables/useIdleTimeout';
import { useAuthStore } from './stores/useAuthStore';
import { useHouseholdStore } from './stores/useHouseholdStore';
import { useThemeStore } from './stores/useThemeStore';
import { usePreferencesStore } from './stores/usePreferencesStore';
import { useNotificationsStore } from './stores/useNotificationsStore';
import { useActivityStore } from './stores/useActivityStore';
import { usePresenceStore } from './stores/usePresenceStore';
import { useOfflineQueue } from './stores/useOfflineQueue';
import { useContributionsStore } from './stores/useContributionsStore';
import { useRecurringStore } from './stores/useRecurringStore';
import { useAchievementsStore } from './stores/useAchievementsStore';
import { useAppStore } from './stores/useStore';
import { isConfigured } from './lib/supabase';

const router = useRouter();
const route = useRoute();
const notificationRef = ref<InstanceType<typeof NotificationSystem> | null>(null);
const showSearch = ref(false);
const showActivity = ref(false);

const auth = useAuthStore();
const household = useHouseholdStore();
const themeStore = useThemeStore();
const prefs = usePreferencesStore();
const notifications = useNotificationsStore();
const activity = useActivityStore();
const presence = usePresenceStore();
const offline = useOfflineQueue();
const contributions = useContributionsStore();
const recurring = useRecurringStore();
const achievements = useAchievementsStore();
const store = useAppStore();

const headerAvatar = computed(() => store.avatarUrl ?? null);

const showNav = computed(() => route.path.startsWith('/app'));

const navItems = [
  { name: 'Budget', path: '/app/budget' },
  { name: 'Plans', path: '/app/plans' },
  { name: 'To-Dos', path: '/app/todos' },
  { name: 'Calendar', path: '/app/calendar' },
];

const pwa = usePwaUpdate();

useIdleTimeout(
  () => {
    if (!auth.user) return;
    auth.logout();
    router.push('/login');
    notificationRef.value?.add('Signed out due to inactivity.', 'info');
  },
  () => {
    if (!auth.user) return;
    notificationRef.value?.add('Session will expire in 1 minute due to inactivity.', 'info');
  }
);

const onGlobalKey = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    showSearch.value = true;
  }
};

onMounted(() => {
  themeStore.applyTheme();
  window.addEventListener('keydown', onGlobalKey);
  offline.startAutoFlush();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKey);
  offline.stopAutoFlush();
  presence.stopNetworkWatch();
});

watch(
  () => auth.user?.id ?? null,
  (uid, prevUid) => {
    if (uid && uid !== prevUid) {
      notifications.fetch();
      notifications.subscribe(uid);
      achievements.fetch();
      achievements.subscribe(uid);
    }
    if (!uid && prevUid) {
      notifications.unsubscribe();
      achievements.unsubscribe();
      offline.clearAll();
      
      if (route.meta.requiresAuth) {
        router.push({
          path: '/login',
          query: { redirect: route.fullPath }
        });
      }

      if (auth.sessionExpired) {
        notificationRef.value?.add('Session expired. Please sign in again.', 'error');
        auth.sessionExpired = false;
      }
    }
  },
  { immediate: true }
);

watch(
  () => [
    store.budget.recentActivity.length,
    store.plans.goals.length,
    store.plans.goals.filter(g => g.status === 'Completed').length,
    store.todos.items.filter(t => t.completed).length,
    store.calendar.events.length,
    store.calendar.events.filter(e => e.category === 'date' && e.mood != null).length,
  ],
  () => {
    if (!auth.user || !household.householdId) return;
    achievements.evaluate({
      transactions: store.budget.recentActivity as any,
      goals: store.plans.goals as any,
      todos: store.todos.items as any,
      events: store.calendar.events as any,
    });
  },
);

watch(
  () => household.householdId,
  (hid, prevHid) => {
    if (hid && hid !== prevHid) {
      activity.fetch(hid);
      activity.subscribe(hid);
      presence.subscribe(hid);
      contributions.fetchForHousehold(hid);
      contributions.subscribe(hid);
      recurring.fetch(hid);
      recurring.subscribe(hid);
    }
    if (!hid && prevHid) {
      activity.unsubscribe();
      presence.unsubscribe();
      contributions.unsubscribe();
      recurring.unsubscribe();
    }
  },
  { immediate: true }
);

function goHome() {
  if (!isConfigured) {
    router.push('/app/budget');
    return;
  }
  if (auth.user && household.householdId) {
    router.push('/app/budget');
  } else if (auth.user) {
    router.push('/onboarding');
  } else {
    router.push('/');
  }
}

provide('notify', (message: string, type?: 'success' | 'error' | 'info') => {
  if (type === 'error' || prefs.notificationsEnabled) {
    notificationRef.value?.add(message, type);
  }
});
</script>

<template>
  <div class="min-h-screen bg-background text-on-background bg-dither selection:bg-primary-container selection:text-on-primary-container">
    <header class="fixed top-0 left-0 w-full z-40 flex items-center px-4 md:px-8 h-16 bg-surface border-b-2 border-black dark:border-white">
      <!-- Logo -->
      <div class="flex items-center gap-2 cursor-pointer shrink-0" @click="goHome()">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <h1 class="text-2xl font-black text-primary tracking-[0.1em] italic uppercase">TANGO</h1>
      </div>

      <!-- Desktop nav (center) -->
      <nav v-if="showNav" class="hidden md:flex items-center gap-1 mx-auto">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path)"
          class="px-4 py-1.5 text-label-sm uppercase font-bold tracking-wider transition-all"
          :class="route.path === item.path
            ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
            : 'text-on-surface hover:text-primary'"
        >{{ item.name }}</button>
      </nav>

      <!-- Actions (right) -->
      <div class="flex items-center gap-3 ml-auto">
        <span
          v-if="showNav && !presence.isOnline"
          class="px-2 py-0.5 pixel-border-sm bg-error text-on-error text-[10px] uppercase font-bold"
          title="You are offline"
        >Offline</span>

        <button
          v-if="showNav"
          @click="showSearch = true"
          class="flex items-center gap-2 px-3 py-1.5 pixel-border-sm bg-surface-variant hover:bg-surface-container-high transition-colors text-on-surface-variant text-label-sm"
          aria-label="Search (Cmd+K)"
        >
          <span class="material-symbols-outlined text-[16px]">search</span>
          <span class="hidden lg:inline">Search</span>
          <kbd class="hidden lg:inline px-1 bg-surface text-[10px] pixel-border-sm">⌘K</kbd>
        </button>

        <NotificationsBell v-if="showNav" />

        <button
          v-if="showNav"
          @click="showActivity = true"
          class="material-symbols-outlined text-on-surface hover:text-primary transition-colors"
          aria-label="Activity"
        >
          timeline
        </button>

        <button
          v-if="showNav"
          @click="router.push('/app/archive')"
          class="material-symbols-outlined text-on-surface hover:text-primary transition-colors"
          aria-label="Archive"
        >
          history
        </button>

        <div
          v-if="showNav"
          class="relative w-10 h-10 pixel-border bg-surface-container-highest overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          @click="router.push('/app/settings')"
          aria-label="Settings"
        >
          <img
            v-if="headerAvatar"
            :alt="store.userName + ' avatar'"
            class="w-full h-full object-cover"
            :src="headerAvatar"
          />
          <span
            v-else
            class="material-symbols-outlined text-on-surface-variant"
            style="font-variation-settings: 'FILL' 1;"
          >person</span>
          <PresenceBadge
            v-if="household.partner"
            class="absolute -bottom-0.5 -right-0.5"
          />
        </div>
      </div>
    </header>

    <main :class="[
      'min-h-screen transition-all duration-300',
      showNav ? 'pt-20 max-md:pb-28 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto' : 'pt-0 pb-0 px-0 max-w-none w-full'
    ]">
      <router-view v-slot="{ Component }">
        <transition name="slide-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <BottomNav v-if="showNav" />

    <NotificationSystem ref="notificationRef" />

    <GlobalSearch :show="showSearch" @close="showSearch = false" />

    <ActivityFeed :show="showActivity" @close="showActivity = false" />

    <PushPromptBanner />
    <IosInstallHint />

    <Transition name="slide-fade">
      <div
        v-if="pwa.needRefresh.value && showNav"
        class="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 w-[80vw] p-3 pixel-border bg-primary-container text-on-primary-container flex items-center gap-3"
        role="alert"
      >
        <span class="material-symbols-outlined">system_update</span>
        <p class="flex-1 text-sm font-bold uppercase tracking-wide">New version ready</p>
        <button
          type="button"
          @click="pwa.applyUpdate()"
          class="px-3 py-1 pixel-border-sm bg-primary text-on-primary text-xs font-bold uppercase hover:opacity-90"
        >Reload</button>
        <button
          type="button"
          @click="pwa.dismissNeedRefresh()"
          class="material-symbols-outlined text-on-primary-container hover:opacity-70"
          aria-label="Dismiss update"
        >close</button>
      </div>
    </Transition>
  </div>
</template>

<style>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease-out;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
