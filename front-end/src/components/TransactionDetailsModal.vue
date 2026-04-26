<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { type Transaction, useAppStore } from '../stores/useStore';

const props = defineProps<{
    show: boolean;
    transaction: Transaction | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();

const editMode = ref(false);
const editTitle = ref('');
const editCategory = ref('');

watch(() => props.transaction, (tx) => {
  if (tx) {
    editTitle.value = tx.title;
    editCategory.value = tx.category;
    editMode.value = false;
  }
}, { immediate: true });

const deleteTx = () => {
    if (!props.transaction) return;
    if (!confirm(`Delete "${props.transaction.title}"? This cannot be undone.`)) return;
    store.deleteTransaction(props.transaction.id);
    emit('close');
};

const saveEdit = () => {
  if (!props.transaction) return;
  store.updateTransaction(props.transaction.id, { title: editTitle.value, category: editCategory.value });
  editMode.value = false;
};
</script>

<template>
  <BaseModal :show="show" title="Transaction Details" @close="emit('close')">
    <div v-if="transaction" class="flex flex-col gap-6">
        <div class="flex items-center gap-4 border-b border-on-surface pb-4">
            <div class="w-16 h-16 pixel-border bg-surface-variant flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-4xl">{{ transaction.icon }}</span>
            </div>
            <div v-if="!editMode" class="flex-1 min-w-0">
                <h3 class="text-headline-md truncate">{{ transaction.title }}</h3>
                <p class="text-label-sm text-outline uppercase">{{ transaction.category }} • {{ transaction.date }}</p>
            </div>
            <div v-else class="flex-1 flex flex-col gap-2">
                <TangoInput v-model="editTitle" label="Title" size="sm" />
                <TangoInput v-model="editCategory" label="Category" size="sm" />
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
      <TangoButton v-if="!editMode" @click="deleteTx" variant="outline" class="text-error border-error mr-auto" size="sm">Delete</TangoButton>
      <TangoButton v-if="!editMode" @click="editMode = true" variant="surface" size="sm">Edit</TangoButton>
      <TangoButton v-if="editMode" @click="saveEdit" shadow="dark" size="sm">Save</TangoButton>
      <TangoButton v-if="editMode" @click="editMode = false" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="emit('close')" shadow="dark" size="sm">{{ editMode ? 'Close' : 'Close' }}</TangoButton>
    </template>
  </BaseModal>
</template>
