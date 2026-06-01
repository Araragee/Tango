<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore, type Transaction } from '../stores/useStore';
import TangoCard from './TangoCard.vue';

const store = useAppStore();

function startOfWeek(d: Date): Date {
    const day = d.getDay();              // 0 = Sun
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    out.setDate(out.getDate() - day);
    return out;
}

function inRange(tx: Transaction, from: Date, to: Date): boolean {
    const d = new Date(tx.date + 'T00:00:00');
    return d >= from && d < to;
}

interface CategoryDelta {
    category: string;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    pct: number;
}

const insights = computed(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd   = new Date(thisWeekStart);

    const all = store.budget.recentActivity as Transaction[];
    const thisWeek = all.filter(t => inRange(t, thisWeekStart, new Date(thisWeekStart.getTime() + 7 * 86_400_000)));
    const lastWeek = all.filter(t => inRange(t, lastWeekStart, lastWeekEnd));

    const sumExpense = (txs: Transaction[]) =>
        txs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const sumIncome = (txs: Transaction[]) =>
        txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    const tw_exp = sumExpense(thisWeek);
    const lw_exp = sumExpense(lastWeek);
    const tw_inc = sumIncome(thisWeek);
    const lw_inc = sumIncome(lastWeek);

    const expenseDelta = tw_exp - lw_exp;
    const expensePct = lw_exp > 0 ? Math.round((expenseDelta / lw_exp) * 100) : 0;

    // Per-category deltas
    const cats = new Map<string, { thisWeek: number; lastWeek: number }>();
    for (const t of thisWeek.filter(t => t.type === 'expense')) {
        const row = cats.get(t.category) ?? { thisWeek: 0, lastWeek: 0 };
        row.thisWeek += Math.abs(t.amount);
        cats.set(t.category, row);
    }
    for (const t of lastWeek.filter(t => t.type === 'expense')) {
        const row = cats.get(t.category) ?? { thisWeek: 0, lastWeek: 0 };
        row.lastWeek += Math.abs(t.amount);
        cats.set(t.category, row);
    }

    const deltas: CategoryDelta[] = [];
    for (const [category, row] of cats) {
        const delta = row.thisWeek - row.lastWeek;
        const pct = row.lastWeek > 0
            ? Math.round((delta / row.lastWeek) * 100)
            : (row.thisWeek > 0 ? 100 : 0);
        deltas.push({ category, thisWeek: row.thisWeek, lastWeek: row.lastWeek, delta, pct });
    }

    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
        tw_exp, lw_exp, tw_inc, lw_inc,
        expenseDelta, expensePct,
        biggestCategory: deltas[0] ?? null,
        topMover: deltas.find(d => d.lastWeek > 0 && Math.abs(d.pct) >= 15) ?? null,
        topCategories: deltas.slice(0, 3),
        hasData: thisWeek.length > 0 || lastWeek.length > 0,
    };
});

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

const headline = computed(() => {
    const i = insights.value;
    if (!i.hasData) return 'Log a few transactions to unlock weekly insights.';
    if (i.lw_exp === 0 && i.tw_exp > 0) return `First week of tracking — ${fmt(i.tw_exp)} spent so far.`;
    if (i.expensePct === 0) return `Steady week — same as last week (${fmt(i.tw_exp)}).`;
    const dir = i.expensePct > 0 ? 'up' : 'down';
    const tone = i.expensePct > 0 ? 'more' : 'less';
    return `Spending is ${dir} ${Math.abs(i.expensePct)}% — ${fmt(Math.abs(i.expenseDelta))} ${tone} than last week.`;
});

const headlineTone = computed(() => {
    const i = insights.value;
    if (!i.hasData) return 'neutral';
    if (i.expensePct === 0) return 'neutral';
    return i.expensePct > 0 ? 'caution' : 'good';
});
</script>

<template>
  <TangoCard padding="lg" shadow="default" class="w-full">
    <div class="flex items-center gap-2 mb-3">
      <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">trending_up</span>
      <h3 class="text-headline-md text-on-surface">Tango Vibe Check</h3>
      <span class="text-label-sm uppercase text-on-surface-variant ml-auto">This Week</span>
    </div>

    <p
      class="text-body-md mb-4"
      :class="{
        'text-error': headlineTone === 'caution',
        'text-secondary': headlineTone === 'good',
        'text-on-surface-variant': headlineTone === 'neutral',
      }"
    >{{ headline }}</p>

    <div v-if="insights.hasData" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <div class="p-3 pixel-border-sm bg-surface-variant">
        <div class="text-label-sm uppercase text-on-surface-variant">Spent</div>
        <div class="text-body-lg font-bold text-error">{{ fmt(insights.tw_exp) }}</div>
        <div v-if="insights.lw_exp > 0" class="text-label-sm text-outline">last wk: {{ fmt(insights.lw_exp) }}</div>
      </div>
      <div class="p-3 pixel-border-sm bg-surface-variant">
        <div class="text-label-sm uppercase text-on-surface-variant">Earned</div>
        <div class="text-body-lg font-bold text-secondary">{{ fmt(insights.tw_inc) }}</div>
        <div v-if="insights.lw_inc > 0" class="text-label-sm text-outline">last wk: {{ fmt(insights.lw_inc) }}</div>
      </div>
    </div>

    <div v-if="insights.topMover" class="p-3 pixel-border-sm bg-primary-container mb-3">
      <div class="text-label-sm uppercase text-on-primary-container font-bold">
        {{ insights.topMover.pct > 0 ? '↑' : '↓' }}
        {{ Math.abs(insights.topMover.pct) }}% on {{ insights.topMover.category }}
      </div>
      <div class="text-label-sm text-on-primary-container">
        {{ fmt(insights.topMover.thisWeek) }} this week vs {{ fmt(insights.topMover.lastWeek) }} last week
      </div>
    </div>

    <div v-if="insights.topCategories.length > 0" class="space-y-1">
      <div class="text-label-sm uppercase text-on-surface-variant mb-1">Top categories</div>
      <div
        v-for="c in insights.topCategories"
        :key="c.category"
        class="flex justify-between items-center text-label-md"
      >
        <span>{{ c.category }}</span>
        <span class="flex items-center gap-2">
          <span>{{ fmt(c.thisWeek) }}</span>
          <span
            v-if="c.lastWeek > 0"
            :class="c.delta > 0 ? 'text-error' : 'text-secondary'"
            class="text-label-sm uppercase"
          >
            {{ c.delta > 0 ? '+' : '' }}{{ c.pct }}%
          </span>
        </span>
      </div>
    </div>
  </TangoCard>
</template>
