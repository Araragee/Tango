<script setup lang="ts">
import { computed, ref, onMounted, inject } from 'vue';
import { useRecurringStore, type RecurringTransaction } from '../stores/useRecurringStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import RecurringTransactionModal from './RecurringTransactionModal.vue';
import { localDateISO } from '../utils/dateUtils';

const recurring = useRecurringStore();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const showModal = ref(false);
const editingId = ref<string | null>(null);
// I25: expand toggle — show only 6 by default, reveal all on demand.
const showAll = ref(false);

const upcoming = computed(() =>
  showAll.value ? recurring.upcoming : recurring.upcoming.slice(0, 6)
);

const openNew = () => {
    editingId.value = null;
    showModal.value = true;
};

const openEdit = (id: string) => {
    editingId.value = id;
    showModal.value = true;
};

const togglePause = async (r: RecurringTransaction) => {
    try {
        await recurring.togglePaused(r.id);
        notify(r.active ? 'Paused.' : 'Resumed.', 'success');
    } catch (e: any) {
        notify('Failed: ' + (e.message ?? 'Unknown'), 'error');
    }
};

const runDue = async () => {
    if (!household.householdId) return;
    try {
        const count = await recurring.spawnDueAndAdvance(household.householdId);
        if (count > 0) notify(`${count} bill${count === 1 ? '' : 's'} posted.`, 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to post recurring bills.', 'error');
    }
};

const fmtNext = (iso: string) => {
    // Use localDateISO so "today" is the local calendar date, not UTC. (B-UTC)
    const ms = new Date(iso + 'T00:00:00').getTime() - new Date(localDateISO() + 'T00:00:00').getTime();
    const days = Math.round(ms / 86_400_000);
    if (days < 0) return `${-days}d overdue`;
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 30) return `in ${days}d`;
    return new Date(iso).toLocaleDateString();
};

const cadenceLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

onMounted(async () => {
    if (household.householdId) {
        try {
            await recurring.spawnDueAndAdvance(household.householdId);
        } catch (e: any) {
            notify(e.message ?? 'Failed to check recurring bills.', 'error');
        }
    }
});
</script>

<template>
  <TangoCard padding="lg" shadow="default" class="w-full">
    <div class="flex justify-between items-center mb-4 border-b-2 border-on-background pb-2">
      <h3 class="text-headline-lg text-on-surface">Recurring & Bills</h3>
      <div class="flex gap-2 flex-wrap">
        <TangoButton v-if="upcoming.length > 0" @click="runDue" :disabled="recurring.spawning" variant="surface" size="sm" aria-label="Run due now">
          <span class="material-symbols-outlined text-[16px]">play_arrow</span>
          {{ recurring.spawning ? 'Running…' : 'Run due' }}
        </TangoButton>
        <TangoButton @click="openNew" shadow="dark" size="sm" aria-label="New recurring">
          <span class="material-symbols-outlined text-[16px]">add</span>
          New
        </TangoButton>
      </div>
    </div>

    <p v-if="upcoming.length === 0" class="text-body-md text-on-surface-variant py-4 text-center">
      No recurring bills yet. Add one for rent, subscriptions, or salary.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="r in upcoming"
        :key="r.id"
        @click="openEdit(r.id)"
        class="flex items-center justify-between p-3 bg-surface pixel-border-sm hover:bg-surface-variant transition-colors cursor-pointer"
        :class="!r.active && 'opacity-50'"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="material-symbols-outlined text-on-surface shrink-0">{{ r.icon }}</span>
          <div class="min-w-0">
            <div class="text-body-md font-bold truncate">{{ r.title }}</div>
            <div class="text-label-sm text-outline uppercase">{{ cadenceLabel(r.cadence) }} · {{ fmtNext(r.next_run_at) }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-body-md font-bold" :class="r.type === 'expense' ? 'text-error' : 'text-secondary'">
            {{ r.type === 'expense' ? '-' : '+' }}${{ r.amount.toFixed(0) }}
          </span>
          <button
            @click.stop="togglePause(r)"
            class="material-symbols-outlined text-outline hover:text-primary transition-colors text-sm"
            :aria-label="r.active ? 'Pause' : 'Resume'"
          >{{ r.active ? 'pause' : 'play_arrow' }}</button>
        </div>
      </li>
    </ul>

    <!-- I25: show/hide toggle when there are more than 6 recurring items -->
    <button
      v-if="recurring.upcoming.length > 6"
      @click="showAll = !showAll"
      class="mt-3 w-full text-center text-label-sm uppercase text-on-surface-variant hover:text-primary transition-colors"
    >
      {{ showAll ? 'Show less' : `Show all ${recurring.upcoming.length}` }}
      <span class="material-symbols-outlined text-[14px] align-middle">{{ showAll ? 'expand_less' : 'expand_more' }}</span>
    </button>

    <RecurringTransactionModal :show="showModal" :recurring-id="editingId" @close="showModal = false" />
  </TangoCard>
</template>
