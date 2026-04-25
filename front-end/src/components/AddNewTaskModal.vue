<script setup lang="ts">
import { ref } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore } from '../stores/useStore';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);
const store = useAppStore();

const taskName = ref('');
const assignee = ref('Both');
const priority = ref('Normal');
const dueDate = ref('');
const error = ref('');

const saveTask = () => {
  if (!taskName.value.trim()) {
    error.value = 'Task name is required';
    return;
  }

  store.addTask({
    text: taskName.value,
    category: 'General',
    assigned: assignee.value,
    priority: priority.value as any,
    subtext: dueDate.value ? `Due: ${dueDate.value}` : undefined
  });

  taskName.value = '';
  error.value = '';
  emit('close');
};
</script>

<template>
  <BaseModal :show="show" title="New Task" max-width="max-w-xl" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <!-- Task Name Input -->
      <TangoInput v-model="taskName" label="Task Name" placeholder="e.g. Buy groceries..." :error="error" required />

      <!-- Assignee Selection -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Assign To</label>
        <div class="flex gap-4">
          <!-- Avatar 1 -->
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group" aria-label="Assign to Alex">
            <input v-model="assignee" class="sr-only" name="assignee" type="radio" value="Alex"/>
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-secondary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assignee === 'Alex' }"
            >
              <img alt="Alex" class="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXYXYtfKKfVgC8bz6fETu_-XDgkBy2IBZ_jK0a8i5DTHw6IRySgRbY6_KJ4HQOgh6NnBIKkVyBW51JKlQeSWpo--4K5GoRkbbEoMwudpFGePD54KrBEfKXYBOlppsSz9enU0RlH1RPJ0x60npvMbu3vbTd_lCo_6IPOIyo-nQYMaFsjRpObO-b8IKTa1RC713aYX9fAUN-ee7OIz_S-RlAHJQnWMktbZy_tIt_gQsZlEWaerlxq9h2TAqXcyhTz4miCHrMDyfJgyo"/>
            </div>
            <span class="text-label-sm" :class="assignee === 'Alex' ? 'text-primary' : 'text-on-surface-variant'">Alex</span>
          </label>
          <!-- Avatar 2 -->
          <label class="cursor-pointer relative flex flex-col items-center gap-xs group" aria-label="Assign to Sam">
            <input v-model="assignee" class="sr-only" name="assignee" type="radio" value="Sam"/>
            <div
              class="w-14 h-14 rounded-full pixel-border overflow-hidden bg-tertiary-container hard-shadow-dark transition-all"
              :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-none translate-x-[2px] translate-y-[2px]': assignee === 'Sam' }"
            >
              <img alt="Sam" class="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQVv5dSNsR5Hfg_YUe2GRHtjJHMEHEiQZWkOMZvefo9Uw4nxq9XY1yizfKd2hCbyXqC3kX1z-4hD16aJoMxVuGSUmO0gCArh0a95iwW-a5OZgsLkZEvxq8WLK_74iSauiCaoXN-9ac2moZB4A0RISahamtQgmUKYCArKwGYv-8h5epIx9q6IV2b74QGiAtBb6cRecKlQB6Rm_cKM7XKxGdQ-rAnqgQCMSPVdiazLY6Wl-FPfYwoIbfobHxUw28LvuGNkVsAIvar5c"/>
            </div>
            <span class="text-label-sm" :class="assignee === 'Sam' ? 'text-primary' : 'text-on-surface-variant'">Sam</span>
          </label>
          <!-- Both -->
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

      <!-- Priority Selection -->
      <div class="flex flex-col gap-2">
        <label class="text-label-sm text-on-surface-variant uppercase font-bold">Priority</label>
        <div class="grid grid-cols-3 gap-4">
          <label v-for="p in ['Chill', 'Normal', 'ASAP']" :key="p" class="cursor-pointer" :aria-label="'Set priority to ' + p">
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

      <!-- Date Picker -->
      <TangoInput v-model="dueDate" label="Due Date" type="date" />
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm" aria-label="Cancel">Cancel</TangoButton>
      <TangoButton @click="saveTask" shadow="dark" size="sm" aria-label="Save Task">SAVE TASK</TangoButton>
    </template>
  </BaseModal>
</template>
