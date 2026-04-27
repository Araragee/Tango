<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore, type Goal } from '../stores/useStore';

const props = defineProps<{
    show: boolean;
    goalId?: string | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();

const title = ref('');
const description = ref('');
const saved = ref(0);
const target = ref(0);
const icon = ref('flag');
const deadline = ref('');
const errors = ref({ title: '', target: '' });

watch(() => props.goalId, (newId) => {
    if (newId) {
        const goal = store.plans.goals.find((g: Goal) => g.id === newId);
        if (goal) {
            title.value = goal.title;
            description.value = goal.description;
            saved.value = goal.saved;
            target.value = goal.target;
            icon.value = goal.icon;
            deadline.value = goal.deadline ?? '';
        }
    } else {
        title.value = '';
        description.value = '';
        saved.value = 0;
        target.value = 0;
        icon.value = 'flag';
        deadline.value = '';
    }
    errors.value = { title: '', target: '' };
}, { immediate: true });

const deleteGoal = async () => {
  if (!props.goalId) return;
  if (!confirm('Delete this goal? This cannot be undone.')) return;
  try {
    await store.deleteGoal(props.goalId);
    emit('close');
  } catch (e: any) {
    alert('Failed to delete goal: ' + (e.message || 'Unknown error'));
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
              saved: saved.value,
              target: target.value,
              icon: icon.value,
              deadline: deadline.value || undefined
          });
      } else {
          await store.addGoal({
              title: title.value,
              description: description.value,
              saved: saved.value,
              target: target.value,
              icon: icon.value,
              deadline: deadline.value || undefined
          });
      }
      emit('close');
    } catch (e: any) {
      alert('Failed to save goal: ' + (e.message || 'Unknown error'));
    }
};
</script>

<template>
  <BaseModal :show="show" :title="goalId ? 'Edit Goal' : 'New Goal'" @close="emit('close')">
    <div class="flex flex-col gap-6">
        <TangoInput v-model="title" label="Goal Title" placeholder="e.g. Dream House" :error="errors.title" required />
        <TangoInput v-model="description" label="Description" placeholder="Why are we saving?" />

        <div class="grid grid-cols-2 gap-4">
            <TangoInput v-model.number="saved" label="Currently Saved" type="number" />
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

        <TangoInput v-model="deadline" label="Target Date (Optional)" type="date" />
    </div>

    <template #footer>
      <TangoButton v-if="goalId" @click="deleteGoal" variant="outline" class="text-error border-error mr-auto" size="sm" aria-label="Delete goal">Delete</TangoButton>
      <TangoButton @click="emit('close')" variant="surface" size="sm" aria-label="Cancel">Cancel</TangoButton>
      <TangoButton @click="saveGoal" shadow="dark" size="sm" aria-label="Save Goal">SAVE GOAL</TangoButton>
    </template>
  </BaseModal>
</template>
