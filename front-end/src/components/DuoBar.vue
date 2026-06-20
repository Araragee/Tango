<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useAppStore } from '../stores/useStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { useContributionsStore } from '../stores/useContributionsStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';

interface Props {
    goalId: string;
    target: number;
    showLegend?: boolean;
}
const props = withDefaults(defineProps<Props>(), { showLegend: true });

const auth = useAuthStore();
const store = useAppStore();
const household = useHouseholdStore();
const contributions = useContributionsStore();
const prefs = usePreferencesStore();

const totals = computed(() => contributions.totalsByUser(props.goalId).value);

const myId = computed(() => auth.user?.id ?? '');
const partnerId = computed(() => household.partner?.user_id ?? '');

const myAmount      = computed(() => totals.value[myId.value]      ?? 0);
const partnerAmount = computed(() => totals.value[partnerId.value] ?? 0);
const otherAmount   = computed(() => {
    let sum = 0;
    for (const [uid, amt] of Object.entries(totals.value)) {
        if (uid !== myId.value && uid !== partnerId.value) sum += amt;
    }
    return sum;
});

const denom = computed(() => Math.max(props.target, myAmount.value + partnerAmount.value + otherAmount.value, 1));
const pct = (n: number) => (n / denom.value) * 100;

const myPct      = computed(() => pct(myAmount.value));
const partnerPct = computed(() => pct(partnerAmount.value));
const otherPct   = computed(() => pct(otherAmount.value));

const fmt = (n: number) => `${prefs.currencySymbol}${Math.round(n).toLocaleString()}`;
</script>

<template>
  <div class="w-full">
    <div class="w-full h-6 pixel-border bg-surface-variant flex overflow-hidden">
      <div
        class="h-full bg-primary transition-all duration-500"
        :style="{ width: myPct + '%' }"
        :title="`You contributed ${fmt(myAmount)}`"
      ></div>
      <div
        class="h-full bg-secondary transition-all duration-500"
        :style="{ width: partnerPct + '%' }"
        :title="`${store.partnerName} contributed ${fmt(partnerAmount)}`"
      ></div>
      <div
        v-if="otherAmount > 0"
        class="h-full bg-tertiary transition-all duration-500"
        :style="{ width: otherPct + '%' }"
      ></div>
    </div>

    <div v-if="showLegend" class="flex justify-between text-label-sm mt-2 text-on-surface-variant">
      <span class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 bg-primary pixel-border-sm"></span>
        You · {{ fmt(myAmount) }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 bg-secondary pixel-border-sm"></span>
        {{ store.partnerName }} · {{ fmt(partnerAmount) }}
      </span>
    </div>
  </div>
</template>
