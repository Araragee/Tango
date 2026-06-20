<script setup lang="ts">
/**
 * MonthlyReport — F7 couple's monthly recap.
 *
 * Pulls transactions, goals, todos, calendar events, and contributions from
 * their stores, runs them through `buildMonthlyReport(year, month, src)`, and
 * renders a printable summary. The "Save as PDF" button triggers
 * `window.print()` with a scoped print stylesheet that hides everything
 * outside the report card.
 */

import { ref, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import { useAppStore } from '../stores/useStore';
import { useContributionsStore } from '../stores/useContributionsStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { buildMonthlyReport } from '../utils/monthlyReport';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

const store = useAppStore();
const contributions = useContributionsStore();
const prefs = usePreferencesStore();

const now = new Date();
const selectedMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
);

const parsed = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number);
  return { year: y, month: m - 1 };
});

const report = computed(() =>
  buildMonthlyReport(parsed.value.year, parsed.value.month, {
    transactions: store.budget.recentActivity,
    goals: store.plans.goals,
    todos: store.todos.items,
    events: store.calendar.events,
    contributions: contributions.items,
  }),
);

const moodEmoji = computed(() => {
  const m = report.value.dateNights.averageMood;
  if (m == null) return null;
  if (m >= 4.5) return '😍';
  if (m >= 3.5) return '😊';
  if (m >= 2.5) return '🙂';
  if (m >= 1.5) return '😕';
  return '😞';
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: prefs.currency, minimumFractionDigits: 0 });
}

function printReport() {
  // Use the browser's print dialog — picks up the @media print rules below
  // and lets the user "Save as PDF" or print to a physical printer. No
  // runtime PDF library required.
  window.print();
}
</script>

<template>
  <BaseModal :show="show" title="Monthly Report" max-width="max-w-3xl" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <!-- Toolbar (hidden in print) -->
      <div class="flex items-center justify-between gap-3 print:hidden">
        <label class="flex items-center gap-2 text-label-sm uppercase font-bold">
          Month
          <input
            v-model="selectedMonth"
            type="month"
            class="sunken-input px-3 py-1.5 text-body-md pixel-border-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          />
        </label>
        <TangoButton size="sm" shadow="dark" @click="printReport">
          <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
          Save / Print
        </TangoButton>
      </div>

      <!-- Printable report ─────────────────────────────────────────────── -->
      <article id="monthly-report-printable" class="flex flex-col gap-6 bg-surface p-6 pixel-border">
        <header class="flex items-baseline justify-between border-b border-on-surface pb-3">
          <div>
            <p class="text-label-sm uppercase text-on-surface-variant font-bold">Tango Monthly Report</p>
            <h2 class="text-headline-lg">{{ report.monthLabel }}</h2>
          </div>
          <div class="text-right">
            <p class="text-label-sm uppercase text-on-surface-variant font-bold">{{ store.userName }} + {{ store.partnerName }}</p>
          </div>
        </header>

        <!-- Totals -->
        <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-surface-variant pixel-border-sm p-3">
            <p class="text-label-sm uppercase text-on-surface-variant">Income</p>
            <p class="text-headline-md text-secondary">{{ fmt(report.totals.income) }}</p>
          </div>
          <div class="bg-surface-variant pixel-border-sm p-3">
            <p class="text-label-sm uppercase text-on-surface-variant">Expenses</p>
            <p class="text-headline-md text-error">{{ fmt(report.totals.expenses) }}</p>
          </div>
          <div class="bg-surface-variant pixel-border-sm p-3">
            <p class="text-label-sm uppercase text-on-surface-variant">Net</p>
            <p class="text-headline-md" :class="report.totals.net >= 0 ? 'text-secondary' : 'text-error'">
              {{ fmt(report.totals.net) }}
            </p>
          </div>
          <div class="bg-surface-variant pixel-border-sm p-3">
            <p class="text-label-sm uppercase text-on-surface-variant">Transactions</p>
            <p class="text-headline-md">{{ report.totals.txCount }}</p>
          </div>
        </section>

        <!-- Top categories -->
        <section v-if="report.topCategories.length > 0">
          <h3 class="text-headline-md mb-3 border-b border-on-surface pb-1">Top Categories</h3>
          <ul class="flex flex-col gap-2">
            <li v-for="c in report.topCategories" :key="c.category" class="flex items-center gap-3">
              <span class="text-body-md font-bold uppercase flex-1 truncate">{{ c.category }}</span>
              <span class="text-label-sm text-on-surface-variant uppercase">{{ c.txCount }} tx</span>
              <span class="text-body-md font-bold w-20 text-right">{{ fmt(c.spent) }}</span>
              <span class="text-label-sm text-on-surface-variant w-12 text-right">{{ Math.round(c.share * 100) }}%</span>
            </li>
          </ul>
        </section>
        <section v-else class="text-body-md text-on-surface-variant italic">No expenses recorded this month.</section>

        <!-- Biggest spends -->
        <section v-if="report.biggestSpends.length > 0">
          <h3 class="text-headline-md mb-3 border-b border-on-surface pb-1">Biggest Single Spends</h3>
          <ul class="flex flex-col gap-1">
            <li v-for="s in report.biggestSpends" :key="s.id" class="flex items-center gap-3 text-body-md">
              <span class="text-label-sm text-on-surface-variant uppercase w-24">{{ s.date }}</span>
              <span class="flex-1 truncate">{{ s.title }}</span>
              <span class="text-label-sm text-on-surface-variant uppercase">{{ s.category }}</span>
              <span class="font-bold text-error w-20 text-right">{{ fmt(s.amount) }}</span>
            </li>
          </ul>
        </section>

        <!-- Goal progress -->
        <section v-if="report.goalProgress.length > 0">
          <h3 class="text-headline-md mb-3 border-b border-on-surface pb-1">Goal Progress</h3>
          <ul class="flex flex-col gap-3">
            <li v-for="g in report.goalProgress" :key="g.id">
              <div class="flex items-center justify-between text-body-md mb-1">
                <span class="font-bold flex items-center gap-2">
                  {{ g.title }}
                  <span v-if="g.completedThisMonth" class="text-label-sm text-secondary uppercase">✓ Completed</span>
                </span>
                <span class="text-label-sm text-on-surface-variant uppercase">
                  +{{ fmt(g.contributedThisMonth) }} this month
                </span>
              </div>
              <div class="w-full h-3 bg-surface-variant pixel-border-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 h-full bg-primary" :style="{ width: `${Math.min(100, g.progress)}%` }"></div>
              </div>
              <p class="text-label-sm text-on-surface-variant mt-1">
                {{ fmt(g.saved) }} of {{ fmt(g.target) }} ({{ g.progress }}%)
              </p>
            </li>
          </ul>
        </section>

        <!-- Highlights -->
        <section>
          <h3 class="text-headline-md mb-3 border-b border-on-surface pb-1">Highlights</h3>
          <div class="grid grid-cols-2 gap-3 text-body-md">
            <div class="bg-surface-variant pixel-border-sm p-3">
              <p class="text-label-sm uppercase text-on-surface-variant">Tasks completed</p>
              <p class="text-headline-md">{{ report.todoCounts.completed }}</p>
              <p class="text-label-sm text-on-surface-variant">{{ report.todoCounts.created }} created this month</p>
            </div>
            <div class="bg-surface-variant pixel-border-sm p-3">
              <p class="text-label-sm uppercase text-on-surface-variant">Date nights</p>
              <p class="text-headline-md">{{ report.dateNights.count }}</p>
              <p v-if="moodEmoji" class="text-body-md">
                Avg vibe: {{ moodEmoji }} ({{ report.dateNights.averageMood?.toFixed(1) }} / 5)
              </p>
              <p v-else class="text-label-sm text-on-surface-variant">No mood ratings yet</p>
            </div>
          </div>
        </section>

        <footer class="text-label-sm text-on-surface-variant uppercase text-center pt-3 border-t border-on-surface">
          Generated by Tango · {{ new Date().toLocaleDateString() }}
        </footer>
      </article>
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Close</TangoButton>
      <TangoButton @click="printReport" shadow="dark" size="sm">Save / Print</TangoButton>
    </template>
  </BaseModal>
</template>

<style>
/*
 * Print rules are scoped to the global stylesheet (no `scoped` attribute) so
 * the @page directive applies. When printing we hide every element on the
 * page except #monthly-report-printable and its descendants, giving a clean
 * single-page recap regardless of which view triggered the print.
 */
@media print {
  body * {
    visibility: hidden !important;
  }
  #monthly-report-printable,
  #monthly-report-printable * {
    visibility: visible !important;
  }
  #monthly-report-printable {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 16mm;
    box-shadow: none !important;
    border: none !important;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
</style>
