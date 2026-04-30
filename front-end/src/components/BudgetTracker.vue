<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore, type Transaction } from '../stores/useStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TransactionDetailsModal from './TransactionDetailsModal.vue';
import AddTransactionModal from './AddTransactionModal.vue';

const store = useAppStore();
const prefs = usePreferencesStore();

const showDetails = ref(false);
const showAddModal = ref(false);
const selectedTransaction = ref<Transaction | null>(null);
const editingLimit = ref<string | null>(null);
const editingLimitValue = ref(0);

const filter = ref<'all' | 'expense' | 'income'>('all');
const filteredActivity = computed(() =>
  filter.value === 'all'
    ? store.budget.recentActivity
    : store.budget.recentActivity.filter((tx: Transaction) => tx.type === filter.value)
);

const lastUpdatedLabel = computed(() => {
  const d = store.budget.lastUpdated;
  if (!d) return 'No data yet';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 10) return 'Updated just now';
  if (diff < 60) return `Updated ${diff}s ago`;
  if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
  return `Updated ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
});

const openDetails = (tx: Transaction) => {
  selectedTransaction.value = tx;
  showDetails.value = true;
};

const startEditLimit = (cat: string) => {
  editingLimit.value = cat;
  editingLimitValue.value = prefs.getBudgetLimit(cat);
};

const saveLimit = () => {
  if (!editingLimit.value) return;
  prefs.setBudgetLimit(editingLimit.value, editingLimitValue.value);
  editingLimit.value = null;
};

const getLimit = (cat: string) => prefs.getBudgetLimit(cat);
const getBarPct = (spent: number, cat: string) => Math.min(100, (spent / getLimit(cat)) * 100);
const isOverBudget = (spent: number, cat: string) => spent > getLimit(cat);
</script>

<template>
  <div class="flex flex-col gap-8 w-full">
    <main class="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-7 flex flex-col gap-8 w-full">
        <!-- Balance Card -->
        <TangoCard padding="none" shadow="default" class="h-48 flex flex-col justify-center items-center relative w-full">
          <div class="absolute top-4 left-4 px-3 py-1 bg-primary text-on-primary text-label-sm uppercase pixel-border-sm select-none">
            Joint Balance
          </div>
          <h2 class="text-headline-xl text-on-surface mt-4">
            ${{ store.budget.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
          </h2>
          <p class="text-body-md text-on-surface-variant mt-2">{{ lastUpdatedLabel }}</p>
          <div class="absolute bottom-0 left-0 w-full h-2 bg-dither pixel-border-sm border-b-0 border-x-0 border-t-2 border-black dark:border-white"></div>
        </TangoCard>

        <!-- Saved This Month -->
        <div class="flex justify-between items-center px-4 py-2 bg-secondary-container pixel-border-sm">
          <span class="text-label-sm uppercase text-on-secondary-container">Saved This Month</span>
          <span class="text-body-lg font-bold text-on-secondary-container">+${{ store.budget.savedThisMonth.toLocaleString() }}</span>
        </div>

        <!-- Category Breakdown -->
        <TangoCard padding="lg" shadow="dark" class="w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Category Breakdown</h3>
            <span class="text-label-sm text-on-surface-variant uppercase">Click limit to edit</span>
          </div>
          <div class="space-y-6">
            <div v-for="cat in store.budget.monthlySpending" :key="cat.id">
              <div class="flex justify-between text-label-sm mb-2 uppercase items-center">
                <span :class="isOverBudget(cat.spent, cat.category) ? 'text-error font-bold' : ''">
                  {{ cat.category }}
                  <span v-if="isOverBudget(cat.spent, cat.category)" class="material-symbols-outlined text-[12px] align-middle">warning</span>
                </span>
                <span class="flex items-center gap-2">
                  ${{ cat.spent.toFixed(0) }} /
                  <!-- Inline limit editor -->
                  <span v-if="editingLimit !== cat.category"
                    @click="startEditLimit(cat.category)"
                    class="cursor-pointer underline decoration-dotted hover:text-primary transition-colors"
                    title="Click to edit limit"
                  >${{ getLimit(cat.category) }}</span>
                  <span v-else class="flex items-center gap-1">
                    <input
                      v-model.number="editingLimitValue"
                      type="number"
                      class="w-20 px-1 py-0.5 bg-surface-variant border border-on-surface text-label-sm"
                      @keyup.enter="saveLimit"
                      @keyup.escape="editingLimit = null"
                    />
                    <button @click="saveLimit" class="material-symbols-outlined text-[14px] text-secondary hover:text-primary">check</button>
                    <button @click="editingLimit = null" class="material-symbols-outlined text-[14px] text-outline hover:text-error">close</button>
                  </span>
                </span>
              </div>
              <div class="w-full h-6 pixel-border bg-surface relative overflow-hidden">
                <div
                  class="absolute top-0 left-0 h-full flex justify-end transition-all duration-500"
                  :class="isOverBudget(cat.spent, cat.category) ? 'bg-error' : 'bg-primary'"
                  :style="{ width: `${getBarPct(cat.spent, cat.category)}%` }"
                >
                  <div class="w-4 h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC41Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-50"></div>
                </div>
              </div>
            </div>
            <p v-if="store.budget.monthlySpending.length === 0" class="text-body-md text-on-surface-variant">No expenses this month.</p>
          </div>
        </TangoCard>
      </div>

      <!-- Right Column -->
      <div class="md:col-span-5 flex flex-col gap-8 w-full">
        <TangoCard padding="lg" shadow="default" class="flex-grow flex flex-col w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Recent</h3>
            <TangoButton @click="showAddModal = true" shadow="dark" size="sm" aria-label="Add Transaction">
              <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">add</span>
              ADD
            </TangoButton>
          </div>

          <!-- Filters -->
          <div class="flex gap-2 mb-4">
            <button v-for="f in ['all', 'expense', 'income']" :key="f"
              @click="filter = f as any"
              class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
              :class="filter === f ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'">
              {{ f }}
            </button>
          </div>

          <div class="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <p v-if="filteredActivity.length === 0" class="text-body-md text-on-surface-variant text-center py-8">
              No transactions yet. Add one to get started.
            </p>
            <div
              v-for="tx in filteredActivity"
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
              <div class="text-body-lg font-bold" :class="tx.amount < 0 ? 'text-error' : 'text-secondary'">
                {{ tx.amount < 0 ? '-' : '+' }}${{ Math.abs(tx.amount).toFixed(2) }}
              </div>
            </div>
          </div>
        </TangoCard>
      </div>
    </main>

    <TransactionDetailsModal :show="showDetails" :transaction="selectedTransaction" @close="showDetails = false" />
    <AddTransactionModal :show="showAddModal" @close="showAddModal = false" />
  </div>
</template>
