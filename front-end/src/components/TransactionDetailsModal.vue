<script setup lang="ts">
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import { type Transaction, useAppStore } from '../stores/useStore';

const props = defineProps<{
    show: boolean;
    transaction: Transaction | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();

const deleteTx = () => {
    if (props.transaction) {
        store.deleteTransaction(props.transaction.id);
        emit('close');
    }
};
</script>

<template>
  <BaseModal :show="show" title="Transaction Details" @close="emit('close')">
    <div v-if="transaction" class="flex flex-col gap-6">
        <div class="flex items-center gap-4 border-b border-on-surface pb-4">
            <div class="w-16 h-16 pixel-border bg-surface-variant flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">{{ transaction.icon }}</span>
            </div>
            <div>
                <h3 class="text-headline-md">{{ transaction.title }}</h3>
                <p class="text-label-sm text-outline uppercase">{{ transaction.category }} • {{ transaction.date }}</p>
            </div>
        </div>

        <div class="text-center py-4">
            <div class="text-label-sm uppercase text-on-surface-variant font-bold mb-1">Amount</div>
            <div
                class="text-headline-xl"
                :class="transaction.amount < 0 ? 'text-error' : 'text-secondary'"
            >
                {{ transaction.amount < 0 ? '-' : '+' }}${{ Math.abs(transaction.amount).toFixed(2) }}
            </div>
        </div>

        <div class="bg-surface-container-low p-4 pixel-border-sm">
            <p class="text-body-md text-on-surface-variant">No receipt attached.</p>
        </div>
    </div>

    <template #footer>
      <TangoButton @click="deleteTx" variant="outline" class="text-error border-error mr-auto" size="sm">Delete</TangoButton>
      <TangoButton @click="emit('close')" shadow="dark" size="sm">Close</TangoButton>
    </template>
  </BaseModal>
</template>
