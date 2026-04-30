<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useStore';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);
const store = useAppStore();
const router = useRouter();

const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.show, async (open) => {
  if (open) {
    query.value = '';
    selectedIndex.value = 0;
    await nextTick();
    inputRef.value?.focus();
  }
});

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
}

const results = computed<SearchResult[]>(() => {
  const q = query.value.toLowerCase().trim();
  if (q.length < 2) return [];

  const todos = store.todos.items
    .filter(t => t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .slice(0, 4)
    .map(t => ({
      type: 'Task', id: t.id,
      title: t.text,
      subtitle: `${t.category} · ${t.priority ?? 'Normal'}${t.due_date ? ' · Due ' + t.due_date : ''}`,
      icon: t.completed ? 'check_circle' : 'radio_button_unchecked',
      route: '/app/todos',
    }));

  const events = store.calendar.events
    .filter(e => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    .slice(0, 4)
    .map(e => ({
      type: 'Event', id: e.id,
      title: e.title,
      subtitle: `${e.date}${e.time !== 'All Day' ? ' · ' + e.time : ''}`,
      icon: e.icon,
      route: '/app/calendar',
    }));

  const transactions = store.budget.recentActivity
    .filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .slice(0, 4)
    .map(t => ({
      type: 'Transaction', id: t.id,
      title: t.title,
      subtitle: `${t.category} · ${t.amount < 0 ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)}`,
      icon: t.icon,
      route: '/app/budget',
    }));

  const goals = store.plans.goals
    .filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    .slice(0, 4)
    .map(g => ({
      type: 'Goal', id: g.id,
      title: g.title,
      subtitle: `${g.progress}% · ${g.status}`,
      icon: g.icon,
      route: '/app/plans',
    }));

  return [...todos, ...events, ...transactions, ...goals];
});

watch(results, () => { selectedIndex.value = 0; });

const navigate = (dir: 1 | -1) => {
  selectedIndex.value = Math.max(0, Math.min(results.value.length - 1, selectedIndex.value + dir));
};

const selectResult = (r?: SearchResult) => {
  const target = r ?? results.value[selectedIndex.value];
  if (!target) return;
  router.push(target.route);
  emit('close');
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
  else if (e.key === 'Enter') selectResult();
  else if (e.key === 'Escape') emit('close');
};

const typeColors: Record<string, string> = {
  Task: 'bg-primary-container text-on-primary-container',
  Event: 'bg-secondary-container text-on-secondary-container',
  Transaction: 'bg-tertiary-container text-on-tertiary-container',
  Goal: 'bg-surface-variant text-on-surface-variant',
};
</script>

<template>
  <Transition name="search-fade">
    <div v-if="show" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" @click.self="emit('close')">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')"></div>

      <!-- Search panel -->
      <div class="relative z-10 w-full max-w-xl bg-surface pixel-border shadow-2xl flex flex-col overflow-hidden">
        <!-- Input -->
        <div class="flex items-center gap-3 px-4 py-3 border-b-2 border-on-surface">
          <span class="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            ref="inputRef"
            v-model="query"
            @keydown="onKeydown"
            placeholder="Search tasks, events, transactions, goals..."
            class="flex-1 bg-transparent outline-none text-body-lg text-on-surface placeholder-on-surface-variant"
          />
          <button @click="emit('close')" class="text-label-sm text-on-surface-variant uppercase px-2 py-1 pixel-border-sm hover:bg-surface-variant">
            ESC
          </button>
        </div>

        <!-- Results -->
        <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div v-if="query.length < 2" class="px-4 py-8 text-center text-on-surface-variant text-body-md">
            Type at least 2 characters to search
          </div>
          <div v-else-if="results.length === 0" class="px-4 py-8 text-center text-on-surface-variant text-body-md">
            No results for "{{ query }}"
          </div>
          <button
            v-for="(result, i) in results"
            :key="result.id + result.type"
            @click="selectResult(result)"
            @mouseenter="selectedIndex = i"
            class="w-full flex items-center gap-4 px-4 py-3 border-b border-surface-variant transition-colors text-left"
            :class="selectedIndex === i ? 'bg-primary-container' : 'hover:bg-surface-variant'"
          >
            <span class="material-symbols-outlined text-primary shrink-0">{{ result.icon }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-body-md font-bold text-on-surface truncate">{{ result.title }}</div>
              <div class="text-label-sm text-on-surface-variant truncate">{{ result.subtitle }}</div>
            </div>
            <span class="text-label-sm px-2 py-0.5 pixel-border-sm shrink-0" :class="typeColors[result.type]">
              {{ result.type }}
            </span>
          </button>
        </div>

        <!-- Footer hint -->
        <div v-if="results.length > 0" class="px-4 py-2 border-t border-surface-variant bg-surface-container-low flex gap-4 text-label-sm text-on-surface-variant">
          <span><kbd class="px-1 pixel-border-sm">↑↓</kbd> navigate</span>
          <span><kbd class="px-1 pixel-border-sm">↵</kbd> open</span>
          <span><kbd class="px-1 pixel-border-sm">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.15s ease;
}
.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>
