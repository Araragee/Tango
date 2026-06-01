<script setup lang="ts">
import { ref, inject, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore, type Todo, type ChecklistItem } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { useNotificationsStore } from '../stores/useNotificationsStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';
import AddNewTaskModal from './AddNewTaskModal.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import EmptyState from './EmptyState.vue';
import { localDateISO } from '../utils/dateUtils';

const store = useAppStore();
const auth = useAuthStore();
const household = useHouseholdStore();
const notificationsStore = useNotificationsStore();
const notify = inject('notify') as (msg: string, type?: string) => void;

const newTaskText = ref('');
const newShoppingItem = ref('');
const showAddModal = ref(false);
const editingTask = ref<Todo | null>(null);
const filter = ref<'all' | 'active' | 'done'>('all');
const viewMode = ref<'tasks' | 'shopping'>('tasks');

const SHOPPING_CATEGORIES = new Set(['Shopping', 'Grocery', 'Groceries']);

const shoppingItems = computed(() =>
  [...store.todos.items]
    .filter(t => SHOPPING_CATEGORIES.has(t.category))
    .sort((a, b) => Number(a.completed) - Number(b.completed))
);

const quickAddShopping = async () => {
  if (!newShoppingItem.value.trim()) return;
  const text = newShoppingItem.value;
  newShoppingItem.value = '';
  try {
    await store.addTask({
      text,
      category: 'Shopping',
      assigned: 'both',
      assignee_id: null,
      priority: 'Normal',
    });
  } catch (e: any) {
    notify(e.message ?? 'Failed to add item.', 'error');
    newShoppingItem.value = text;
  }
};

// todayStr must stay reactive — if the app is left open past midnight the
// static string becomes stale and overdue badges stop updating correctly.
// Refresh on visibilitychange so it corrects the moment the user returns to
// the tab on a new day. (I15)
// Use localDateISO (local calendar date) not toISOString (UTC) — see dateUtils.ts. (B-UTC)
const todayStr = ref(localDateISO());
const _refreshToday = () => { if (document.visibilityState === 'visible') todayStr.value = localDateISO(); };
onMounted(() => document.addEventListener('visibilitychange', _refreshToday));
onUnmounted(() => document.removeEventListener('visibilitychange', _refreshToday));

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
  !todo.completed && !!todo.due_date && todo.due_date < todayStr.value;

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
      assigned: 'both',
      assignee_id: null,
      priority: 'Normal',
    });
    notify('Task added!', 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to add task.', 'error');
    newTaskText.value = text;
  }
};

const doneCount = computed(() => store.todos.items.filter(t => t.completed).length);

// toggleTodo is async — wrap it so version-conflict and network errors surface
// as toast notifications rather than being silently swallowed. (I6)
const toggleTodo = async (id: string) => {
  try {
    await store.toggleTodo(id);
  } catch (e: any) {
    notify(e.message ?? 'Failed to update task.', 'error');
  }
};

const handoff = async (todo: Todo) => {
  const me = auth.user?.id ?? null;
  const partnerId = household.partner?.user_id ?? null;
  const cur = todo.assignee_id ?? null;

  let nextId: string | null;
  let nextLabel: 'me' | 'partner' | 'both';
  if (cur === me)              { nextId = partnerId; nextLabel = 'partner'; }
  else if (cur === partnerId)  { nextId = null;       nextLabel = 'both';    }
  else                         { nextId = me;         nextLabel = 'me';      }

  if (nextId === null && nextLabel !== 'both') return;
  if (!partnerId && !me) return;

  try {
    await store.editTask(todo.id, {
      assignee_id: nextId,
      assigned: nextLabel,
    });
    const displayName = nextLabel === 'both' ? 'Both' : (nextLabel === 'me' ? store.userName : store.partnerName);
    notify(nextLabel === 'both' ? 'Handed off to both.' : `Handed off to ${displayName}.`, 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to hand off.', 'error');
  }
};

const toggleChecklistItem = async (todo: Todo, itemId: string) => {
  const updated = (todo.checklist ?? []).map((item: ChecklistItem) =>
    item.id === itemId ? { ...item, completed: !item.completed } : item
  );
  try {
    await store.editTask(todo.id, { checklist: updated });
  } catch (e: any) {
    notify(e.message ?? 'Failed to update checklist.', 'error');
  }
};

const checklistProgress = (todo: Todo) => {
  const items = todo.checklist ?? [];
  if (!items.length) return null;
  return { done: items.filter((i: ChecklistItem) => i.completed).length, total: items.length };
};

const nudging = ref<string | null>(null);
const nudgePartner = async (todo: Todo) => {
  if (!household.partner) return;
  nudging.value = todo.id;
  try {
    await notificationsStore.nudgePartnerTodo(todo.id);
    notify(`${store.partnerName} nudged about "${todo.text}"`, 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to nudge partner.', 'error');
  } finally {
    nudging.value = null;
  }
};

const confirmDelete = async (todo: Todo) => {
  if (!confirm(`Delete "${todo.text}"? This cannot be undone.`)) return;
  try {
    await store.deleteTask(todo.id);
    notify('Task deleted.', 'success');
  } catch (e: any) {
    notify(e.message ?? 'Failed to delete task.', 'error');
  }
};

const assigneeLabel = (todo: Todo): string => {
  if (todo.assignee_id) {
    if (todo.assignee_id === auth.user?.id) return store.userName;
    if (todo.assignee_id === household.partner?.user_id) return store.partnerName;
  }
  if (todo.assigned === 'me') return store.userName;
  if (todo.assigned === 'partner') return store.partnerName;
  const a = todo.assigned ?? 'Both';
  return a.charAt(0).toUpperCase() + a.slice(1);
};

// Rotate through a fixed set of phrases keyed by the calendar day, so both
// partners see the same phrase each day without any server round-trip. (I13)
const DAILY_PHRASES = [
  'Grow together, one pixel at a time.',
  'Small steps every day keep the goals in play.',
  'The best teams check in, not just check off.',
  'Progress is a team sport.',
  'A shared goal is already half complete.',
  'Two minds, one mission, zero excuses.',
  'Kindness is the best productivity hack.',
  'Check it off — then celebrate the small wins.',
  'You don\'t have to do everything, just your part.',
  'Good partnerships run on honesty and to-do lists.',
  'Today\'s tasks are tomorrow\'s peace of mind.',
  'Done is better than perfect — especially together.',
  'Great things happen when you show up for each other.',
  'Be the teammate you\'d want to have.',
  'Every pixel matters. So does every effort.',
];

const phraseOfTheDay = computed(() => {
  // Use a deterministic seed derived from today's date so both partners
  // land on the same phrase on the same day.
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return DAILY_PHRASES[seed % DAILY_PHRASES.length];
});
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
      <p class="text-headline-md text-on-surface relative z-10">"{{ phraseOfTheDay }}"</p>
    </TangoCard>

    <!-- View Mode Tabs -->
    <div class="flex gap-2 flex-wrap border-b-2 border-on-background pb-2">
      <button
        @click="viewMode = 'tasks'"
        class="px-4 py-2 pixel-border-sm text-label-sm uppercase transition-colors flex items-center gap-2"
        :class="viewMode === 'tasks' ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
      >
        <span class="material-symbols-outlined text-[16px]">checklist_rtl</span>
        To-Dos
      </button>
      <button
        @click="viewMode = 'shopping'"
        class="px-4 py-2 pixel-border-sm text-label-sm uppercase transition-colors flex items-center gap-2"
        :class="viewMode === 'shopping' ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
      >
        <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
        Shopping
        <span v-if="shoppingItems.filter(i => !i.completed).length > 0"
          class="text-[10px] px-1.5 py-0.5 pixel-border-sm"
          :class="viewMode === 'shopping' ? 'bg-on-primary text-primary' : 'bg-primary text-on-primary'"
        >{{ shoppingItems.filter(i => !i.completed).length }}</span>
      </button>
    </div>

    <!-- ── SHOPPING LIST ── -->
    <div v-if="viewMode === 'shopping'" class="flex flex-col gap-4 w-full">
      <div class="flex justify-between items-center">
        <h2 class="text-headline-lg text-on-surface">Shopping List</h2>
        <span class="text-label-sm text-on-surface-variant uppercase">{{ shoppingItems.filter(i => !i.completed).length }} left</span>
      </div>

      <div class="flex gap-2 flex-wrap">
        <TangoInput v-model="newShoppingItem" placeholder="Add item..." class="flex-1" @keyup.enter="quickAddShopping" />
        <TangoButton @click="quickAddShopping" shadow="dark" size="sm">Add</TangoButton>
      </div>

      <EmptyState
        v-if="shoppingItems.length === 0"
        icon="shopping_cart"
        title="List is empty"
        description="Add items above. Tasks with 'Shopping' or 'Grocery' category appear here."
      />

      <div
        v-for="item in shoppingItems"
        :key="item.id"
        class="bg-surface pixel-border p-4 flex items-center gap-4 group"
        :class="{ 'opacity-50': item.completed }"
      >
        <button
          class="w-6 h-6 sunken-input flex items-center justify-center flex-shrink-0 cursor-pointer"
          :class="{ 'bg-primary text-on-primary': item.completed }"
          @click="toggleTodo(item.id)"
        >
          <span v-if="item.completed" class="material-symbols-outlined text-[16px]">check</span>
        </button>
        <span class="flex-grow text-body-lg" :class="{ 'line-through text-on-surface-variant': item.completed }">{{ item.text }}</span>
        <button
          @click.stop="confirmDelete(item)"
          class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-error text-[18px] flex-shrink-0"
        >delete</button>
      </div>
    </div>

    <!-- ── TASK LIST ── -->
    <div v-else class="flex flex-col gap-4 w-full">
      <div class="flex justify-between items-end mb-2 border-b-2 border-on-background pb-2 w-full">
        <h2 class="text-headline-lg text-on-surface">Shared To-Dos</h2>
        <span class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase whitespace-nowrap">
          {{ doneCount }} / {{ store.todos.items.length }}
        </span>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2 flex-wrap">
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

      <!-- Loading skeleton -->
      <div v-if="store.loading" class="space-y-3">
        <div v-for="n in 3" :key="n" class="bg-surface pixel-border p-4 flex items-center gap-4">
          <SkeletonBlock width="1.5rem" height="1.5rem" />
          <div class="flex-1 space-y-2">
            <SkeletonBlock height="0.875rem" width="55%" />
            <SkeletonBlock height="0.75rem" width="30%" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else-if="filteredTodos.length === 0"
        :icon="filter === 'done' ? 'check_circle' : filter === 'active' ? 'celebration' : 'checklist'"
        :title="filter === 'done' ? 'Nothing completed yet' : filter === 'active' ? 'All caught up!' : 'No tasks yet'"
        :description="filter === 'done' ? 'Finish a task to see it here.' : filter === 'active' ? 'Great work!' : 'Add a task to get started.'"
      />

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
          @click="toggleTodo(todo.id)"
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
          <div class="flex gap-2 flex-wrap items-center mt-1 flex-wrap">
            <span class="text-label-sm text-outline uppercase">{{ assigneeLabel(todo) }}</span>
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
            <span
              v-if="todo.recurrence && todo.recurrence !== 'none'"
              class="text-label-sm px-1.5 py-0.5 pixel-border-sm uppercase bg-tertiary-container text-on-tertiary-container flex items-center gap-0.5"
            >
              <span class="material-symbols-outlined text-[10px]">repeat</span>
              {{ todo.recurrence }}
            </span>
          </div>

          <!-- Inline checklist -->
          <div
            v-if="todo.checklist && todo.checklist.length > 0"
            class="mt-2 flex flex-col gap-1"
            @click.stop
          >
            <div
              v-for="item in todo.checklist"
              :key="item.id"
              class="flex items-center gap-2 cursor-pointer"
              @click="toggleChecklistItem(todo, item.id)"
            >
              <span
                class="material-symbols-outlined text-[14px] flex-shrink-0 transition-colors"
                :class="item.completed ? 'text-primary' : 'text-outline'"
                style="font-variation-settings: 'FILL' 1;"
              >{{ item.completed ? 'check_box' : 'check_box_outline_blank' }}</span>
              <span
                class="text-label-sm"
                :class="item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'"
              >{{ item.text }}</span>
            </div>
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
          <span
            v-if="checklistProgress(todo)"
            class="pixel-border-sm text-label-sm px-2 py-1 uppercase flex items-center gap-1"
            :class="checklistProgress(todo)!.done === checklistProgress(todo)!.total
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-variant text-on-surface-variant'"
            :title="`${checklistProgress(todo)!.done}/${checklistProgress(todo)!.total} checklist items done`"
          >
            <span class="material-symbols-outlined text-[10px]">checklist</span>
            {{ checklistProgress(todo)!.done }}/{{ checklistProgress(todo)!.total }}
          </span>
          <button
            @click.stop="handoff(todo)"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all text-[18px]"
            aria-label="Hand off task"
            title="Hand off to partner / cycle assignee"
          >
            swap_horiz
          </button>
          <button
            v-if="household.partner && !todo.completed"
            @click.stop="nudgePartner(todo)"
            :disabled="nudging === todo.id"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-secondary transition-all text-[18px]"
            aria-label="Nudge partner"
            title="Remind partner about this task"
          >
            {{ nudging === todo.id ? 'hourglass_empty' : 'notifications_active' }}
          </button>
          <button
            @click.stop="openEditModal(todo)"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all text-[18px]"
            aria-label="Edit task"
          >
            edit
          </button>
          <button
            @click.stop="confirmDelete(todo)"
            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all text-[18px]"
            aria-label="Delete task"
          >
            delete
          </button>
        </div>
      </div>
    </div>

    <!-- Add Task Area — tasks mode only -->
    <TangoCard v-if="viewMode === 'tasks'" padding="lg" shadow="default" class="w-full">
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
