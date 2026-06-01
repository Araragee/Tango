<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore, type Todo, type ChecklistItem } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';

const props = defineProps<{ show: boolean; task?: Todo | null }>();
const emit = defineEmits(['close']);
const store = useAppStore();
const auth = useAuthStore();
const household = useHouseholdStore();
const prefs = usePreferencesStore();

type AssigneeKey = 'me' | 'partner' | 'both';

const taskName = ref('');
const category = ref('General');
const newCategory = ref('');
const assigneeKey = ref<AssigneeKey>('both');
const priority = ref<'Chill' | 'Normal' | 'ASAP'>('Normal');
const dueDate = ref('');
const recurrence = ref<'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('none');
const checklistItems = ref<ChecklistItem[]>([]);
const newChecklistText = ref('');
const error = ref('');

const isEditing = computed(() => !!props.task);

const resolveKey = (todo: Todo | null | undefined): AssigneeKey => {
    if (!todo) return 'both';
    if (todo.assignee_id === auth.user?.id) return 'me';
    if (todo.assignee_id === household.partner?.user_id) return 'partner';
    if (todo.assigned === 'me') return 'me';
    if (todo.assigned === 'partner') return 'partner';
    if (todo.assigned === store.userName) return 'me';
    if (todo.assigned === store.partnerName) return 'partner';
    return 'both';
};

const assigneeIdFor = (key: AssigneeKey): string | null => {
    if (key === 'me') return auth.user?.id ?? null;
    if (key === 'partner') return household.partner?.user_id ?? null;
    return null;
};

const assigneeLabelFor = (key: AssigneeKey): string => {
    if (key === 'me') return store.userName;
    if (key === 'partner') return store.partnerName;
    return 'Both';
};

watch(() => props.show, (open) => {
  if (!open) return;
  error.value = '';
  newChecklistText.value = '';
  if (props.task) {
    taskName.value = props.task.text;
    category.value = props.task.category;
    assigneeKey.value = resolveKey(props.task);
    priority.value = props.task.priority ?? 'Normal';
    dueDate.value = props.task.due_date ?? '';
    recurrence.value = (props.task.recurrence as any) ?? 'none';
    checklistItems.value = (props.task.checklist ?? []).map(i => ({ ...i }));
  } else {
    taskName.value = '';
    category.value = 'General';
    assigneeKey.value = prefs.defaultTodoAssignee;
    priority.value = 'Normal';
    dueDate.value = '';
    recurrence.value = 'none';
    checklistItems.value = [];
  }
});

const addChecklistItem = () => {
  const text = newChecklistText.value.trim();
  if (!text) return;
  checklistItems.value.push({ id: crypto.randomUUID(), text, completed: false });
  newChecklistText.value = '';
};

const removeChecklistItem = (id: string) => {
  checklistItems.value = checklistItems.value.filter(i => i.id !== id);
};

const saveTask = async () => {
  if (!taskName.value.trim()) {
    error.value = 'Task name is required';
    return;
  }

  try {
    const payload = {
      text: taskName.value,
      category: category.value,
      assigned: assigneeKey.value,
      assignee_id: assigneeIdFor(assigneeKey.value),
      priority: priority.value,
      due_date: dueDate.value || null,
      recurrence: recurrence.value === 'none' ? null : recurrence.value,
      recurrence_next_at: null,
      checklist: checklistItems.value,
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
  <BaseModal :show="show" :title="isEditing ? 'Edit Task' : 'New Task'" max-width="max-w-xl" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <TangoInput v-model="taskName" label="Task Name" placeholder="e.g. Buy groceries..." :error="error" required />

      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Assign To</label>
        <div class="flex flex-wrap gap-4">
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group">
            <input v-model="assigneeKey" class="sr-only" name="assigneeKey" type="radio" value="me" />
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-tertiary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assigneeKey === 'me' }"
            >
              <div class="w-full h-full flex items-center justify-center text-headline-md font-bold text-on-tertiary-container">
                {{ store.userName.charAt(0).toUpperCase() }}
              </div>
            </div>
            <span class="text-label-sm" :class="assigneeKey === 'me' ? 'text-primary' : 'text-on-surface-variant'">{{ store.userName }}</span>
          </label>

          <label v-if="household.partner" class="cursor-pointer relative flex flex-col items-center gap-xs group">
            <input v-model="assigneeKey" class="sr-only" name="assigneeKey" type="radio" value="partner" />
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-secondary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assigneeKey === 'partner' }"
            >
              <div class="w-full h-full flex items-center justify-center text-headline-md font-bold text-on-secondary-container">
                {{ store.partnerName.charAt(0).toUpperCase() }}
              </div>
            </div>
            <span class="text-label-sm" :class="assigneeKey === 'partner' ? 'text-primary' : 'text-on-surface-variant'">{{ store.partnerName }}</span>
          </label>

          <label class="cursor-pointer relative flex flex-col items-center gap-xs group">
            <input v-model="assigneeKey" class="sr-only" name="assigneeKey" type="radio" value="both" />
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-surface-variant flex items-center justify-center hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assigneeKey === 'both' }"
            >
              <span class="material-symbols-outlined text-on-surface-variant text-2xl">group</span>
            </div>
            <span class="text-label-sm" :class="assigneeKey === 'both' ? 'text-primary' : 'text-on-surface-variant'">Both</span>
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Priority</label>
        <div class="grid grid-cols-3 gap-4">
          <label v-for="p in (['Chill', 'Normal', 'ASAP'] as const)" :key="p" class="cursor-pointer">
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
        <div class="flex justify-between gap-2 flex-wrap mt-1">
          <TangoInput v-model="newCategory" placeholder="Add category..." class="flex-1"
            @keyup.enter="() => { if (!newCategory.trim()) return; prefs.addTodoCategory(newCategory); category = newCategory.trim(); newCategory = ''; }" />
          <TangoButton size="sm" variant="outline"
            @click="() => { if (!newCategory.trim()) return; prefs.addTodoCategory(newCategory); category = newCategory.trim(); newCategory = ''; }"
            aria-label="Add category">+</TangoButton>
        </div>
      </div>

      <TangoInput v-model="dueDate" label="Due Date (Optional)" type="date" />

      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Repeats</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="r in (['none', 'daily', 'weekly', 'biweekly', 'monthly'] as const)"
            :key="r"
            @click="recurrence = r"
            class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
            :class="recurrence === r ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
          >{{ r === 'none' ? 'Never' : r }}</button>
        </div>
        <p v-if="recurrence !== 'none'" class="text-[10px] uppercase text-on-surface-variant">
          New task auto-created when this one is completed
        </p>
      </div>

      <!-- Checklist / subtasks -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Checklist</label>
        <div v-if="checklistItems.length > 0" class="flex flex-col gap-1 mb-1">
          <div
            v-for="item in checklistItems"
            :key="item.id"
            class="flex items-center gap-2 px-3 py-1.5 bg-surface-variant pixel-border-sm"
          >
            <span class="material-symbols-outlined text-outline text-[14px]">check_box_outline_blank</span>
            <span class="flex-1 text-body-md">{{ item.text }}</span>
            <button
              @click="removeChecklistItem(item.id)"
              class="material-symbols-outlined text-outline hover:text-error text-[14px]"
              aria-label="Remove checklist item"
            >close</button>
          </div>
        </div>
        <div class="flex justify-between gap-2 flex-wrap">
          <TangoInput
            v-model="newChecklistText"
            placeholder="Add checklist item..."
            class="flex-1"
            @keyup.enter="addChecklistItem"
          />
          <TangoButton size="sm" variant="outline" @click="addChecklistItem" aria-label="Add item">+</TangoButton>
        </div>
      </div>
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="saveTask" shadow="dark" size="sm">
        {{ isEditing ? 'SAVE CHANGES' : 'SAVE TASK' }}
      </TangoButton>
    </template>
  </BaseModal>
</template>
