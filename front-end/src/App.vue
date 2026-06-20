<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted, watch, onErrorCaptured } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import NotificationSystem from './components/NotificationSystem.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import UndoToast from './components/UndoToast.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import NotificationsBell from './components/NotificationsBell.vue'
import HelpDialog from './components/HelpDialog.vue'
import SyncStatusPill from './components/SyncStatusPill.vue';
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
const showHelp = ref(false);
const showMoreMenu = ref(false);

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

  // Teardown all channels
  notifications.unsubscribe();
  achievements.unsubscribe();
  activity.unsubscribe();
  presence.unsubscribe();
  contributions.unsubscribe();
  recurring.unsubscribe();
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
  // Errors always show. Non-errors respect notificationsEnabled + quiet hours.
  if (type === 'error' || (prefs.notificationsEnabled && !prefs.isInQuietHours())) {
    notificationRef.value?.add(message, type);
  }
});

onErrorCaptured((err: any) => {
  console.error('[App Error Captured]', err);
  notificationRef.value?.add('An unexpected error occurred: ' + (err.message || String(err)), 'error');
  return false;
});
</script>

<template>
  <div class="min-h-screen bg-background text-on-background bg-dither selection:bg-primary-container selection:text-on-primary-container">
    <header class="app-header fixed top-0 left-0 w-full z-40 flex items-center gap-2 sm:gap-3 px-4 md:px-8 bg-surface border-b-2 border-black dark:border-white">
      <!-- Logo / Home -->
      <button
        @click="goHome()"
        class="flex items-center gap-2 shrink-0 -ml-1 px-1 py-1 hover:opacity-80 transition-opacity"
        aria-label="Tango home"
      >
        <span class="material-symbols-outlined text-primary text-[26px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <span class="text-headline-md font-bold text-on-surface hidden xs:inline">Tango</span>
      </button>

      <!-- Desktop primary navigation -->
      <nav v-if="showNav" class="hidden md:flex items-center gap-1 ml-2" aria-label="Primary">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path)"
          class="px-3 py-1.5 text-label-sm uppercase font-bold pixel-border-sm transition-colors"
          :class="route.path === item.path
            ? 'bg-primary text-on-primary'
            : 'bg-surface text-on-surface-variant hover:bg-surface-variant'"
        >{{ item.name }}</button>
      </nav>

      <!-- Spacer pushes actions to the right -->
      <div class="flex-1"></div>

      <!-- Right-side actions -->
      <div v-if="showNav" class="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          @click="showSearch = true"
          class="flex items-center gap-2 px-2.5 py-1.5 min-h-9 pixel-border-sm bg-surface-variant hover:bg-surface-container-high transition-colors text-on-surface-variant text-label-sm"
          aria-label="Search (Cmd+K)"
        >
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span class="hidden lg:inline">Search</span>
          <kbd class="hidden lg:inline px-1 bg-surface text-[10px] pixel-border-sm">⌘K</kbd>
        </button>

        <SyncStatusPill />
        <NotificationsBell />

        <!-- Secondary actions — inline on desktop -->
        <button
          @click="showHelp = true"
          class="hidden md:inline-flex tap-target material-symbols-outlined text-on-surface hover:text-primary transition-colors"
          aria-label="Help"
        >help</button>
        <button
          @click="showActivity = true"
          class="hidden md:inline-flex tap-target material-symbols-outlined text-on-surface hover:text-primary transition-colors"
          aria-label="Activity"
        >timeline</button>
        <button
          @click="router.push('/app/archive')"
          class="hidden md:inline-flex tap-target material-symbols-outlined text-on-surface hover:text-primary transition-colors"
          aria-label="Archive"
        >history</button>

        <!-- Secondary actions — overflow menu on mobile -->
        <div class="relative md:hidden">
          <button
            @click="showMoreMenu = !showMoreMenu"
            class="tap-target material-symbols-outlined text-on-surface hover:text-primary transition-colors"
            aria-label="More actions"
            aria-haspopup="true"
            :aria-expanded="showMoreMenu"
          >more_vert</button>
          <div v-if="showMoreMenu" class="fixed inset-0 z-40" @click="showMoreMenu = false"></div>
          <div
            v-if="showMoreMenu"
            class="absolute right-0 top-full mt-1 z-50 w-48 bg-surface pixel-border hard-shadow-dark py-1"
            role="menu"
          >
            <button
              v-for="m in [
                { icon: 'help', label: 'How it works', act: () => { showHelp = true; } },
                { icon: 'timeline', label: 'Activity', act: () => { showActivity = true; } },
                { icon: 'history', label: 'Archive', act: () => { router.push('/app/archive'); } },
              ]"
              :key="m.label"
              @click="m.act(); showMoreMenu = false"
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left text-body-md hover:bg-surface-variant transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[20px] text-on-surface-variant">{{ m.icon }}</span>
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Settings / avatar -->
        <button
          @click="router.push('/app/settings')"
          class="relative w-10 h-10 pixel-border bg-surface-container-highest overflow-hidden flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
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
        </button>
      </div>
    </header>

    <main :class="[
      'min-h-screen transition-all duration-300',
      showNav ? 'with-header-offset max-md:pb-32 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto' : 'pt-0 pb-0 px-0 max-w-none w-full'
    ]">
      <router-view v-slot="{ Component }">
        <transition name="slide-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <BottomNav v-if="showNav" />

    <NotificationSystem ref="notificationRef" />
    <ConfirmDialog />
    <UndoToast />

    <GlobalSearch :show="showSearch" @close="showSearch = false" />

    <ActivityFeed :show="showActivity" @close="showActivity = false" />
    <HelpDialog :show="showHelp" @close="showHelp = false" />

    <PushPromptBanner />
    <IosInstallHint />

    <Transition name="slide-fade">
      <div
        v-if="pwa.needRefresh.value && showNav"
        class="bottom-above-nav fixed left-1/2 -translate-x-1/2 z-50 w-[80vw] max-w-[28rem] p-3 pixel-border bg-primary-container text-on-primary-container flex items-center gap-3"
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

@media (prefers-reduced-motion: reduce) {
  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: none !important;
  }
  .slide-fade-enter-from,
  .slide-fade-leave-to {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
