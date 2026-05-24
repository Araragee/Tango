<script setup lang="ts">
import { ref, watch, inject } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { type Transaction, useAppStore } from '../stores/useStore';
import { supabase, isConfigured, RECEIPTS_BUCKET } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { iconForCategory } from '../utils/categoryIcons';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{
    show: boolean;
    transaction: Transaction | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();
const auth = useAuthStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const editMode = ref(false);
const editTitle = ref('');
const editCategory = ref('');
const editNote = ref('');

// ── Receipt ────────────────────────────────────────────────────────────────
const receiptFileInput = ref<HTMLInputElement | null>(null);
const receiptBusy = ref(false);

const RECEIPT_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

const triggerReceiptPick = () => receiptFileInput.value?.click();

const onReceiptChosen = async (e: Event) => {
    if (!props.transaction) return;
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!RECEIPT_ALLOWED.has(file.type)) {
        notify('Please choose an image (JPEG, PNG, WebP, GIF) or PDF.', 'error');
        input.value = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        notify('File too large — max 10 MB.', 'error');
        input.value = '';
        return;
    }
    if (!isConfigured || !auth.user) {
        notify('Supabase must be configured to upload receipts.', 'error');
        return;
    }
    receiptBusy.value = true;
    try {
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        // When RECEIPTS_BUCKET still points at 'avatars' we prefix the path
        // with 'receipts/' so the two file types don't collide in the bucket.
        // Once a dedicated 'receipts' bucket is provisioned the prefix is
        // redundant but harmless.
        const path = RECEIPTS_BUCKET === 'avatars'
            ? `receipts/${auth.user.id}/${props.transaction.id}_${crypto.randomUUID()}.${ext}`
            : `${auth.user.id}/${props.transaction.id}_${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(RECEIPTS_BUCKET)
            .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
        await store.updateTransaction(props.transaction.id, { receipt_url: publicData.publicUrl });
        notify('Receipt attached.', 'success');
    } catch (err: any) {
        notify(err.message ?? 'Failed to upload receipt.', 'error');
    } finally {
        receiptBusy.value = false;
        input.value = '';
    }
};

const removeReceipt = async () => {
    if (!props.transaction?.receipt_url) return;
    if (!confirm('Remove the attached receipt?')) return;
    try {
        // Pass null (not undefined) so Supabase serialises it as JSON null and
        // actually clears the column.  undefined is stripped from JSON, leaving
        // the server value unchanged and causing the receipt to reappear after
        // the next realtime refetch. (B66)
        await store.updateTransaction(props.transaction.id, { receipt_url: null });
        notify('Receipt removed.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to remove receipt.', 'error');
    }
};

// ── Watch ──────────────────────────────────────────────────────────────────

watch(() => props.transaction, (tx) => {
  if (tx) {
    editTitle.value = tx.title;
    editCategory.value = tx.category;
    editNote.value = tx.note ?? '';
    editMode.value = false;
  }
}, { immediate: true });

const deleteBusy = ref(false);
const saveBusy = ref(false);

const deleteTx = async () => {
    if (!props.transaction) return;
    if (!confirm(`Delete "${props.transaction.title}"? This cannot be undone.`)) return;
    deleteBusy.value = true;
    try {
        await store.deleteTransaction(props.transaction.id);
        emit('close');
    } catch (e: any) {
        notify(e.message ?? 'Failed to delete transaction.', 'error');
    } finally {
        deleteBusy.value = false;
    }
};

const saveEdit = async () => {
  if (!props.transaction) return;
  saveBusy.value = true;
  try {
    const newCategory = editCategory.value;
    // Re-derive the icon whenever the category changes, so the stored icon
    // stays consistent with the category name.
    const newIcon = iconForCategory(newCategory, props.transaction.type);
    // Pass null (not undefined) when the note is cleared so JSON serialisation
    // includes the field and Supabase actually clears the column.  undefined is
    // stripped from JSON payloads, leaving the server value unchanged — same
    // root cause as B66 (receipt_url). (B76)
    await store.updateTransaction(props.transaction.id, {
        title: editTitle.value,
        category: newCategory,
        icon: newIcon,
        note: editNote.value.trim() || null,
    });
    editMode.value = false;
    notify('Transaction updated.', 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to update transaction.', 'error');
  } finally {
    saveBusy.value = false;
  }
};
</script>

<template>
  <BaseModal :show="show" title="Transaction Details" @close="emit('close')">
    <div v-if="transaction" class="flex flex-col gap-6">
        <div class="flex items-center gap-4 border-b border-on-surface pb-4">
            <div class="w-16 h-16 pixel-border bg-surface-variant flex items-center justify-center shrink-0">
                <CategoryIcon
                    :category="editMode ? editCategory : transaction.category"
                    :fallback-icon="transaction.icon"
                    :tx-type="transaction.type"
                    size="text-4xl"
                />
            </div>
            <div v-if="!editMode" class="flex-1 min-w-0">
                <h3 class="text-headline-md truncate">{{ transaction.title }}</h3>
                <p class="text-label-sm text-outline uppercase">{{ transaction.category }} • {{ transaction.date }}</p>
            </div>
            <div v-else class="flex-1 flex flex-col gap-2">
                <TangoInput v-model="editTitle" label="Title" />
                <TangoInput v-model="editCategory" label="Category" />
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

        <!-- Note -->
        <div v-if="!editMode" class="bg-surface-container-low p-4 pixel-border-sm">
            <p class="text-label-sm uppercase text-on-surface-variant font-bold mb-1">Note</p>
            <p class="text-body-md text-on-surface">{{ transaction.note || '–' }}</p>
        </div>
        <div v-else class="flex flex-col gap-1">
            <label class="text-label-sm uppercase text-on-surface-variant font-bold">Note</label>
            <textarea
                v-model="editNote"
                rows="3"
                placeholder="Add a note…"
                class="sunken-input px-4 py-2 text-body-md focus:outline-none focus:ring-1 focus:ring-primary pixel-border-sm w-full resize-none"
            ></textarea>
        </div>

        <!-- Receipt -->
        <div class="bg-surface-container-low p-4 pixel-border-sm">
            <div class="flex items-center justify-between mb-2">
                <p class="text-label-sm uppercase text-on-surface-variant font-bold">Receipt</p>
                <div class="flex items-center gap-2">
                    <button
                        v-if="transaction.receipt_url"
                        @click="removeReceipt"
                        class="text-label-sm uppercase text-error hover:underline"
                        title="Remove receipt"
                    >Remove</button>
                    <button
                        @click="triggerReceiptPick"
                        :disabled="receiptBusy"
                        class="text-label-sm uppercase text-primary hover:underline disabled:opacity-50"
                    >{{ receiptBusy ? 'Uploading…' : (transaction.receipt_url ? 'Replace' : 'Attach') }}</button>
                </div>
            </div>

            <!-- Preview -->
            <a
                v-if="transaction.receipt_url && !transaction.receipt_url.endsWith('.pdf')"
                :href="transaction.receipt_url"
                target="_blank"
                rel="noopener noreferrer"
                class="block"
            >
                <img
                    :src="transaction.receipt_url"
                    alt="Receipt"
                    class="w-full max-h-48 object-contain pixel-border-sm bg-surface"
                />
            </a>
            <a
                v-else-if="transaction.receipt_url"
                :href="transaction.receipt_url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-primary hover:underline text-body-md"
            >
                <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                View PDF Receipt
            </a>
            <p v-else class="text-body-md text-on-surface-variant">No receipt attached.</p>

            <input
                ref="receiptFileInput"
                type="file"
                accept="image/*,application/pdf"
                class="hidden"
                @change="onReceiptChosen"
            />
        </div>
    </div>

    <template #footer>
      <TangoButton v-if="!editMode" @click="deleteTx" :disabled="deleteBusy" variant="outline" class="text-error border-error mr-auto" size="sm">{{ deleteBusy ? 'Deleting…' : 'Delete' }}</TangoButton>
      <TangoButton v-if="!editMode" @click="editMode = true" variant="surface" size="sm">Edit</TangoButton>
      <TangoButton v-if="!editMode" @click="emit('close')" shadow="dark" size="sm">Close</TangoButton>
      <TangoButton v-if="editMode" @click="editMode = false" :disabled="saveBusy" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton v-if="editMode" @click="saveEdit" :disabled="saveBusy" shadow="dark" size="sm">{{ saveBusy ? 'Saving…' : 'Save' }}</TangoButton>
    </template>
  </BaseModal>
</template>
