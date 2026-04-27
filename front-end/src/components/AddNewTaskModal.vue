<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore, type Todo } from '../stores/useStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';

const props = defineProps<{ show: boolean; task?: Todo | null }>();
const emit = defineEmits(['close']);
const store = useAppStore();
const prefs = usePreferencesStore();

const taskName = ref('');
const category = ref('General');
const newCategory = ref('');
const assignee = ref('Both');
const priority = ref<'Chill' | 'Normal' | 'ASAP'>('Normal');
const dueDate = ref('');
const error = ref('');

const isEditing = () => !!props.task;

watch(() => props.show, (open) => {
  if (!open) return;
  error.value = '';
  if (props.task) {
    taskName.value = props.task.text;
    category.value = props.task.category;
    assignee.value = props.task.assigned ?? 'Both';
    priority.value = props.task.priority ?? 'Normal';
    dueDate.value = props.task.due_date ?? '';
  } else {
    taskName.value = '';
    category.value = 'General';
    assignee.value = 'Both';
    priority.value = 'Normal';
    dueDate.value = '';
  }
});

const saveTask = async () => {
  if (!taskName.value.trim()) {
    error.value = 'Task name is required';
    return;
  }

  try {
    const payload = {
      text: taskName.value,
      category: category.value,
      assigned: assignee.value,
      priority: priority.value,
      due_date: dueDate.value || undefined,
    };

    if (props.task) {
      await store.editTask(props.task.id, payload);
    } else {
      await store.addTask(payload);
    }

    emit('close');
  } catch (e: any) {
    error.value = e.message || 'Failed to save task';
  }
};
</script>

<template>
  <BaseModal :show="show" :title="isEditing() ? 'Edit Task' : 'New Task'" max-width="max-w-xl" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <TangoInput v-model="taskName" label="Task Name" placeholder="e.g. Buy groceries..." :error="error" required />

      <!-- Assignee -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Assign To</label>
        <div class="flex gap-4">
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group" :aria-label="'Assign to ' + store.partnerName">
            <input v-model="assignee" class="sr-only" name="assignee" type="radio" :value="store.partnerName"/>
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-secondary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assignee === store.partnerName }"
            >
              <div class="w-full h-full bg-secondary-container flex items-center justify-center text-headline-md font-bold text-on-secondary-container">
                {{ store.partnerName.charAt(0).toUpperCase() }}
              </div>
            </div>
            <span class="text-label-sm" :class="assignee === store.partnerName ? 'text-primary' : 'text-on-surface-variant'">{{ store.partnerName }}</span>
          </label>
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group" :aria-label="'Assign to ' + store.userName">
            <input v-model="assignee" class="sr-only" name="assignee" type="radio" :value="store.userName"/>
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-tertiary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assignee === store.userName }"
            >
              <div class="w-full h-full bg-tertiary-container flex items-center justify-center text-headline-md font-bold text-on-tertiary-container">
                {{ store.userName.charAt(0).toUpperCase() }}
              </div>
            </div>
            <span class="text-label-sm" :class="assignee === store.userName ? 'text-primary' : 'text-on-surface-variant'">{{ store.userName }}</span>
          </label>
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group" aria-label="Assign to Both">
            <input v-model="assignee" class="sr-only" name="assignee" type="radio" value="Both"/>
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-surface-variant flex items-center justify-center hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assignee === 'Both' }"
            >
              <span class="material-symbols-outlined text-on-surface-variant text-2xl">group</span>
            </div>
            <span class="text-label-sm" :class="assignee === 'Both' ? 'text-primary' : 'text-on-surface-variant'">Both</span>
          </label>
        </div>
      </div>

      <!-- Priority -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Priority</label>
        <div class="grid grid-cols-3 gap-4">
          <label v-for="p in (['Chill', 'Normal', 'ASAP'] as const)" :key="p" class="cursor-pointer" :aria-label="'Set priority to ' + p">
            <input v-model="priority" class="sr-only peer" name="priority" type="radio" :value="p"/>
            <div
              class="pixel-border bg-surface text-on-surface text-center py-2 text-label-sm uppercase hard-shadow-dark transition-all hover:bg-surface-variant"
              :class="{
                'bg-secondary-container shadow-none translate-x-[2px] translate-y-[2px]': priority === p && p === 'Chill',
                'bg-primary-fixed shadow-none translate-x-[2px] translate-y-[2px]': priority === p && p === 'Normal',
                'bg-error-container text-on-error-container shadow-none translate-x-[2px] translate-y-[2px]': priority === p && p === 'ASAP',
              }"
            >
              {{ p }}
            </div>
          </label>
        </div>
      </div>

      <!-- Category picker -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Category</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="cat in prefs.todoCategories" :key="cat"
            @click="category = cat"
            class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
            :class="category === cat ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
          >{{ cat }}</button>
        </div>
        <div class="flex gap-2 mt-1">
          <TangoInput v-model="newCategory" placeholder="Add category..." class="flex-1"
            @keyup.enter="() => { prefs.addTodoCategory(newCategory); category = newCategory.trim(); newCategory = ''; }" />
          <TangoButton size="sm" variant="outline"
            @click="() => { prefs.addTodoCategory(newCategory); category = newCategory.trim(); newCategory = ''; }"
            aria-label="Add category">+</TangoButton>
        </div>
      </div>

      <TangoInput v-model="dueDate" label="Due Date (Optional)" type="date" />
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm" aria-label="Cancel">Cancel</TangoButton>
      <TangoButton @click="saveTask" shadow="dark" size="sm" :aria-label="isEditing() ? 'Save Changes' : 'Save Task'">
        {{ isEditing() ? 'SAVE CHANGES' : 'SAVE TASK' }}
      </TangoButton>
    </template>
  </BaseModal>
</template>
