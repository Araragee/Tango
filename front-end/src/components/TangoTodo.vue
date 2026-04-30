<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { useAppStore, type Todo } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';
import AddNewTaskModal from './AddNewTaskModal.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: string) => void;

const newTaskText = ref('');
const showAddModal = ref(false);
const editingTask = ref<Todo | null>(null);
const filter = ref<'all' | 'active' | 'done'>('all');

const todayStr = new Date().toISOString().split('T')[0];

const priorityOrder: Record<string, number> = { ASAP: 0, Normal: 1, Chill: 2 };

const sortedTodos = computed(() =>
  [...store.todos.items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (priorityOrder[a.priority ?? 'Normal'] ?? 1) - (priorityOrder[b.priority ?? 'Normal'] ?? 1);
  })
);

const filteredTodos = computed(() => {
  if (filter.value === 'active') return sortedTodos.value.filter(t => !t.completed);
  if (filter.value === 'done') return sortedTodos.value.filter(t => t.completed);
  return sortedTodos.value;
});

const isOverdue = (todo: Todo) =>
  !todo.completed && !!todo.due_date && todo.due_date < todayStr;

const formatDueDate = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const openAddModal = () => {
  editingTask.value = null;
  showAddModal.value = true;
};

const openEditModal = (task: Todo) => {
  editingTask.value = task;
  showAddModal.value = true;
};

const quickAdd = async () => {
  if (!newTaskText.value.trim()) return;
  const text = newTaskText.value;
  newTaskText.value = '';
  try {
    await store.addTask({
      text,
      category: 'Quick Add',
      assigned: 'Both',
      priority: 'Normal',
    });
    notify('Task added!', 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to add task.', 'error');
    newTaskText.value = text;
  }
};

const activeCount = computed(() => store.todos.items.filter(t => !t.completed).length);
const doneCount = computed(() => store.todos.items.filter(t => t.completed).length);
</script>

<template>
  <div class="max-w-4xl mx-auto w-full flex flex-col gap-8">
    <!-- Phrase of the Day -->
    <TangoCard padding="lg" shadow="none" class="w-full pixel-border bg-surface hard-shadow-green relative overflow-hidden">
      <div class="absolute top-0 right-0 w-24 h-24 bg-dither opacity-50 border-l-2 border-b-2 border-on-surface"></div>
      <div class="flex items-center gap-2 mb-4 relative z-10">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">local_florist</span>
        <h2 class="text-label-sm text-secondary uppercase tracking-widest">Phrase of the Day</h2>
      </div>
      <p class="text-headline-md text-on-surface relative z-10">"Grow together, one pixel at a time."</p>
    </TangoCard>

    <!-- Task List -->
    <div class="flex flex-col gap-4 w-full">
      <div class="flex justify-between items-end mb-2 border-b-2 border-on-background pb-2 w-full">
        <h2 class="text-headline-lg text-on-surface">Shared To-Dos</h2>
        <span class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase whitespace-nowrap">
          {{ doneCount }} / {{ store.todos.items.length }}
        </span>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2">
        <button
          v-for="f in [['all', 'All'], ['active', 'Active'], ['done', 'Done']] as const"
          :key="f[0]"
          @click="filter = f[0]"
          class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
          :class="filter === f[0] ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
        >
          {{ f[1] }}
        </button>
      </div>

      <!-- Empty state -->
      <p v-if="filteredTodos.length === 0" class="text-body-md text-on-surface-variant py-8 text-center">
        {{ filter === 'done' ? 'Nothing completed yet.' : filter === 'active' ? 'All caught up!' : 'No tasks. Add one below.' }}
      </p>

      <!-- Task Items -->
      <div
        v-for="todo in filteredTodos"
        :key="todo.id"
        class="bg-surface pixel-border p-4 flex items-center gap-4 hard-shadow w-full group"
        :class="{ 'opacity-60': todo.completed }"
      >
        <!-- Checkbox -->
        <button
          class="w-6 h-6 sunken-input flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
          :class="{ 'bg-primary text-on-primary': todo.completed }"
          @click="store.toggleTodo(todo.id)"
          :aria-label="todo.completed ? 'Mark incomplete' : 'Mark complete'"
        >
          <span v-if="todo.completed" class="material-symbols-outlined text-[16px] font-bold">check</span>
        </button>

        <!-- Text content -->
        <div class="flex flex-col flex-grow min-w-0 cursor-pointer" @click="openEditModal(todo)">
          <span
            class="text-body-lg text-on-surface break-words"
            :class="{ 'text-on-surface-variant line-through': todo.completed }"
          >
            {{ todo.text }}
          </span>
          <div class="flex gap-2 items-center mt-1 flex-wrap">
            <span class="text-label-sm text-outline uppercase">{{ todo.assigned }}</span>
            <span v-if="todo.category && todo.category !== 'Quick Add'" class="text-label-sm text-outline uppercase">• {{ todo.category }}</span>
            <span
              v-if="todo.due_date"
              class="text-label-sm px-1.5 py-0.5 pixel-border-sm uppercase"
              :class="isOverdue(todo)
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-variant text-on-surface-variant'"
            >
              <span v-if="isOverdue(todo)" class="material-symbols-outlined text-[10px] mr-0.5" style="font-variation-settings: 'FILL' 1;">warning</span>
              {{ isOverdue(todo) ? 'Overdue · ' : 'Due · ' }}{{ formatDueDate(todo.due_date) }}
            </span>
          </div>
        </div>

        <!-- Right side badges + actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-if="todo.priority"
            class="pixel-border-sm text-label-sm px-3 py-1 uppercase"
            :class="{
              'bg-secondary-container text-on-secondary-container': todo.priority === 'Chill',
              'bg-primary-container text-on-primary-container': todo.priority === 'Normal',
              'bg-error-container text-on-error-container': todo.priority === 'ASAP'
            }"
          >
            {{ todo.priority }}
          </span>
          <button
            @click.stop="openEditModal(todo)"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all text-[18px]"
            aria-label="Edit task"
          >
            edit
          </button>
          <button
            @click.stop="store.deleteTask(todo.id)"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all text-[18px]"
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
        <TangoButton variant="outline" size="sm" class="uppercase" @click="openAddModal">
          <span class="material-symbols-outlined text-[16px]">tune</span>
          Detailed Add
        </TangoButton>
        <TangoButton @click="quickAdd" shadow="dark" size="md" class="uppercase w-full sm:w-auto" aria-label="Add Task">Add</TangoButton>
      </div>
    </TangoCard>

    <AddNewTaskModal :show="showAddModal" :task="editingTask" @close="showAddModal = false; editingTask = null" />
  </div>
</template>
