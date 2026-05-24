<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore, type Transaction } from '../stores/useStore';
import TangoCard from './TangoCard.vue';

const store = useAppStore();
const activeTab = ref<'overview' | 'trends' | 'categories'>('overview');

// ── Last 6 months data ──────────────────────────────────────────────────────
const monthlyTrend = computed(() => {
  const months: Record<string, { key: string; label: string; income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    months[key] = { key, label, income: 0, expense: 0 };
  }
  for (const tx of store.budget.recentActivity as Transaction[]) {
    const key = tx.date.slice(0, 7);
    if (!months[key]) continue;
    if (tx.amount > 0) months[key].income += tx.amount;
    else months[key].expense += Math.abs(tx.amount);
  }
  return Object.values(months);
});

// ── SVG bar chart helpers ───────────────────────────────────────────────────
// CHART_H drives the inline :style height calculations.
const CHART_H = 100;   // matches h-[100px] container class
const maxMonthly = computed(() =>
  Math.max(...monthlyTrend.value.flatMap(m => [m.income, m.expense]), 1)
);
// barH returns a percentage (0–100) that is translated to px by the wrapper.
// We keep returning px so existing callers don't change; the container heights
// are now responsive via Tailwind breakpoint classes.
const barH = (v: number, chartH = CHART_H) => Math.max(2, (v / maxMonthly.value) * chartH);

// ── Category donut helpers ──────────────────────────────────────────────────
const RADIUS = 52;
const CX = 70;
const CY = 70;
const STROKE = 24;
const CIRC = 2 * Math.PI * RADIUS;

// Mid-range palette — visible on both light and dark backgrounds
const PALETTE = [
  '#5b8db8', '#9b6ec8', '#4eb87a', '#c85b6e', '#c8a04e',
  '#5b7ec8', '#7a9b5b', '#c8835b', '#5bb8c8', '#b85bc8',
];

const categoryData = computed(() => {
  const cats = store.budget.monthlySpending;
  const total = cats.reduce((s, c) => s + c.spent, 0);
  if (!total) return [];
  return cats.map((c, i) => ({
    ...c,
    pct: (c.spent / total) * 100,
    color: PALETTE[i % PALETTE.length],
  }));
});

const donutSegments = computed(() => {
  let cumPct = 0;
  // Start from top (−90°)
  return categoryData.value.map((cat) => {
    const dash = (cat.pct / 100) * CIRC;
    const gap = CIRC - dash;
    // rotate so segment starts at cumPct position
    const rotate = (cumPct / 100) * 360 - 90;
    cumPct += cat.pct;
    return { ...cat, dash, gap, rotate };
  });
});

// ── Key metrics ─────────────────────────────────────────────────────────────
const currentMonth = computed(() => monthlyTrend.value[monthlyTrend.value.length - 1]);

const avgDailySpend = computed(() => {
  const day = new Date().getDate();
  return day > 0 ? currentMonth.value.expense / day : 0;
});

const topCategory = computed(() => {
  const cats = store.budget.monthlySpending;
  if (!cats.length) return null;
  return cats.reduce((a, b) => (a.spent > b.spent ? a : b));
});

const savingsRate = computed(() => {
  const { income, expense } = currentMonth.value;
  if (!income) return 0;
  return Math.max(0, Math.round(((income - expense) / income) * 100));
});
</script>

<template>
  <TangoCard padding="lg" shadow="dark" class="w-full">
    <!-- Header + tabs -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b-2 border-on-background pb-3 gap-3">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings:'FILL' 1;">bar_chart</span>
        <h3 class="text-headline-lg text-on-surface">Analytics</h3>
      </div>
      <div class="flex gap-1">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Overview' },
            { id: 'trends',   label: 'Trends' },
            { id: 'categories', label: 'Spending' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id as any"
          class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="activeTab === tab.id
            ? 'bg-primary text-on-primary'
            : 'bg-surface hover:bg-surface-variant text-on-surface'"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ── Overview ──────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- Metric chips -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="flex flex-col gap-1 p-3 pixel-border-sm bg-primary-container">
          <span class="text-label-sm uppercase text-on-primary-container opacity-70">Income</span>
          <span class="text-headline-md font-black text-on-primary-container">
            ${{ currentMonth.income.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 p-3 pixel-border-sm bg-error-container">
          <span class="text-label-sm uppercase text-on-error-container opacity-70">Expenses</span>
          <span class="text-headline-md font-black text-on-error-container">
            ${{ currentMonth.expense.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 p-3 pixel-border-sm bg-secondary-container">
          <span class="text-label-sm uppercase text-on-secondary-container opacity-70">Avg/Day</span>
          <span class="text-headline-md font-black text-on-secondary-container">
            ${{ avgDailySpend.toFixed(0) }}
          </span>
        </div>
        <div class="flex flex-col gap-1 p-3 pixel-border-sm bg-surface-container-highest">
          <span class="text-label-sm uppercase text-on-surface-variant opacity-70">Savings %</span>
          <span class="text-headline-md font-black text-on-surface">
            {{ savingsRate }}%
          </span>
        </div>
      </div>

      <!-- Mini bar chart (last 6 months) -->
      <div>
        <p class="text-label-sm uppercase text-on-surface-variant mb-3">6-Month Overview</p>
        <!-- Responsive height: 80px on mobile, 100px on sm+ -->
        <div class="flex items-end gap-3 h-24 sm:h-28">
          <div
            v-for="m in monthlyTrend"
            :key="m.key"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <div class="w-full flex items-end justify-center gap-0.5 h-[80px] sm:h-[100px]">
              <!-- Income bar -->
              <div
                class="flex-1 bg-primary pixel-border-sm"
                :style="{ height: barH(m.income) + 'px' }"
                :title="`Income: $${m.income.toFixed(0)}`"
              ></div>
              <!-- Expense bar -->
              <div
                class="flex-1 bg-error pixel-border-sm"
                :style="{ height: barH(m.expense) + 'px' }"
                :title="`Expense: $${m.expense.toFixed(0)}`"
              ></div>
            </div>
            <span class="text-[10px] uppercase text-on-surface-variant">{{ m.label }}</span>
          </div>
        </div>
        <div class="flex gap-4 mt-2">
          <span class="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span class="inline-block w-3 h-3 bg-primary pixel-border-sm"></span> Income
          </span>
          <span class="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span class="inline-block w-3 h-3 bg-error pixel-border-sm"></span> Expense
          </span>
        </div>
      </div>

      <!-- Top category -->
      <div v-if="topCategory" class="flex items-center justify-between p-3 pixel-border-sm bg-surface-variant">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-on-surface-variant">{{ topCategory.icon }}</span>
          <div>
            <p class="text-label-sm uppercase text-on-surface-variant">Top Spend</p>
            <p class="text-body-md font-bold text-on-surface">{{ topCategory.category }}</p>
          </div>
        </div>
        <span class="text-headline-md font-black text-error">
          ${{ topCategory.spent.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
        </span>
      </div>
    </div>

    <!-- ── Trends ─────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'trends'" class="space-y-4">
      <p class="text-label-sm uppercase text-on-surface-variant">Income vs Expenses — Last 6 Months</p>

      <div v-if="maxMonthly <= 1" class="text-body-md text-on-surface-variant py-8 text-center">
        No transaction data yet.
      </div>
      <div v-else>
        <!-- Y-axis labels + bars — responsive heights: 96px mobile / 128px sm+ -->
        <div class="flex gap-2 sm:gap-4 items-end">
          <!-- Y labels -->
          <div class="flex flex-col justify-between text-right pr-1 sm:pr-2 shrink-0 h-24 sm:h-[128px]">
            <span class="text-[10px] text-on-surface-variant">${{ Math.round(maxMonthly).toLocaleString() }}</span>
            <span class="text-[10px] text-on-surface-variant">${{ Math.round(maxMonthly / 2).toLocaleString() }}</span>
            <span class="text-[10px] text-on-surface-variant">$0</span>
          </div>

          <!-- Bars + grid -->
          <div class="relative flex-1 flex items-end gap-1 sm:gap-2 h-24 sm:h-[128px]">
            <!-- Grid lines -->
            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div class="border-t border-on-surface/10 w-full"></div>
              <div class="border-t border-on-surface/10 w-full"></div>
              <div class="border-t border-on-surface/20 w-full"></div>
            </div>

            <div
              v-for="m in monthlyTrend"
              :key="m.key"
              class="flex-1 flex flex-col items-center gap-1 z-10"
            >
              <!-- Inner bar container matches outer minus label row (~16px) -->
              <div class="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-[80px] sm:h-[112px]">
                <div
                  class="flex-1 bg-primary pixel-border-sm transition-all duration-500"
                  :style="{ height: barH(m.income, 80) + 'px' }"
                  :title="`${m.label} Income: $${m.income.toFixed(2)}`"
                ></div>
                <div
                  class="flex-1 bg-error pixel-border-sm transition-all duration-500"
                  :style="{ height: barH(m.expense, 80) + 'px' }"
                  :title="`${m.label} Expense: $${m.expense.toFixed(2)}`"
                ></div>
              </div>
              <span class="text-[10px] uppercase text-on-surface-variant">{{ m.label }}</span>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex gap-6 mt-4 pt-3 border-t border-on-surface/20">
          <span class="flex items-center gap-2 text-label-sm">
            <span class="w-4 h-4 bg-primary pixel-border-sm inline-block"></span>
            <span class="text-on-surface-variant">Income</span>
          </span>
          <span class="flex items-center gap-2 text-label-sm">
            <span class="w-4 h-4 bg-error pixel-border-sm inline-block"></span>
            <span class="text-on-surface-variant">Expenses</span>
          </span>
        </div>

        <!-- Month-by-month table -->
        <div class="mt-4 space-y-1">
          <div
            v-for="m in [...monthlyTrend].reverse()"
            :key="m.key + '-row'"
            class="grid grid-cols-3 text-label-sm py-1.5 px-2 pixel-border-sm bg-surface"
          >
            <span class="uppercase font-bold text-on-surface">{{ m.label }}</span>
            <span class="text-primary font-bold text-right">+${{ m.income.toFixed(0) }}</span>
            <span class="text-error font-bold text-right">-${{ m.expense.toFixed(0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Categories ─────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'categories'" class="space-y-6">
      <div v-if="categoryData.length === 0" class="text-body-md text-on-surface-variant py-8 text-center">
        No spending data this month.
      </div>

      <div v-else class="flex flex-col sm:flex-row gap-6 items-center">
        <!-- Donut SVG -->
        <div class="shrink-0">
          <svg :width="CX * 2" :height="CY * 2" class="overflow-visible">
            <!-- Track -->
            <circle
              :cx="CX" :cy="CY" :r="RADIUS"
              fill="none"
              stroke="currentColor"
              class="text-surface-variant"
              :stroke-width="STROKE"
            />
            <!-- Segments -->
            <circle
              v-for="seg in donutSegments"
              :key="seg.category"
              :cx="CX" :cy="CY" :r="RADIUS"
              fill="none"
              :stroke="seg.color"
              :stroke-width="STROKE"
              :stroke-dasharray="`${seg.dash} ${seg.gap}`"
              :transform="`rotate(${seg.rotate} ${CX} ${CY})`"
              stroke-linecap="butt"
            />
            <!-- Center total -->
            <text :x="CX" :y="CY - 6" text-anchor="middle" class="fill-on-surface font-black" font-size="13" font-weight="900">
              ${{ categoryData.reduce((s, c) => s + c.spent, 0).toFixed(0) }}
            </text>
            <text :x="CX" :y="CY + 10" text-anchor="middle" font-size="9" class="fill-on-surface-variant" letter-spacing="1">
              THIS MONTH
            </text>
          </svg>
        </div>

        <!-- Legend + bars -->
        <div class="flex-1 space-y-3 w-full">
          <div
            v-for="cat in categoryData"
            :key="cat.category"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-label-sm">
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-2.5 h-2.5 pixel-border-sm shrink-0"
                  :style="{ background: cat.color }"
                ></span>
                <span class="font-bold text-on-surface uppercase">{{ cat.category }}</span>
              </div>
              <span class="text-on-surface-variant">
                ${{ cat.spent.toFixed(0) }}
                <span class="opacity-60">({{ cat.pct.toFixed(0) }}%)</span>
              </span>
            </div>
            <div class="w-full h-2 pixel-border-sm bg-surface-variant overflow-hidden">
              <div
                class="h-full transition-all duration-700"
                :style="{ width: cat.pct + '%', background: cat.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TangoCard>
</template>
