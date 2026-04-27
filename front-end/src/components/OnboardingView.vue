<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { isConfigured } from '../lib/supabase';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';

const router = useRouter();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const step = ref(1);
const householdMode = ref<'create' | 'join'>('create');
const inviteInput = ref('');
const emailInvite = ref('');
const loading = ref(false);
const error = ref('');
const displayName = ref('');
const isNameSet = ref(false);

const next = () => {
  if (step.value < 3) {
    step.value++;
  } else {
    step.value = 4; // household setup
  }
};

const createHousehold = async () => {
  if (!displayName.value.trim()) {
    error.value = 'What is your name?';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { useAppStore } = await import('../stores/useStore');
    const store = useAppStore();
    await store.updateProfile(displayName.value.trim());
    
    await household.createHousehold();
    // Stay on page — template shows invite code + "Let's Go" button
  } catch (e: any) {
    error.value = e.message ?? 'Failed to create household.';
  } finally {
    loading.value = false;
  }
};

const joinHousehold = async () => {
  if (!displayName.value.trim()) {
    error.value = 'What is your name?';
    return;
  }
  if (!inviteInput.value.trim()) {
    error.value = 'Enter an invite code.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { useAppStore } = await import('../stores/useStore');
    const store = useAppStore();
    await store.updateProfile(displayName.value.trim());
    
    await household.joinHousehold(inviteInput.value.trim());
    router.push('/app/budget');
  } catch (e: any) {
    error.value = e.message ?? 'Invalid invite code.';
  } finally {
    loading.value = false;
  }
};

const sendEmailInvite = async () => {
  if (!emailInvite.value.trim()) return;
  if (!isConfigured) {
    notify('Email invite requires Supabase to be configured.', 'info');
    return;
  }
  try {
    await household.sendEmailInvite(emailInvite.value.trim());
    notify('Invite sent!', 'success');
    emailInvite.value = '';
  } catch (e: any) {
    notify(e.message ?? 'Failed to send invite.', 'error');
  }
};

const copyCode = () => {
  if (household.inviteCode) {
    navigator.clipboard.writeText(household.inviteCode);
    notify('Invite code copied!', 'success');
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto py-12 pt-16 min-h-screen flex flex-col justify-center">
    <TangoCard padding="xl" shadow="default" class="text-center">

      <!-- Step 1: Track Together -->
      <div v-if="step === 1" class="space-y-6">
        <div class="w-32 h-32 bg-primary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-primary-container" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
        </div>
        <h2 class="text-headline-lg">Track Together</h2>
        <p class="text-body-lg text-on-surface-variant">Manage your joint finances with ease. Sync accounts and track spending as a duo.</p>
      </div>

      <!-- Step 2: Plan Your Life -->
      <div v-if="step === 2" class="space-y-6">
        <div class="w-32 h-32 bg-secondary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-secondary-container" style="font-variation-settings: 'FILL' 1;">calendar_month</span>
        </div>
        <h2 class="text-headline-lg">Plan Your Life</h2>
        <p class="text-body-lg text-on-surface-variant">A shared calendar for your shared life. Dates, bills, and errands all in one place.</p>
      </div>

      <!-- Step 3: Achieve Goals -->
      <div v-if="step === 3" class="space-y-6">
        <div class="w-32 h-32 bg-tertiary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-tertiary-container" style="font-variation-settings: 'FILL' 1;">flag</span>
        </div>
        <h2 class="text-headline-lg">Achieve Goals</h2>
        <p class="text-body-lg text-on-surface-variant">Set joint savings goals and watch your progress grow together.</p>
      </div>

      <!-- Step 4: Household Setup -->
      <div v-if="step === 4" class="space-y-6 text-left">
        <div class="text-center">
          <span class="material-symbols-outlined text-primary text-5xl" style="font-variation-settings: 'FILL' 1;">home_heart</span>
          <h2 class="text-headline-lg mt-2">Set Up Your Duo</h2>
          <p class="text-body-md text-on-surface-variant">Create a household or join your partner's.</p>
        </div>

        <!-- Mode toggle -->
        <div class="space-y-4">
          <TangoInput v-model="displayName" label="Your Name" placeholder="Alex" />
          
          <div class="flex gap-2">
            <button
              @click="householdMode = 'create'; error = ''"
              class="flex-1 py-2 pixel-border-sm text-label-sm uppercase font-bold transition-colors"
              :class="householdMode === 'create' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
            >Create</button>
            <button
              @click="householdMode = 'join'; error = ''"
              class="flex-1 py-2 pixel-border-sm text-label-sm uppercase font-bold transition-colors"
              :class="householdMode === 'join' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
            >Join</button>
          </div>
        </div>

        <!-- Create mode -->
        <div v-if="householdMode === 'create'" class="space-y-4">
          <p class="text-body-md text-on-surface-variant">Create your household first, then share the invite code with your partner.</p>

          <!-- Show code after creation (demo mode auto-creates) -->
          <div v-if="household.inviteCode" class="space-y-3">
            <div class="bg-primary-container pixel-border-sm p-4 flex items-center justify-between">
              <span class="text-headline-md font-black tracking-widest text-on-primary-container">{{ household.inviteCode }}</span>
              <button @click="copyCode" class="material-symbols-outlined text-on-primary-container hover:opacity-70 transition-opacity" aria-label="Copy code">content_copy</button>
            </div>
            <p class="text-label-sm text-on-surface-variant text-center uppercase tracking-wider">Share this code with your partner</p>
            <div class="flex gap-2">
              <TangoInput v-model="emailInvite" placeholder="partner@email.com" class="flex-1" />
              <TangoButton @click="sendEmailInvite" variant="surface" size="sm">Email</TangoButton>
            </div>
            <TangoButton @click="router.push('/app/budget')" shadow="dark" class="w-full">
              Let's Go!
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward</span>
            </TangoButton>
          </div>

          <TangoButton v-else @click="createHousehold" shadow="dark" class="w-full" :disabled="loading">
            {{ loading ? 'Creating…' : 'Create Household' }}
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">add_home</span>
          </TangoButton>
        </div>

        <!-- Join mode -->
        <div v-if="householdMode === 'join'" class="space-y-4">
          <p class="text-body-md text-on-surface-variant">Enter the invite code your partner shared with you.</p>
          <TangoInput v-model="inviteInput" label="Invite Code" placeholder="ABC123" />
          <TangoButton @click="joinHousehold" shadow="dark" class="w-full" :disabled="loading">
            {{ loading ? 'Joining…' : 'Join Household' }}
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">group_add</span>
          </TangoButton>
        </div>

        <p v-if="error" class="text-error text-label-sm text-center">{{ error }}</p>
      </div>

      <!-- Nav buttons (steps 1–3) -->
      <div v-if="step < 4" class="mt-12 flex flex-col gap-4">
        <TangoButton @click="next" size="lg" class="w-full">
          {{ step === 3 ? "Set Up Duo" : "Next" }}
        </TangoButton>
        <TangoButton v-if="step > 1" @click="step--" variant="surface" size="lg" class="w-full">Back</TangoButton>
        <div class="flex justify-center gap-2 mt-4">
          <div v-for="i in 3" :key="i" class="w-3 h-3 pixel-border-sm" :class="step === i ? 'bg-primary' : 'bg-surface-variant'"></div>
        </div>
      </div>

    </TangoCard>
  </div>
</template>
