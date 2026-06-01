<script setup lang="ts">
import { ref, inject } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore } from '../stores/useStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { iconForCategory } from '../utils/categoryIcons';
import { localDateISO } from '../utils/dateUtils';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);
const store = useAppStore();
const prefs = usePreferencesStore();
const auth = useAuthStore();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const title = ref('');
const amount = ref(0);
const category = ref('Food');
const type = ref<'expense' | 'income'>('expense');
const date = ref(localDateISO()); // localDateISO avoids UTC offset date drift (B-UTC)
const note = ref('');
const errors = ref({ title: '', amount: '' });
const newCategory = ref('');
// true = current user paid; false = partner paid. null = untracked.
// Only relevant when a partner exists in the household.
const paidByMe = ref<boolean | null>(null);

const addCategory = () => {
  if (!newCategory.value.trim()) return;
  prefs.addTransactionCategory(newCategory.value);
  category.value = newCategory.value.trim();
  newCategory.value = '';
};

const saveTransaction = async () => {
  errors.value = { title: '', amount: '' };
  let hasError = false;
  if (!title.value.trim()) { errors.value.title = 'Title is required'; hasError = true; }
  if (amount.value === 0) { errors.value.amount = 'Amount cannot be zero'; hasError = true; }
  if (hasError) return;

  try {
    const paid_by = paidByMe.value === true
      ? (auth.user?.id ?? null)
      : paidByMe.value === false
        ? (household.partner?.user_id ?? null)
        : null;

    await store.addTransaction({
      title: title.value,
      amount: type.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value),
      date: date.value,
      type: type.value,
      icon: iconForCategory(category.value, type.value),
      category: category.value,
      note: note.value.trim() || null,
      paid_by,
    });
    title.value = '';
    amount.value = 0;
    category.value = 'Food';
    type.value = 'expense';
    date.value = localDateISO();
    note.value = '';
    paidByMe.value = null;
    emit('close');
  } catch (e: any) {
    notify(e.message ?? 'Failed to add transaction.', 'error');
  }
};
</script>

<template>
  <BaseModal :show="show" title="New Transaction" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <!-- Type toggle -->
      <div class="flex gap-4">
        <button @click="type = 'expense'" class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="type === 'expense' ? 'bg-error text-on-error' : 'bg-surface hover:bg-surface-variant'">Expense</button>
        <button @click="type = 'income'" class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="type === 'income' ? 'bg-secondary text-on-secondary' : 'bg-surface hover:bg-surface-variant'">Income</button>
      </div>

      <TangoInput v-model="title" label="Title" placeholder="e.g. Weekly Groceries" :error="errors.title" required />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TangoInput v-model.number="amount" label="Amount" type="number" :error="errors.amount" required />
        <TangoInput v-model="date" label="Date" type="date" required />
      </div>

      <!-- Category picker -->
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
        <div class="flex gap-2 flex-wrap mt-1">
          <TangoInput v-model="newCategory" placeholder="Add category..." class="flex-1" @keyup.enter="addCategory" />
          <TangoButton size="sm" variant="outline" @click="addCategory" aria-label="Add category">+</TangoButton>
        </div>
      </div>
      <!-- Optional note -->
      <div class="flex flex-col gap-1">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Note (optional)</label>
        <textarea
          v-model="note"
          rows="2"
          placeholder="e.g. Split with partner, receipt in wallet…"
          class="sunken-input px-4 py-2 text-body-md focus:outline-none focus:ring-1 focus:ring-primary pixel-border-sm w-full resize-none"
        ></textarea>
      </div>

      <!-- Paid by — only when a partner is paired -->
      <div v-if="household.partner" class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Paid by</label>
        <div class="flex gap-2 flex-wrap">
          <button
            @click="paidByMe = paidByMe === true ? null : true"
            class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
            :class="paidByMe === true ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
          >Me</button>
          <button
            @click="paidByMe = paidByMe === false ? null : false"
            class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
            :class="paidByMe === false ? 'bg-secondary text-on-secondary' : 'bg-surface hover:bg-surface-variant'"
          >{{ store.partnerName }}</button>
        </div>
        <p v-if="paidByMe === null" class="text-[10px] uppercase text-on-surface-variant">Optional — tracks who fronted the money</p>
      </div>
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="saveTransaction" shadow="dark" size="sm">SAVE</TangoButton>
    </template>
  </BaseModal>
</template>
