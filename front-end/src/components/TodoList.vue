<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '../stores/useStore';
import BaseCard from './Base/BaseCard.vue';
import BaseIcon from './Base/BaseIcon.vue';

const store = useAppStore();

const groupedTodos = computed(() => {
  const groups: Record<string, any[]> = {};
  store.todos.items.forEach(todo => {
    if (!groups[todo.category]) {
      groups[todo.category] = [];
    }
    groups[todo.category].push(todo);
  });
  return groups;
});

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Grocery List': return 'shopping_cart';
    case 'House Chores': return 'home';
    case 'Work': return 'work';
    default: return 'check_box';
  }
};
</script>

<template>
  <div class="flex flex-col gap-lg pb-32">
    <header class="mb-xl">
      <h1 class="font-h1 text-h1 text-on-surface">Day-to-Day</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-xs">Shared tasks and reminders</p>
    </header>

    <section v-for="(todos, category) in groupedTodos" :key="category" class="mb-xl">
      <div class="flex items-center mb-md">
        <BaseIcon :name="getCategoryIcon(category)" class="text-secondary mr-sm" />
        <h2 class="font-h2 text-h2 text-on-surface">{{ category }}</h2>
      </div>

      <div class="flex flex-col gap-base">
        <div
          v-for="todo in todos"
          :key="todo.id"
          class="relative group rounded-xl overflow-hidden"
        >
          <label class="relative block bg-surface-container-lowest rounded-xl shadow-sm p-sm flex items-center cursor-pointer transition-all duration-300 ease-out active:scale-[0.98] z-10" :class="{ 'opacity-60': todo.completed }">
            <input
              type="checkbox"
              class="peer sr-only"
              :checked="todo.completed"
              @change="store.toggleTodo(todo.id)"
            />
            <div class="w-touch-target h-touch-target flex items-center justify-center shrink-0">
              <div class="w-6 h-6 rounded border-2 border-outline-variant peer-checked:border-primary peer-checked:bg-primary transition-all duration-300 flex items-center justify-center relative overflow-hidden">
                <BaseIcon name="check" :size="18" class="text-on-primary opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300" />
              </div>
            </div>
            <div class="flex-1 ml-xs relative flex items-center justify-between">
              <div>
                <p class="font-body-md text-body-md text-on-surface transition-colors duration-300 peer-checked:text-on-surface-variant" :class="{ 'line-through': todo.completed }">
                  {{ todo.text }}
                </p>
                <p v-if="todo.subtext" class="text-[12px] text-on-surface-variant mt-1" :class="{ 'opacity-50': todo.completed }">
                  {{ todo.subtext }}
                </p>
              </div>
              <div v-if="todo.shared" class="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ml-sm shrink-0" :class="{ 'opacity-50': todo.completed }">
                Shared
              </div>
            </div>
          </label>
        </div>
      </div>
    </section>

    <!-- FAB would normally be here, but we'll stick to navigation for now -->
  </div>
</template>
