<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import NotificationSystem from './components/NotificationSystem.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import FloatingBoy from './components/FloatingBoy.vue';
import NotificationsBell from './components/NotificationsBell.vue';
import ActivityFeed from './components/ActivityFeed.vue';
import PresenceBadge from './components/PresenceBadge.vue';
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

const headerAvatar = computed(() => store.partnerAvatarUrl ?? store.avatarUrl ?? null);

const showNav = computed(() => route.path.startsWith('/app'));

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
    <header class="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface border-b-2 border-black dark:border-white">
      <div class="flex items-center gap-2 cursor-pointer" @click="goHome()">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <h1 class="text-2xl font-black text-primary tracking-[0.1em] italic uppercase">TANGO</h1>
      </div>

      <div class="flex items-center gap-4">
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
          <span class="hidden sm:inline">Search</span>
          <kbd class="hidden sm:inline px-1 bg-surface text-[10px] pixel-border-sm">⌘K</kbd>
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
            :alt="(household.partner ? store.partnerName : store.userName) + ' avatar'"
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
      showNav ? 'pt-20 pb-28 px-4 md:px-8 max-w-6xl mx-auto' : 'pt-0 pb-0 px-0 max-w-none w-full'
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

    <FloatingBoy />
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
