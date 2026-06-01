<script setup lang="ts">
import { ref, watch, inject } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { useRecurringStore, type Cadence, type RecurringTransaction } from '../stores/useRecurringStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { iconForCategory } from '../utils/categoryIcons';
import { localDateISO } from '../utils/dateUtils';

const props = defineProps<{
    show: boolean;
    recurringId?: string | null;
}>();
const emit = defineEmits(['close']);

const household = useHouseholdStore();
const recurring = useRecurringStore();
const prefs = usePreferencesStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const title = ref('');
const amount = ref(0);
const type = ref<'expense' | 'income'>('expense');
const category = ref('Bills');
const cadence = ref<Cadence>('monthly');
const startDate = ref(localDateISO()); // localDateISO avoids UTC offset date drift (B-UTC)
const endDate = ref('');
const notes = ref('');
const errors = ref({ title: '', amount: '' });
const loading = ref(false);

const cadences: { value: Cadence; label: string }[] = [
    { value: 'daily',    label: 'Daily' },
    { value: 'weekly',   label: 'Weekly' },
    { value: 'biweekly', label: 'Biweekly' },
    { value: 'monthly',  label: 'Monthly' },
    { value: 'yearly',   label: 'Yearly' },
];

const reset = () => {
    title.value = '';
    amount.value = 0;
    type.value = 'expense';
    category.value = 'Bills';
    cadence.value = 'monthly';
    startDate.value = localDateISO();
    endDate.value = '';
    notes.value = '';
    errors.value = { title: '', amount: '' };
};

watch(() => props.recurringId, (id) => {
    if (id) {
        const r: RecurringTransaction | undefined = recurring.items.find(x => x.id === id);
        if (r) {
            title.value = r.title;
            amount.value = Math.abs(r.amount);
            type.value = r.type;
            category.value = r.category;
            cadence.value = r.cadence;
            startDate.value = r.start_date;
            endDate.value = r.end_date ?? '';
            notes.value = r.notes ?? '';
        }
    } else {
        reset();
    }
}, { immediate: true });

const save = async () => {
    errors.value = { title: '', amount: '' };
    let hasError = false;
    if (!title.value.trim()) { errors.value.title = 'Title is required'; hasError = true; }
    if (amount.value === 0) { errors.value.amount = 'Amount cannot be zero'; hasError = true; }
    if (!household.householdId) { notify('No household.', 'error'); return; }
    if (hasError) return;

    loading.value = true;
    try {
        const payload = {
            title: title.value.trim(),
            amount: Math.abs(amount.value),
            type: type.value,
            category: category.value,
            // Derive the icon from category so spawned transactions display the
            // same icon as equivalent one-off transactions. Previously hardcoded
            // to 'event_repeat' / 'account_balance' regardless of category. (B97)
            icon: iconForCategory(category.value, type.value),
            cadence: cadence.value,
            start_date: startDate.value,
            end_date: endDate.value || null,
            notes: notes.value.trim() || null,
        };

        if (props.recurringId) {
            await recurring.update(props.recurringId, payload);
            notify('Recurring updated.', 'success');
        } else {
            await recurring.add(household.householdId, payload);
            notify('Recurring added.', 'success');
        }
        emit('close');
    } catch (e: any) {
        notify('Failed to save: ' + (e.message ?? 'Unknown error'), 'error');
    } finally {
        loading.value = false;
    }
};

const deleteRecurring = async () => {
    if (!props.recurringId) return;
    if (!confirm('Delete this recurring transaction? Future occurrences will stop. Past spawned transactions are untouched.')) return;
    try {
        await recurring.remove(props.recurringId);
        emit('close');
    } catch (e: any) {
        notify('Failed to delete: ' + (e.message ?? 'Unknown error'), 'error');
    }
};
</script>

<template>
  <BaseModal :show="show" :title="recurringId ? 'Edit Recurring' : 'New Recurring'" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <div class="flex gap-4">
        <button @click="type = 'expense'" class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="type === 'expense' ? 'bg-error text-on-error' : 'bg-surface hover:bg-surface-variant'">Expense</button>
        <button @click="type = 'income'" class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="type === 'income' ? 'bg-secondary text-on-secondary' : 'bg-surface hover:bg-surface-variant'">Income</button>
      </div>

      <TangoInput v-model="title" label="Title" placeholder="e.g. Rent" :error="errors.title" required />

      <div class="grid grid-cols-2 gap-4">
        <TangoInput v-model.number="amount" label="Amount" type="number" :error="errors.amount" required />
        <div class="flex flex-col gap-2">
          <label class="text-label-sm text-on-surface-variant uppercase font-bold">Cadence</label>
          <select v-model="cadence" class="sunken-input px-3 py-2 text-body-md focus:outline-none focus:ring-0 pixel-border-sm">
            <option v-for="c in cadences" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <TangoInput v-model="startDate" label="Start Date" type="date" required />
        <TangoInput v-model="endDate" label="End Date (optional)" type="date" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Category</label>
        <div class="flex gap-2 flex-wrap flex-wrap">
          <button
            v-for="cat in prefs.transactionCategories" :key="cat"
            @click="category = cat"
            class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
            :class="category === cat ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
          >{{ cat }}</button>
        </div>
      </div>

      <TangoInput v-model="notes" label="Notes (optional)" placeholder="e.g. Auto-pay on the 1st" />
    </div>

    <template #footer>
      <TangoButton v-if="recurringId" @click="deleteRecurring" variant="outline" class="text-error border-error mr-auto" size="sm">Delete</TangoButton>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="save" :disabled="loading" shadow="dark" size="sm">{{ loading ? 'Saving…' : 'SAVE' }}</TangoButton>
    </template>
  </BaseModal>
</template>
