<script setup lang="ts">
import { ref } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';

const store = useAppStore();
const step = ref(1);

const next = () => {
  if (step.value < 3) {
    step.value++;
  } else {
    store.setActiveView('Budget');
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto py-12 pt-16 min-h-screen flex flex-col justify-center">
    <TangoCard padding="xl" shadow="default" class="text-center">
      <div v-if="step === 1" class="space-y-6">
        <div class="w-32 h-32 bg-primary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-primary-container" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
        </div>
        <h2 class="text-headline-lg">Track Together</h2>
        <p class="text-body-lg text-on-surface-variant">Manage your joint finances with ease. Sync accounts and track spending as a duo.</p>
      </div>

      <div v-if="step === 2" class="space-y-6">
        <div class="w-32 h-32 bg-secondary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-secondary-container" style="font-variation-settings: 'FILL' 1;">calendar_month</span>
        </div>
        <h2 class="text-headline-lg">Plan Your Life</h2>
        <p class="text-body-lg text-on-surface-variant">A shared calendar for your shared life. Dates, bills, and errands all in one place.</p>
      </div>

      <div v-if="step === 3" class="space-y-6">
        <div class="w-32 h-32 bg-tertiary-container mx-auto pixel-border-sm flex items-center justify-center">
          <span class="material-symbols-outlined text-6xl text-on-tertiary-container" style="font-variation-settings: 'FILL' 1;">flag</span>
        </div>
        <h2 class="text-headline-lg">Achieve Goals</h2>
        <p class="text-body-lg text-on-surface-variant">Set joint savings goals and watch your progress grow together.</p>
      </div>

      <div class="mt-12 flex flex-col gap-4">
        <TangoButton @click="next" size="lg" class="w-full">
          {{ step === 3 ? "Let's Go!" : "Next" }}
        </TangoButton>
        <div class="flex justify-center gap-2">
          <div v-for="i in 3" :key="i" class="w-3 h-3 pixel-border-sm" :class="step === i ? 'bg-primary' : 'bg-surface-variant'"></div>
        </div>
      </div>
    </TangoCard>
  </div>
</template>
