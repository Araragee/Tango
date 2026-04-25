<script setup lang="ts">
import { ref, inject } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';
import AddNewTaskModal from './AddNewTaskModal.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: string) => void;

const newTaskText = ref('');
const showAddModal = ref(false);

const quickAdd = () => {
    if (!newTaskText.value) return;
    store.addTask({
        text: newTaskText.value,
        category: 'Quick Add',
        assigned: 'Both',
        priority: 'Normal'
    });
    newTaskText.value = '';
    notify('Task added!', 'success');
};
</script>

<template>
  <div class="max-w-2xl mx-auto w-full flex flex-col gap-8">
    <!-- Phrase of the Day Card -->
    <TangoCard padding="lg" shadow="none" class="w-full pixel-border bg-surface hard-shadow-green relative overflow-hidden">
      <div class="absolute top-0 right-0 w-24 h-24 bg-dither opacity-50 border-l-2 border-b-2 border-on-surface"></div>
      <div class="flex items-center gap-2 mb-4 relative z-10">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">local_florist</span>
        <h2 class="text-label-sm text-secondary uppercase tracking-widest">Phrase of the Day</h2>
      </div>
      <p class="text-headline-md text-on-surface relative z-10">"Grow together, one pixel at a time."</p>
    </TangoCard>

    <!-- Task List Container -->
    <div class="flex flex-col gap-4 w-full">
      <div class="flex justify-between items-end mb-2 border-b-2 border-on-background pb-2 w-full">
        <h2 class="text-headline-lg text-on-surface">Shared To-Dos</h2>
        <span class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase whitespace-nowrap">
            {{ store.todos.items.filter(t => t.completed).length }} / {{ store.todos.items.length }}
        </span>
      </div>
      
      <!-- Task Items -->
      <div
        v-for="todo in store.todos.items"
        :key="todo.id"
        class="bg-surface pixel-border p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-container-low transition-colors hard-shadow w-full group"
        @click="store.toggleTodo(todo.id)"
      >
        <div 
          class="w-6 h-6 sunken-input flex items-center justify-center flex-shrink-0"
          :class="{ 'bg-primary text-on-primary': todo.completed }"
        >
          <span v-if="todo.completed" class="material-symbols-outlined text-[16px] font-bold">check</span>
        </div>
        <div class="flex flex-col flex-grow min-w-0">
          <span 
            class="text-body-lg text-on-surface break-words"
            :class="{ 'text-on-surface-variant line-through': todo.completed }"
          >
            {{ todo.text }}
          </span>
          <div class="flex gap-2 items-center mt-1">
              <span class="text-label-sm text-outline uppercase">Assigned: {{ todo.assigned }}</span>
              <span v-if="todo.subtext" class="text-label-sm text-outline uppercase">• {{ todo.subtext }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
            <span
              v-if="todo.priority"
              class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase flex-shrink-0"
              :class="{
                  'bg-secondary-container text-on-secondary-container': todo.priority === 'Chill',
                  'bg-error-container text-on-error-container': todo.priority === 'ASAP'
              }"
            >
              {{ todo.priority }}
            </span>
            <button
                @click.stop="store.deleteTask(todo.id)"
                class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                aria-label="Delete task"
            >
                delete
            </button>
        </div>
      </div>
    </div>

    <!-- Add Task Area -->
    <TangoCard padding="lg" shadow="default" class="w-full">
      <TangoInput v-model="newTaskText" label="Quick Add Task" placeholder="What needs doing?" class="w-full" @keyup.enter="quickAdd" />
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 gap-4">
        <TangoButton variant="outline" size="sm" class="uppercase" @click="showAddModal = true">
            <span class="material-symbols-outlined text-[16px]">tune</span>
            Detailed Add
        </TangoButton>
        <TangoButton @click="quickAdd" shadow="dark" size="md" class="uppercase w-full sm:w-auto" aria-label="Add Task">Add</TangoButton>
      </div>
    </TangoCard>

    <AddNewTaskModal :show="showAddModal" @close="showAddModal = false" />
  </div>
</template>
