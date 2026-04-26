<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore, type Goal, type Transaction } from '../stores/useStore';
import TangoCard from './TangoCard.vue';

const store = useAppStore();

const completedGoals = computed(() => store.plans.goals.filter((g: Goal) => g.status === 'Completed'));
const archivedTransactions = computed(() => store.budget.recentActivity.filter((tx: Transaction) => tx.type === 'expense').slice(-10));
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="border-b-2 border-black pb-4">
      <h2 class="text-headline-xl">Archive</h2>
      <p class="text-body-md text-on-surface-variant">Your journey so far.</p>
    </div>

    <section class="space-y-4">
      <h3 class="text-headline-lg">Completed Goals</h3>
      <div v-if="completedGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TangoCard v-for="goal in completedGoals" :key="goal.id" padding="md">
          <div class="flex justify-between items-center">
            <div>
              <h4 class="text-headline-md">{{ goal.title }}</h4>
              <p class="text-label-sm text-outline uppercase">Reached: –</p>
            </div>
            <span class="material-symbols-outlined text-secondary text-4xl">verified</span>
          </div>
          <div class="mt-4 text-body-lg font-bold text-secondary">
            ${{ goal.target.toLocaleString() }}
          </div>
        </TangoCard>
      </div>
      <p v-else class="text-body-md text-on-surface-variant">No completed goals yet.</p>
    </section>

    <section class="space-y-4">
      <h3 class="text-headline-lg">Past Transactions</h3>
      <div v-if="archivedTransactions.length > 0" class="space-y-2">
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
      <p v-else class="text-body-md text-on-surface-variant">No past transactions yet.</p>
    </section>
  </div>
</template>
