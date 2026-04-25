<script setup lang="ts">
import { ref, inject } from 'vue';
import { useAppStore, type Transaction } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TransactionDetailsModal from './TransactionDetailsModal.vue';
import AddTransactionModal from './AddTransactionModal.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: string) => void;

const showDetails = ref(false);
const showAddModal = ref(false);
const selectedTransaction = ref<Transaction | null>(null);

const openDetails = (tx: Transaction) => {
  selectedTransaction.value = tx;
  showDetails.value = true;
};
</script>

<template>
  <div class="flex flex-col gap-8 w-full">
    <!-- Main Content Grid -->
    <main class="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
      <!-- Left Column: Balance & Charts -->
      <div class="md:col-span-7 flex flex-col gap-8 w-full">
        <!-- Joint Balance Card -->
        <TangoCard padding="none" shadow="default" class="h-48 flex flex-col justify-center items-center relative w-full">
          <div class="absolute top-4 left-4 px-3 py-1 bg-primary text-on-primary text-label-sm uppercase pixel-border-sm">
            Joint Balance
          </div>
          <h2 class="text-headline-xl text-on-surface mt-4">
            ${{ store.budget.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
          </h2>
          <p class="text-body-md text-on-surface-variant mt-2">
            Updated just now
          </p>
          <div class="absolute bottom-0 left-0 w-full h-2 bg-dither pixel-border-sm border-b-0 border-x-0 border-t-2 border-black"></div>
        </TangoCard>

        <!-- Category Breakdown -->
        <TangoCard padding="lg" shadow="dark" class="w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Category Breakdown</h3>
            <span class="material-symbols-outlined text-secondary">bar_chart</span>
          </div>
          <div class="space-y-6">
            <div v-for="cat in store.budget.monthlySpending" :key="cat.id">
              <div class="flex justify-between text-label-sm mb-2 uppercase">
                <span>{{ cat.category }}</span>
                <span>${{ cat.spent }} / ${{ cat.limit }}</span>
              </div>
              <div class="w-full h-6 pixel-border bg-surface relative overflow-hidden">
                <div
                    class="absolute top-0 left-0 h-full bg-primary flex justify-end transition-all duration-500"
                    :style="{ width: `${Math.min(100, (cat.spent / cat.limit) * 100)}%` }"
                >
                  <div class="w-4 h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC41Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-50"></div>
                </div>
              </div>
            </div>
          </div>
        </TangoCard>
      </div>

      <!-- Right Column: Recent Transactions & Add Action -->
      <div class="md:col-span-5 flex flex-col gap-8 w-full">
        <!-- Recent Transactions List -->
        <TangoCard padding="lg" shadow="default" class="flex-grow flex flex-col w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Recent</h3>
            <TangoButton @click="showAddModal = true" shadow="dark" size="sm" aria-label="Add Transaction">
              <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">add</span>
              ADD
            </TangoButton>
          </div>
          <div class="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <div 
              v-for="tx in store.budget.recentActivity"
              :key="tx.id"
              @click="openDetails(tx)"
              class="flex items-center justify-between p-3 hover:bg-surface-variant pixel-border-sm transition-colors cursor-pointer bg-surface"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 flex items-center justify-center pixel-border-sm bg-surface-variant">
                  <span class="material-symbols-outlined text-on-surface">{{ tx.icon }}</span>
                </div>
                <div>
                  <div class="text-body-md font-bold">{{ tx.title }}</div>
                  <div class="text-label-sm text-outline mt-1 uppercase">{{ tx.date }}</div>
                </div>
              </div>
              <div 
                class="text-body-lg font-bold"
                :class="tx.amount < 0 ? 'text-error' : 'text-secondary'"
              >
                {{ tx.amount < 0 ? '-' : '+' }}${{ Math.abs(tx.amount).toFixed(2) }}
              </div>
            </div>
          </div>
        </TangoCard>
      </div>
    </main>

    <TransactionDetailsModal
        :show="showDetails"
        :transaction="selectedTransaction"
        @close="showDetails = false"
    />

    <AddTransactionModal
        :show="showAddModal"
        @close="showAddModal = false"
    />
  </div>
</template>
