<script setup lang="ts">
import { ref, watch, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { useThemeStore, type AccentColor } from '../stores/useThemeStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';

const router = useRouter();
const store = useAppStore();
const auth = useAuthStore();
const household = useHouseholdStore();
const themeStore = useThemeStore();
const prefs = usePreferencesStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const userName = ref(store.userName);

watch(() => store.userName, (val) => {
    userName.value = val;
});

const themes: { name: string; color: AccentColor; bg: string }[] = [
    { name: 'Rose', color: 'rose', bg: 'bg-[#983e4b]' },
    { name: 'Blue', color: 'blue', bg: 'bg-[#3e5e98]' },
    { name: 'Green', color: 'green', bg: 'bg-[#3e9854]' },
    { name: 'Amber', color: 'amber', bg: 'bg-[#987a3e]' },
    { name: 'Purple', color: 'purple', bg: 'bg-[#7a3e98]' },
];

const updateProfile = async () => {
    if (!userName.value.trim()) {
        notify('Name cannot be empty.', 'error');
        return;
    }
    try {
        await store.updateProfile(userName.value.trim());
        notify('Profile updated successfully!', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to update profile.', 'error');
    }
};

const resetPreferences = () => {
    if (!confirm('Reset categories, budget limits, and theme to defaults? Your household data (transactions, goals, todos, events) will not be touched.')) return;
    localStorage.removeItem('tango:preferences');
    localStorage.removeItem('tango-dark');
    localStorage.removeItem('tango-accent');
    window.location.reload();
};

const signOut = async () => {
    await auth.logout();
    household.reset();
    router.push('/');
};
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="border-b-2 border-black dark:border-white pb-4">
      <h2 class="text-headline-xl">Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <TangoCard padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Profile</h3>
        <div class="space-y-4">
          <TangoInput label="Your Name" v-model="userName" />
          <div class="flex flex-col gap-1">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Partner</label>
            <div class="px-4 py-3 sunken-input bg-surface-variant text-on-surface-variant opacity-70">
              {{ store.partnerName }}
            </div>
            <p class="text-[10px] text-on-surface-variant uppercase mt-1">Managed by partner</p>
          </div>
          <TangoButton @click="updateProfile" shadow="dark" class="mt-4">Update Profile</TangoButton>
        </div>
      </TangoCard>

      <TangoCard padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Appearance</h3>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">Dark Mode</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                 :class="themeStore.isDark ? 'bg-primary' : 'bg-surface-variant'"
                 @click="themeStore.toggleDark()"
                 role="switch" :aria-checked="themeStore.isDark">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="themeStore.isDark ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-body-md font-bold uppercase block">Color Theme</span>
            <div class="flex flex-wrap gap-3">
                <button 
                    v-for="t in themes" 
                    :key="t.color"
                    @click="themeStore.setAccent(t.color)"
                    class="w-10 h-10 pixel-border transition-all flex items-center justify-center relative"
                    :class="[t.bg, themeStore.accentColor === t.color ? 'scale-110 hard-shadow-dark z-10' : 'hover:scale-105']"
                    :title="t.name"
                >
                    <span v-if="themeStore.accentColor === t.color" class="material-symbols-outlined text-white text-sm">check</span>
                </button>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-on-surface pt-4">
            <span class="text-body-md font-bold uppercase">Notifications</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative"
                 :class="prefs.notificationsEnabled ? 'bg-primary' : 'bg-surface-variant'"
                 @click="prefs.setNotificationsEnabled(!prefs.notificationsEnabled)"
                 role="switch" :aria-checked="prefs.notificationsEnabled">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="prefs.notificationsEnabled ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>
        </div>
      </TangoCard>

      <TangoCard padding="lg" class="md:col-span-2">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Local Preferences</h3>
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-body-md text-on-surface-variant">Reset categories, budget limits, and theme to defaults. Household data on the server is not affected.</p>
          <TangoButton @click="resetPreferences" variant="outline" class="text-error border-error border-2 hover:bg-error-container whitespace-nowrap">Reset Preferences</TangoButton>
        </div>
      </TangoCard>
    </div>

    <div class="flex justify-center pt-8">
        <TangoButton @click="signOut" variant="surface" shadow="dark">Sign Out</TangoButton>
    </div>
  </div>
</template>

