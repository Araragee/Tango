<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from './stores/useStore';
import BottomNav from './components/BottomNav.vue';
import BudgetTracker from './components/BudgetTracker.vue';
import PlansGoals from './components/PlansGoals.vue';
import TodoList from './components/TodoList.vue';
import SharedCalendar from './components/SharedCalendar.vue';
import BaseIcon from './components/Base/BaseIcon.vue';

const store = useAppStore();

const currentComponent = computed(() => {
  switch (store.activeView) {
    case 'Budget': return BudgetTracker;
    case 'Plans': return PlansGoals;
    case 'To-Dos': return TodoList;
    case 'Calendar': return SharedCalendar;
    default: return BudgetTracker;
  }
});
</script>

<template>
  <div class="min-h-screen bg-background text-on-background font-body-md antialiased">
    <!-- Top Bar -->
    <header class="fixed top-0 left-0 w-full z-50 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm flex justify-between items-center px-5 h-16">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
           <BaseIcon name="Heart" :size="16" />
        </div>
        <h1 class="text-lg font-semibold text-slate-700 dark:text-slate-200 tracking-tight font-manrope">PartnerSpace</h1>
      </div>
      <button class="w-8 h-8 rounded-full overflow-hidden hover:opacity-80 transition-opacity active:scale-95 transition-transform duration-200 bg-surface-variant flex-shrink-0 border border-slate-200/50">
        <img alt="Profile" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-rj67vnriMkKHUNRMjp_sD1bCCojnDHVMw94QDwDfU3MXNf_xxg0mqkwA-Q0uwxQHXvLcFEUYvT8Fd22qriykXf1kbLu8f1pmg_AK1v8bq6xX4boYzp9IKtBrWmbojVe6WQAus94J008hFUpiTZ-MKf_vfH9CsIUA5u8CnXoVeTrue_7B75ukpMM7NZ7sv3jr5fYP7VDT3jp5VDm8CoZJvJYXb6MOjPHZ1OtqwgkOeAvXD-tC8Pi7a2dOYftKhIuGxjjcy9ibpac"/>
      </button>
    </header>

    <!-- Main Content -->
    <main class="pt-24 pb-28 px-edge-margin max-w-2xl mx-auto min-h-screen">
      <transition
        name="fade"
        mode="out-in"
      >
        <component :is="currentComponent" />
      </transition>
    </main>

    <!-- Navigation -->
    <BottomNav />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
</style>
