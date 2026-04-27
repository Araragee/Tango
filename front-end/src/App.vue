<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import NotificationSystem from './components/NotificationSystem.vue';
import { useAuthStore } from './stores/useAuthStore';
import { useHouseholdStore } from './stores/useHouseholdStore';
import { isConfigured } from './lib/supabase';

const router = useRouter();
const route = useRoute();
const notificationRef = ref<InstanceType<typeof NotificationSystem> | null>(null);
const auth = useAuthStore();
const household = useHouseholdStore();

const showNav = computed(() => route.path.startsWith('/app'));

/** Logo click: go home for the app, not the marketing landing */
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
  notificationRef.value?.add(message, type);
});
</script>

<template>
  <div class="min-h-screen bg-background text-on-background bg-dither selection:bg-primary-container selection:text-on-primary-container">
    <!-- TopAppBar -->
    <header class="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface dark:bg-stone-900 border-b-2 border-black">
      <div class="flex items-center gap-2 cursor-pointer" @click="goHome()">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <h1 class="text-2xl font-black text-primary tracking-[0.1em] italic uppercase">TANGO</h1>
      </div>

      <div class="flex items-center gap-4">
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
          class="w-10 h-10 pixel-border bg-surface-container-highest overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          @click="router.push('/app/settings')"
          aria-label="Settings"
        >
          <img
            alt="Partner Profile"
            class="w-full h-full object-cover grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuARsylQHyCixmFuURzGboOIi2XZhcz6LszBOMsRrj0mHIBOVwbK7OC6-1_Sfr9Co3z21kxhd1SrVg1A935uvoXEcXSBl4MYBU8gyoH_IXWl2HYkyKBHmtBc1JDK7kT1dVjm5JPoKE5x-8I1SLQPoTY-gW2u4zqYo82IooaPfF4thuX_gVFL4GruyLjiyZrJmFf5ah6dy3TzGRsXrmmuwP6KvKi4P0BYddYpQrG8c2tl58hV9BFZGfKTDZnPIfsb1Hv5wk3hfHLP5iU"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
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

    <!-- Navigation -->
    <BottomNav v-if="showNav" />

    <!-- Notifications -->
    <NotificationSystem ref="notificationRef" />
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
