<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useActivityStore, type AuditEntry } from '../stores/useActivityStore';
import { useAppStore } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';

interface Props {
    show: boolean;
}
defineProps<Props>();
defineEmits(['close']);

const activity = useActivityStore();
const store = useAppStore();
const auth = useAuthStore();
const household = useHouseholdStore();

const userNameFor = (uid: string | null) => {
    if (!uid) return 'Someone';
    if (uid === auth.user?.id) return 'You';
    return store.partnerName ?? 'Partner';
};

const iconFor = (table: string) => {
    switch (table) {
        case 'transactions':     return 'receipt_long';
        case 'goals':            return 'flag';
        case 'todos':            return 'task_alt';
        case 'calendar_events':  return 'event';
        default:                 return 'history';
    }
};

const actionVerb = (action: string, table: string) => {
    const noun =
        table === 'transactions'    ? 'transaction' :
        table === 'goals'           ? 'goal' :
        table === 'todos'           ? 'todo' :
        table === 'calendar_events' ? 'event' : 'item';
    if (action === 'insert') return `added a ${noun}`;
    if (action === 'update') return `edited a ${noun}`;
    if (action === 'delete') return `removed a ${noun}`;
    return action;
};

const describe = (e: AuditEntry) => {
    const row = e.after ?? e.before ?? {};
    if (e.table_name === 'transactions') {
        const sign = row.type === 'income' ? '+' : '-';
        return `${sign}${Math.abs(Number(row.amount ?? 0))} • ${row.title ?? ''}`;
    }
    if (e.table_name === 'goals') {
        if (e.action === 'update' && e.after?.status === 'Completed' && e.before?.status !== 'Completed') {
            return `Completed: ${row.title ?? ''}`;
        }
        return row.title ?? '';
    }
    if (e.table_name === 'todos') {
        if (e.action === 'update' && e.after?.completed === true && e.before?.completed === false) {
            return `Done: ${row.text ?? ''}`;
        }
        return row.text ?? '';
    }
    if (e.table_name === 'calendar_events') {
        return `${row.title ?? ''} • ${row.date ?? ''} ${row.time ?? ''}`.trim();
    }
    return '';
};

const relativeTime = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const visible = computed(() => activity.entries);

onMounted(() => {
    if (household.householdId) activity.fetch(household.householdId);
});
</script>

<template>
  <transition name="slide-x">
    <div v-if="show" class="fixed inset-0 z-50 flex">
      <div class="flex-1 bg-black/40" @click="$emit('close')" aria-hidden="true"></div>

      <aside class="w-full max-w-sm bg-surface pixel-border-l hard-shadow flex flex-col">
        <header class="flex items-center justify-between p-4 border-b-2 border-on-surface">
          <h3 class="text-headline-md">Activity</h3>
          <button
            @click="$emit('close')"
            class="material-symbols-outlined text-on-surface hover:text-primary"
            aria-label="Close"
          >close</button>
        </header>

        <div class="flex-1 overflow-y-auto">
          <div v-if="activity.loading" class="p-6 text-center text-on-surface-variant">Loading…</div>
          <div v-else-if="visible.length === 0" class="p-6 text-center text-on-surface-variant">
            No activity yet. Add a transaction, goal, todo, or event to see it here.
          </div>
          <div
            v-for="e in visible"
            :key="e.id"
            class="flex items-start gap-3 p-3 border-b border-outline-variant"
          >
            <span class="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">
              {{ iconFor(e.table_name) }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-label-md">
                  <strong>{{ userNameFor(e.user_id) }}</strong> {{ actionVerb(e.action, e.table_name) }}
                </span>
                <span class="text-[10px] uppercase text-outline shrink-0">{{ relativeTime(e.created_at) }}</span>
              </div>
              <p class="text-label-sm text-on-surface-variant truncate">{{ describe(e) }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </transition>
</template>

<style scoped>
.slide-x-enter-active,
.slide-x-leave-active {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}
.slide-x-enter-from,
.slide-x-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.pixel-border-l {
  border-left: 2px solid currentColor;
}
</style>
