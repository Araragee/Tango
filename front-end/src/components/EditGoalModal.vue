<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';
import { useUndoToast } from '../composables/useUndoToast';

const { confirm } = useConfirm();
const { showUndo } = useUndoToast();
import { ref, computed, watch, inject } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import DuoBar from './DuoBar.vue';
import { useAppStore, type Goal } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useContributionsStore } from '../stores/useContributionsStore';

const props = defineProps<{
    show: boolean;
    goalId?: string | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();
const auth = useAuthStore();
const contributions = useContributionsStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const GOAL_CATEGORIES = ['General', 'Travel', 'Home', 'Emergency', 'Vehicle', 'Education', 'Wedding', 'Health', 'Other'] as const;
const GOAL_PRIORITIES = ['Low', 'Normal', 'High'] as const;

const title = ref('');
const description = ref('');
const initialSaved = ref(0);
const target = ref(0);
const icon = ref('flag');
const deadline = ref('');
const category = ref<string>('General');
const priority = ref<'Low' | 'Normal' | 'High'>('Normal');
const errors = ref({ title: '', target: '' });

const newContribAmount = ref<number | string>('');
const newContribNote = ref('');
const contribBusy = ref(false);

const isEditing = computed(() => !!props.goalId);

const myContributions = computed(() => {
    if (!props.goalId) return [];
    return contributions.items
        .filter(c => c.goal_id === props.goalId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);
});

const currentGoal = computed<Goal | undefined>(() => {
    if (!props.goalId) return undefined;
    return store.plans.goals.find((g: Goal) => g.id === props.goalId);
});

function populateForm(id: string | null | undefined) {
    if (id) {
        const goal = store.plans.goals.find((g: Goal) => g.id === id);
        if (goal) {
            title.value = goal.title;
            description.value = goal.description;
            initialSaved.value = goal.saved;
            target.value = goal.target;
            icon.value = goal.icon;
            deadline.value = goal.deadline ?? '';
            category.value = goal.category ?? 'General';
            priority.value = goal.priority ?? 'Normal';
        }
    } else {
        title.value = '';
        description.value = '';
        initialSaved.value = 0;
        target.value = 0;
        icon.value = 'flag';
        deadline.value = '';
        category.value = 'General';
        priority.value = 'Normal';
    }
    errors.value = { title: '', target: '' };
    newContribAmount.value = '';
    newContribNote.value = '';
}

watch(() => props.goalId, (newId) => {
    populateForm(newId);
}, { immediate: true });

// B125: also re-populate when the modal is opened with the same goalId —
// the goalId watch won't fire if TangoPlans keeps selectedGoalId set across
// close/reopen cycles, leaving stale unsaved edits visible on the next open.
watch(() => props.show, (open) => {
    if (open) populateForm(props.goalId);
});

const deleteGoal = async () => {
    if (!props.goalId) return;
    if (!(await confirm({ title: 'Delete Goal', message: 'Delete this goal? This cannot be undone.', isDestructive: true }))) return;
    try {
        await store.deleteGoal(props.goalId);
        emit('close');
    } catch (e: any) {
        notify('Failed to delete goal: ' + (e.message || 'Unknown error'), 'error');
    }
};

const saveGoal = async () => {
    errors.value = { title: '', target: '' };
    let hasError = false;

    if (!title.value.trim()) {
        errors.value.title = 'Title is required';
        hasError = true;
    }
    if (target.value <= 0) {
        errors.value.target = 'Target must be positive';
        hasError = true;
    }
    if (hasError) return;

    try {
        if (props.goalId) {
            await store.editGoal(props.goalId, {
                title: title.value,
                description: description.value,
                target: target.value,
                icon: icon.value,
                category: category.value,
                priority: priority.value,
                deadline: deadline.value || null,
            });
        } else {
            const newGoalId = await store.addGoal({
                title: title.value,
                description: description.value,
                saved: 0,
                target: target.value,
                icon: icon.value,
                category: category.value,
                priority: priority.value,
                deadline: deadline.value || null,
            });
            // If user typed a starting amount, post it as a first contribution
            // AND sync goal.saved immediately via updateGoalProgress.
            // addContribution only writes to the contributions store — it does not
            // update goal.saved, so without the updateGoalProgress call the
            // progress bar stays at 0% until a realtime refetch arrives. (B79)
            if (newGoalId && initialSaved.value > 0) {
                try {
                    await contributions.addContribution(newGoalId, Number(initialSaved.value), 'Initial contribution');
                    await store.updateGoalProgress(newGoalId, Number(initialSaved.value));
                } catch { /* swallow; goal still saved */ }
            }
        }
        emit('close');
    } catch (e: any) {
        notify('Failed to save goal: ' + (e.message || 'Unknown error'), 'error');
    }
};

const addContribution = async () => {
    if (!props.goalId) return;
    const amt = Number(newContribAmount.value);
    if (!Number.isFinite(amt) || amt <= 0) {
        notify('Enter a positive amount.', 'error');
        return;
    }
    const goal = currentGoal.value;
    if (!goal) return;
    contribBusy.value = true;
    try {
        await contributions.addContribution(props.goalId, amt, newContribNote.value.trim() || undefined);
        // Immediately update goal.saved / progress / status so the progress bar
        // reflects the new contribution without waiting for a realtime refetch.
        // addContribution only writes to the contributions table — goal.saved is
        // not automatically kept in sync client-side. (B81)
        await store.updateGoalProgress(props.goalId, goal.saved + amt);
        newContribAmount.value = '';
        newContribNote.value = '';
        notify('Contribution added!', 'success');
    } catch (e: any) {
        notify('Failed to add contribution: ' + (e.message ?? 'Unknown error'), 'error');
    } finally {
        contribBusy.value = false;
    }
};

const removeContribution = async (id: string) => {
    const contrib = contributions.items.find(c => c.id === id);
    const goal = currentGoal.value;
    try {
        const previousState = contrib ? { ...contrib } : null;
        await contributions.removeContribution(id);

        if (contrib && goal && props.goalId) {
            await store.updateGoalProgress(props.goalId, Math.max(0, goal.saved - (contrib?.amount || 0)));
        }

        if (previousState) {
          showUndo({
            message: 'Contribution removed.',
            onUndo: async () => {
              try {
                await contributions.addContribution(previousState.goal_id, previousState.amount, previousState.note || '');
                if (goal && props.goalId) {
                  await store.updateGoalProgress(props.goalId, goal.saved + previousState.amount);
                }
              } catch (e: any) {
                notify('Failed to restore contribution: ' + (e.message ?? 'Unknown error'), 'error');
              }
            }
          });
        }
    } catch (e: any) {
        notify('Failed to remove: ' + (e.message ?? 'Unknown error'), 'error');
    }
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const whoIs = (uid: string) => uid === auth.user?.id ? 'You' : (store.partnerName ?? 'Partner');
</script>

<template>
  <BaseModal :show="show" :title="goalId ? 'Edit Goal' : 'New Goal'" @close="emit('close')">
    <div class="flex flex-col gap-6">
        <TangoInput v-model="title" label="Goal Title" placeholder="e.g. Dream House" :error="errors.title" required />
        <TangoInput v-model="description" label="Description" placeholder="Why are we saving?" />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TangoInput
                v-if="!isEditing"
                v-model.number="initialSaved"
                label="Initial Saved"
                type="number"
            />
            <TangoInput v-model.number="target" label="Target Amount" type="number" :error="errors.target" required />
        </div>

        <div class="flex flex-col gap-2">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Icon</label>
            <div class="flex gap-4 flex-wrap">
                <button
                    v-for="i in ['flag', 'flight_takeoff', 'home', 'pets', 'directions_car']"
                    :key="i"
                    @click="icon = i"
                    class="w-10 h-10 pixel-border-sm flex items-center justify-center transition-colors"
                    :class="icon === i ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
                    :aria-label="'Select ' + i + ' icon'"
                    :aria-pressed="icon === i"
                >
                    <span class="material-symbols-outlined">{{ i }}</span>
                </button>
            </div>
        </div>

        <!-- Category picker -->
        <div class="flex flex-col gap-2">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Category</label>
            <div class="flex gap-2 flex-wrap">
                <button
                    v-for="cat in GOAL_CATEGORIES"
                    :key="cat"
                    @click="category = cat"
                    class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
                    :class="category === cat ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
                    :aria-pressed="category === cat"
                >{{ cat }}</button>
            </div>
        </div>

        <!-- Priority picker -->
        <div class="flex flex-col gap-2">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Priority</label>
            <div class="flex gap-2 flex-wrap">
                <button
                    v-for="p in GOAL_PRIORITIES"
                    :key="p"
                    @click="priority = p"
                    class="flex-1 py-2 pixel-border-sm text-label-sm uppercase font-bold transition-colors"
                    :class="priority === p
                        ? p === 'High' ? 'bg-error text-on-error'
                          : p === 'Normal' ? 'bg-primary text-on-primary'
                          : 'bg-surface-variant text-on-surface-variant'
                        : 'bg-surface hover:bg-surface-variant'"
                    :aria-pressed="priority === p"
                >{{ p }}</button>
            </div>
        </div>

        <TangoInput v-model="deadline" label="Target Date (Optional)" type="date" />

        <!-- Contributions panel — only when editing an existing goal -->
        <div v-if="isEditing && currentGoal" class="border-t-2 border-on-surface pt-4 space-y-4">
            <div class="flex items-center justify-between">
                <h4 class="text-label-md uppercase font-bold">Contributions</h4>
                <span class="text-label-sm text-on-surface-variant">${{ Math.round(currentGoal.saved).toLocaleString() }} / ${{ currentGoal.target.toLocaleString() }}</span>
            </div>

            <DuoBar :goal-id="currentGoal.id" :target="currentGoal.target" />

            <div class="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div class="flex-1">
                    <TangoInput v-model.number="newContribAmount" label="Add Contribution" type="number" placeholder="50" />
                </div>
                <div class="flex-1">
                    <TangoInput v-model="newContribNote" label="Note (optional)" placeholder="e.g. From bonus" />
                </div>
                <TangoButton @click="addContribution" :disabled="contribBusy" shadow="dark" size="sm">
                    {{ contribBusy ? 'Adding…' : 'Add' }}
                </TangoButton>
            </div>

            <div v-if="myContributions.length > 0" class="space-y-1 max-h-48 overflow-y-auto">
                <div
                    v-for="c in myContributions"
                    :key="c.id"
                    class="flex items-center justify-between px-3 py-2 bg-surface-variant pixel-border-sm text-label-sm"
                >
                    <div class="flex flex-col">
                        <span class="font-bold">
                            {{ whoIs(c.user_id) }} · ${{ Math.round(c.amount).toLocaleString() }}
                        </span>
                        <span v-if="c.note" class="text-on-surface-variant truncate">{{ c.note }}</span>
                        <span class="text-[10px] text-outline uppercase">{{ fmtDate(c.created_at) }}</span>
                    </div>
                    <button
                        v-if="c.user_id === auth.user?.id"
                        @click="removeContribution(c.id)"
                        class="material-symbols-outlined text-outline hover:text-error transition-colors text-sm"
                        aria-label="Remove contribution"
                    >delete</button>
                </div>
            </div>
            <p v-else class="text-label-sm text-on-surface-variant">No contributions yet. Add one above.</p>
        </div>
    </div>

    <template #footer>
      <TangoButton v-if="goalId" @click="deleteGoal" variant="outline" class="text-error border-error mr-auto" size="sm" aria-label="Delete goal">Delete</TangoButton>
      <TangoButton @click="emit('close')" variant="surface" size="sm" aria-label="Cancel">Cancel</TangoButton>
      <TangoButton @click="saveGoal" shadow="dark" size="sm" aria-label="Save Goal">SAVE GOAL</TangoButton>
    </template>
  </BaseModal>
</template>
