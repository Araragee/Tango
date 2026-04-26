<script setup lang="ts">
import { ref, inject } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const userName = ref(store.userName);
const partnerName = ref(store.partnerName);
const darkMode = ref(false);
const notifications = ref(true);

const updateProfile = () => {
    if (!userName.value.trim() || !partnerName.value.trim()) {
        notify('Names cannot be empty.', 'error');
        return;
    }
    store.updateProfile(userName.value, partnerName.value);
    notify('Profile updated successfully!', 'success');
};

const resetAccount = () => {
    if (confirm('Are you sure you want to reset all data?')) {
        localStorage.removeItem('tango-state');
        window.location.reload();
    }
};
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="border-b-2 border-black pb-4">
      <h2 class="text-headline-xl">Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <TangoCard padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Profile</h3>
        <div class="space-y-4">
          <TangoInput label="Your Name" v-model="userName" />
          <TangoInput label="Partner's Name" v-model="partnerName" />
          <TangoButton @click="updateProfile" shadow="dark" class="mt-4">Update Profile</TangoButton>
        </div>
      </TangoCard>

      <TangoCard padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Preferences</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">Dark Mode</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative"
                 :class="darkMode ? 'bg-primary' : 'bg-surface-variant'"
                 @click="darkMode = !darkMode"
                 role="switch" :aria-checked="darkMode">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="darkMode ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">Notifications</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative"
                 :class="notifications ? 'bg-primary' : 'bg-surface-variant'"
                 @click="notifications = !notifications"
                 role="switch" :aria-checked="notifications">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="notifications ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>
        </div>
      </TangoCard>

      <TangoCard padding="lg" class="md:col-span-2">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2 text-error">Danger Zone</h3>
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-body-md text-on-surface-variant">Reset all data and start over. This cannot be undone.</p>
          <TangoButton @click="resetAccount" variant="outline" class="text-error border-error border-2 hover:bg-error-container">Reset Account</TangoButton>
        </div>
      </TangoCard>
    </div>

    <div class="flex justify-center pt-8">
        <TangoButton @click="store.setActiveView('Landing')" variant="surface" shadow="dark">Sign Out</TangoButton>
    </div>
  </div>
</template>
