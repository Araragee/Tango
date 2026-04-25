<script setup lang="ts">
import { ref } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore } from '../stores/useStore';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);
const store = useAppStore();

const title = ref('');
const amount = ref(0);
const category = ref('General');
const type = ref<'expense' | 'income'>('expense');
const date = ref(new Date().toISOString().split('T')[0]);
const errors = ref({ title: '', amount: '' });

const saveTransaction = () => {
    errors.value = { title: '', amount: '' };
    let hasError = false;

    if (!title.value.trim()) {
        errors.value.title = 'Title is required';
        hasError = true;
    }
    if (amount.value === 0) {
        errors.value.amount = 'Amount cannot be zero';
        hasError = true;
    }

    if (hasError) return;

    store.addTransaction({
        title: title.value,
        amount: type.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value),
        date: date.value,
        type: type.value,
        icon: type.value === 'expense' ? 'shopping_cart' : 'account_balance',
        category: category.value
    });

    // Reset and close
    title.value = '';
    amount.value = 0;
    emit('close');
};
</script>

<template>
  <BaseModal :show="show" title="New Transaction" @close="emit('close')">
    <div class="flex flex-col gap-6">
        <div class="flex gap-4">
            <button
                @click="type = 'expense'"
                class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
                :class="type === 'expense' ? 'bg-error text-on-error' : 'bg-surface hover:bg-surface-variant'"
            >
                Expense
            </button>
            <button
                @click="type = 'income'"
                class="flex-1 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
                :class="type === 'income' ? 'bg-secondary text-on-secondary' : 'bg-surface hover:bg-surface-variant'"
            >
                Income
            </button>
        </div>

        <TangoInput v-model="title" label="Title" placeholder="e.g. Weekly Groceries" :error="errors.title" required />

        <div class="grid grid-cols-2 gap-4">
            <TangoInput v-model.number="amount" label="Amount" type="number" :error="errors.amount" required />
            <TangoInput v-model="date" label="Date" type="date" required />
        </div>

        <TangoInput v-model="category" label="Category" placeholder="e.g. Food" />
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="saveTransaction" shadow="dark" size="sm">SAVE</TangoButton>
    </template>
  </BaseModal>
</template>
