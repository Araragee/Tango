<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useAppStore, type Transaction } from '../stores/useStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useAuthStore } from '../stores/useAuthStore';
import { localDateISO } from '../utils/dateUtils';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TransactionDetailsModal from './TransactionDetailsModal.vue';
import AddTransactionModal from './AddTransactionModal.vue';
import CsvImportModal from './CsvImportModal.vue';
import CategoryIcon from './CategoryIcon.vue';
import MonthlyReport from './MonthlyReport.vue';
import TangoSprites from './TangoSprites.vue';
import RecurringList from './RecurringList.vue';
import VibeCheckCard from './VibeCheckCard.vue';
import BudgetAnalytics from './BudgetAnalytics.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import EmptyState from './EmptyState.vue';

const store = useAppStore();
const prefs = usePreferencesStore();
const auth = useAuthStore();
const household = useHouseholdStore();

const showDetails = ref(false);
const showAddModal = ref(false);
const showCsvImport = ref(false);
const showMonthlyReport = ref(false);
const selectedTransaction = ref<Transaction | null>(null);
const editingLimit = ref<string | null>(null);
const editingLimitValue = ref(0);

const filter = ref<'all' | 'expense' | 'income'>('all');
const filteredActivity = computed(() =>
  filter.value === 'all'
    ? store.budget.recentActivity
    : store.budget.recentActivity.filter((tx: Transaction) => tx.type === filter.value)
);

// I23: month-to-date income and expense totals for the balance card summary row.
// Derived from recentActivity (same source as recalculateBudget) so it's always
// in sync with the balance figure without an extra fetch.
const monthSummary = computed(() => {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let income = 0;
  let expense = 0;
  for (const tx of store.budget.recentActivity) {
    if (!tx.date.startsWith(thisMonth)) continue;
    if (tx.type === 'income') income += tx.amount;
    else expense += Math.abs(tx.amount);
  }
  return { income, expense };
});

// Reactive tick so the "Updated Xm ago" label refreshes even when no other
// dep changes — without a timer it could stay stale indefinitely. (I12)
const _tick = ref(0);
let _tickInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => { _tickInterval = setInterval(() => { _tick.value++ }, 30_000); });
onUnmounted(() => { if (_tickInterval) clearInterval(_tickInterval); });

const lastUpdatedLabel = computed(() => {
  void _tick.value; // subscribe to the 30s tick
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

// Using a Map so we get the correct input element for whichever category is being edited,
// even though the ref sits inside a v-for loop.
const limitInputRefs = ref<Map<string, HTMLInputElement>>(new Map());
const setLimitInputRef = (el: Element | null, cat: string) => {
  if (el) limitInputRefs.value.set(cat, el as HTMLInputElement);
  else limitInputRefs.value.delete(cat);
};

const startEditLimit = async (cat: string) => {
  editingLimit.value = cat;
  editingLimitValue.value = prefs.getBudgetLimit(cat);
  await nextTick();
  limitInputRefs.value.get(cat)?.select();
};

const saveLimit = () => {
  if (!editingLimit.value) return;
  prefs.setBudgetLimit(editingLimit.value, editingLimitValue.value);
  editingLimit.value = null;
};

const getLimit = (cat: string) => prefs.getBudgetLimit(cat);
// Guard against a stored limit of 0 — dividing by zero yields Infinity which
// Math.min caps to 100, making every category look maxed-out. Use Math.max(1,…)
// so the bar stays meaningful even if the user explicitly sets a limit of $0. (B69)
const getBarPct = (spent: number, cat: string) => Math.min(100, (spent / Math.max(1, getLimit(cat))) * 100);
const isOverBudget = (spent: number, cat: string) => spent > getLimit(cat);

// ── Settle-up ────────────────────────────────────────────────────────────────
// Only meaningful when a partner exists and at least one tx has paid_by set.
const settleUp = computed(() => {
  const myId = auth.user?.id;
  const partnerId = household.partner?.user_id;
  if (!myId || !partnerId) return null;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let myPaid = 0;
  let partnerPaid = 0;
  let tracked = 0;

  for (const tx of store.budget.recentActivity) {
    if (tx.type !== 'expense') continue;
    if (!tx.date.startsWith(thisMonth)) continue;
    if (!tx.paid_by) continue;
    const abs = Math.abs(tx.amount);
    if (tx.paid_by === myId) { myPaid += abs; tracked++ }
    else if (tx.paid_by === partnerId) { partnerPaid += abs; tracked++ }
  }

  if (tracked === 0) return null;

  const total = myPaid + partnerPaid;
  const fairShare = total / 2;
  // Positive: partner owes me. Negative: I owe partner.
  const balance = myPaid - fairShare;

  return {
    myPaid,
    partnerPaid,
    balance: Math.abs(balance),
    owedBy: balance > 0.005 ? 'partner' : balance < -0.005 ? 'me' : 'settled',
  };
});

// ── CSV Export ───────────────────────────────────────────────────────────────
const exportCSV = () => {
  const rows = store.budget.recentActivity;
  const headers = ['Date', 'Title', 'Amount', 'Type', 'Category', 'Note'];
  const escape = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map(tx => [
      tx.date,
      escape(tx.title),
      tx.amount,
      tx.type,
      escape(tx.category),
      tx.note ? escape(tx.note) : '',
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Use localDateISO (local calendar date) not toISOString (UTC) — for UTC+
  // users at evening hours the UTC date is already tomorrow, producing a
  // filename one day ahead of the user's current date. (B119)
  a.download = `tango-transactions-${localDateISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="flex flex-col gap-8 w-full">
    <main class="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-7 flex flex-col gap-8 w-full">
        <!-- Balance Card with Sprites -->
        <TangoCard padding="none" shadow="default" class="flex flex-row items-stretch relative w-full overflow-hidden min-h-44">
          <!-- Sprite Widget Panel -->
          <div class="flex flex-col items-center justify-end gap-2 px-3 sm:px-4 pt-4 pb-3 bg-surface-variant border-r-2 border-black dark:border-white shrink-0 min-w-[100px] sm:min-w-[140px]">
            <TangoSprites :size="64" />
          </div>

          <!-- Balance info -->
          <div class="flex flex-col justify-center items-start px-6 py-4 flex-1 relative">
            <div class="px-3 py-1 bg-primary text-on-primary text-label-sm uppercase pixel-border-sm select-none mb-2">
              Joint Balance
            </div>
            <h2 class="text-headline-xl text-on-surface">
              ${{ store.budget.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </h2>
            <p class="text-body-md text-on-surface-variant mt-1">{{ lastUpdatedLabel }}</p>
          </div>
        </TangoCard>

        <!-- I23: month-to-date income / expense split so the user sees where money
             is coming from and going to, not just the running balance total. -->
        <div class="grid grid-cols-2 gap-px border-2 border-black dark:border-white bg-black dark:bg-white">
          <div class="flex flex-col items-center py-2 px-3 bg-secondary-container">
            <span class="text-label-sm uppercase text-on-secondary-container">Income this month</span>
            <span class="text-body-lg font-bold text-on-secondary-container">+${{ monthSummary.income.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex flex-col items-center py-2 px-3 bg-error-container">
            <span class="text-label-sm uppercase text-on-error-container">Spent this month</span>
            <span class="text-body-lg font-bold text-on-error-container">-${{ monthSummary.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <VibeCheckCard />

        <!-- Settle Up — only when paired and at least one tracked tx exists -->
        <TangoCard v-if="settleUp" padding="lg" shadow="default" class="w-full">
          <div class="flex justify-between items-center mb-4 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Settle Up</h3>
            <span class="text-label-sm text-on-surface-variant uppercase">This month</span>
          </div>
          <div class="flex gap-4 mb-4">
            <div class="flex-1 text-center p-3 pixel-border-sm bg-surface-variant">
              <p class="text-label-sm uppercase text-on-surface-variant mb-1">You paid</p>
              <p class="text-headline-md font-black">${{ settleUp.myPaid.toFixed(2) }}</p>
            </div>
            <div class="flex-1 text-center p-3 pixel-border-sm bg-surface-variant">
              <p class="text-label-sm uppercase text-on-surface-variant mb-1">{{ store.partnerName }} paid</p>
              <p class="text-headline-md font-black">${{ settleUp.partnerPaid.toFixed(2) }}</p>
            </div>
          </div>
          <div class="px-4 py-3 pixel-border-sm text-center"
               :class="settleUp.owedBy === 'settled' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-on-primary-container'">
            <p class="text-label-sm uppercase font-bold">
              <span v-if="settleUp.owedBy === 'settled'">All settled!</span>
              <span v-else-if="settleUp.owedBy === 'partner'">{{ store.partnerName }} owes you ${{ settleUp.balance.toFixed(2) }}</span>
              <span v-else>You owe {{ store.partnerName }} ${{ settleUp.balance.toFixed(2) }}</span>
            </p>
          </div>
        </TangoCard>

        <!-- Category Breakdown -->
        <TangoCard padding="lg" shadow="dark" class="w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Category Breakdown</h3>
            <span class="text-label-sm text-on-surface-variant uppercase">Click limit to edit</span>
          </div>
          <div class="space-y-6">
            <!-- Loading skeleton -->
            <div v-if="store.loading" class="space-y-6">
              <div v-for="n in 3" :key="n" class="space-y-2">
                <div class="flex justify-between">
                  <SkeletonBlock width="30%" height="0.75rem" />
                  <SkeletonBlock width="20%" height="0.75rem" />
                </div>
                <SkeletonBlock height="1.5rem" />
              </div>
            </div>
            <div v-else-if="store.budget.monthlySpending.length === 0">
              <EmptyState icon="pie_chart" title="No spending yet" description="Expenses this month will appear here." />
            </div>
            <div v-else v-for="cat in store.budget.monthlySpending" :key="cat.id">
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
                      :ref="(el) => setLimitInputRef(el as Element | null, cat.category)"
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
          </div>
        </TangoCard>

        <BudgetAnalytics />

        <RecurringList />
      </div>

      <!-- Right Column -->
      <div class="md:col-span-5 flex flex-col gap-8 w-full">
        <TangoCard padding="lg" shadow="default" class="flex-grow flex flex-col w-full">
          <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-2">
            <h3 class="text-headline-lg text-on-surface">Recent</h3>
            <div class="flex gap-2 flex-wrap">
              <TangoButton @click="showMonthlyReport = true" variant="surface" size="sm" aria-label="Monthly report">
                <span class="material-symbols-outlined text-[16px]">summarize</span>
                Report
              </TangoButton>
              <TangoButton @click="exportCSV" variant="surface" size="sm" aria-label="Export CSV">
                <span class="material-symbols-outlined text-[16px]">download</span>
                Export
              </TangoButton>
              <TangoButton @click="showCsvImport = true" variant="surface" size="sm" aria-label="Import CSV">
                <span class="material-symbols-outlined text-[16px]">upload_file</span>
                Import
              </TangoButton>
              <TangoButton @click="showAddModal = true" shadow="dark" size="sm" aria-label="Add Transaction">
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">add</span>
                ADD
              </TangoButton>
            </div>
          </div>

          <!-- Filters -->
          <div class="flex gap-2 flex-wrap mb-4">
            <button v-for="f in ['all', 'expense', 'income']" :key="f"
              @click="filter = f as any"
              class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
              :class="filter === f ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'">
              {{ f }}
            </button>
          </div>

          <div class="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <!-- Loading skeleton -->
            <div v-if="store.loading" class="space-y-4">
              <div v-for="n in 4" :key="n" class="flex items-center gap-4 p-3 pixel-border-sm bg-surface">
                <SkeletonBlock width="2.5rem" height="2.5rem" />
                <div class="flex-1 space-y-2">
                  <SkeletonBlock height="0.875rem" width="60%" />
                  <SkeletonBlock height="0.75rem" width="35%" />
                </div>
                <SkeletonBlock width="4rem" height="1rem" />
              </div>
            </div>
            <!-- Empty state -->
            <EmptyState
              v-else-if="filteredActivity.length === 0"
              icon="receipt_long"
              title="No transactions yet"
              description="Add your first transaction to start tracking."
            />
            <div
              v-else
              v-for="tx in filteredActivity"
              :key="tx.id"
              @click="openDetails(tx)"
              class="flex items-center justify-between p-3 hover:bg-surface-variant pixel-border-sm transition-colors cursor-pointer bg-surface"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 flex items-center justify-center pixel-border-sm bg-surface-variant">
                  <CategoryIcon
                    :category="tx.category"
                    :fallback-icon="tx.icon"
                    :tx-type="tx.type"
                    size="text-[22px]"
                    class="text-on-surface"
                  />
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
    <CsvImportModal :show="showCsvImport" @close="showCsvImport = false" />
    <MonthlyReport :show="showMonthlyReport" @close="showMonthlyReport = false" />
  </div>
</template>
