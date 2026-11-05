<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';
import { useUndoToast } from '../composables/useUndoToast';

const { confirm } = useConfirm();
const { showUndo } = useUndoToast();
import { ref, watch, inject, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { type Transaction, useAppStore } from '../stores/useStore';
import { supabase, isConfigured, RECEIPTS_BUCKET } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { receiptRef, parseReceipt, isPdfReceipt, resolveReceiptUrl } from '../utils/receipts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { iconForCategory } from '../utils/categoryIcons';
import CategoryIcon from './CategoryIcon.vue';

const props = defineProps<{
    show: boolean;
    transaction: Transaction | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();
const prefs = usePreferencesStore();
const auth = useAuthStore();
const household = useHouseholdStore();
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

// Signed (short-lived) URL for the current receipt; null until resolved.
const receiptUrl = ref<string | null>(null);
const receiptIsPdf = computed(() => isPdfReceipt(props.transaction?.receipt_url));
watch(() => props.transaction?.receipt_url, async (value) => {
    receiptUrl.value = null;
    if (!value || !isConfigured) return;
    const resolved = await resolveReceiptUrl(value);
    // Ignore a stale resolution if the receipt changed while we were signing.
    if (props.transaction?.receipt_url === value) receiptUrl.value = resolved;
}, { immediate: true });

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
    if (!isConfigured || !auth.user || !household.householdId) {
        notify('Supabase must be configured to upload receipts.', 'error');
        return;
    }
    receiptBusy.value = true;
    try {
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        // Private bucket; the first path segment must be the household id —
        // that's what the receipts_* storage RLS policies check (migration 013).
        const path = `${household.householdId}/${props.transaction.id}_${crypto.randomUUID()}.${ext}`;
        const previous = parseReceipt(props.transaction.receipt_url);
        const { error: uploadError } = await supabase.storage
            .from(RECEIPTS_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        await store.updateTransaction(props.transaction.id, { receipt_url: receiptRef(RECEIPTS_BUCKET, path) });
        // Replacing: drop the old object so it doesn't linger in storage.
        if (previous) {
            supabase.storage.from(previous.bucket).remove([previous.path]).catch((err: any) => {
                console.warn('[replaceReceipt] storage delete failed:', err);
            });
        }
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
    if (!(await confirm({ title: 'Remove Receipt', message: 'Remove the attached receipt?', isDestructive: true }))) return;
    try {
        // Pass null (not undefined) so Supabase serialises it as JSON null and
        // actually clears the column.  undefined is stripped from JSON, leaving
        // the server value unchanged and causing the receipt to reappear after
        // the next realtime refetch. (B66)
        await store.updateTransaction(props.transaction.id, { receipt_url: null });

        // Also delete the file from Supabase Storage so orphaned objects don't
        // accumulate in the bucket. (B124)
        const stored = parseReceipt(props.transaction.receipt_url);
        if (isConfigured && stored) {
            // Fire-and-forget: a storage delete failure is non-fatal — the DB
            // column is already cleared and the file is effectively orphaned
            // at worst. Log the error but don't surface it to the user.
            supabase.storage.from(stored.bucket).remove([stored.path]).catch((err: any) => {
                console.warn('[removeReceipt] storage delete failed:', err);
            });
        }

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
    deleteBusy.value = true;
    try {
        const previousState = { ...props.transaction };
        await store.deleteTransaction(props.transaction.id);
        emit('close');

        showUndo({
          message: 'Transaction deleted.',
          onUndo: async () => {
            try {
              await store.addTransaction({
                title: previousState.title,
                amount: previousState.amount,
                date: previousState.date,
                category: previousState.category,
                paid_by: previousState.paid_by,
                type: previousState.type,
                note: previousState.note,
                receipt_url: previousState.receipt_url,
                icon: previousState.icon
              });
            } catch (e: any) {
              notify(e.message ?? 'Failed to restore transaction.', 'error');
            }
          }
        });
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
                {{ transaction.amount < 0 ? '-' : '+' }}{{ prefs.currencySymbol }}{{ Math.abs(transaction.amount).toFixed(2) }}
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
                class="sunken-input px-4 py-2 text-body-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none pixel-border-sm w-full resize-none"
            ></textarea>
        </div>

        <!-- Receipt -->
        <div class="bg-surface-container-low p-4 pixel-border-sm">
            <div class="flex items-center justify-between mb-2">
                <p class="text-label-sm uppercase text-on-surface-variant font-bold">Receipt</p>
                <div class="flex items-center gap-2">
                    <button
                        v-if="transaction.receipt_url"
                        class="text-label-sm uppercase text-error hover:underline"
                        title="Remove receipt"
                        @click="removeReceipt"
                    >Remove</button>
                    <button
                        :disabled="receiptBusy"
                        class="text-label-sm uppercase text-primary hover:underline disabled:opacity-50"
                        @click="triggerReceiptPick"
                    >{{ receiptBusy ? 'Uploading…' : (transaction.receipt_url ? 'Replace' : 'Attach') }}</button>
                </div>
            </div>

            <!-- Preview -->
            <a
                v-if="receiptUrl && !receiptIsPdf"
                :href="receiptUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block"
            >
                <img
                    :src="receiptUrl"
                    alt="Receipt"
                    loading="lazy"
                    class="w-full max-h-48 object-contain pixel-border-sm bg-surface"
                />
            </a>
            <a
                v-else-if="receiptUrl"
                :href="receiptUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-primary hover:underline text-body-md"
            >
                <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                View PDF Receipt
            </a>
            <p v-else-if="transaction.receipt_url" class="text-body-md text-on-surface-variant">Loading receipt…</p>
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
      <TangoButton v-if="!editMode" :disabled="deleteBusy" variant="outline" class="text-error border-error mr-auto" size="sm" @click="deleteTx">{{ deleteBusy ? 'Deleting…' : 'Delete' }}</TangoButton>
      <TangoButton v-if="!editMode" variant="surface" size="sm" @click="editMode = true">Edit</TangoButton>
      <TangoButton v-if="!editMode" shadow="dark" size="sm" @click="emit('close')">Close</TangoButton>
      <TangoButton v-if="editMode" :disabled="saveBusy" variant="surface" size="sm" @click="editMode = false">Cancel</TangoButton>
      <TangoButton v-if="editMode" :disabled="saveBusy" shadow="dark" size="sm" @click="saveEdit">{{ saveBusy ? 'Saving…' : 'Save' }}</TangoButton>
    </template>
  </BaseModal>
</template>
