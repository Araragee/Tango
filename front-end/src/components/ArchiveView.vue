<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import TangoCard from './TangoCard.vue';

const store = useAppStore();

const archivedTransactions = [
  { id: 101, title: 'Summer Vacation Rent', amount: -1200, date: 'Aug 2023', category: 'Travel' },
  { id: 102, title: 'New Car Downpayment', amount: -5000, date: 'Jul 2023', category: 'Finance' },
];

const completedGoals = [
  { id: 201, title: 'Wedding Fund', target: 15000, date: 'June 2023' },
  { id: 202, title: 'Emergency Fund', target: 5000, date: 'March 2023' },
];
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="border-b-2 border-black pb-4">
      <h2 class="text-headline-xl">Archive</h2>
      <p class="text-body-md text-on-surface-variant">Your journey so far.</p>
    </div>

    <section class="space-y-4">
      <h3 class="text-headline-lg">Completed Goals</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TangoCard v-for="goal in completedGoals" :key="goal.id" padding="md">
          <div class="flex justify-between items-center">
            <div>
              <h4 class="text-headline-md">{{ goal.title }}</h4>
              <p class="text-label-sm text-outline uppercase">Reached: {{ goal.date }}</p>
            </div>
            <span class="material-symbols-outlined text-secondary text-4xl">verified</span>
          </div>
          <div class="mt-4 text-body-lg font-bold text-secondary">
            ${{ goal.target.toLocaleString() }}
          </div>
        </TangoCard>
      </div>
    </section>

    <section class="space-y-4">
      <h3 class="text-headline-lg">Past Transactions</h3>
      <div class="space-y-2">
        <div v-for="tx in archivedTransactions" :key="tx.id" class="bg-surface pixel-border-sm p-4 flex justify-between items-center">
          <div>
            <div class="text-body-md font-bold">{{ tx.title }}</div>
            <div class="text-label-sm text-outline uppercase">{{ tx.date }} • {{ tx.category }}</div>
          </div>
          <div class="text-body-lg font-bold text-error">
            -${{ Math.abs(tx.amount).toLocaleString() }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
