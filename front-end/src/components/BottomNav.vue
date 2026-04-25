<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import BaseIcon from './Base/BaseIcon.vue';

const store = useAppStore();

const navItems = [
  { name: 'Budget', icon: 'payments' },
  { name: 'Plans', icon: 'assignment' },
  { name: 'To-Dos', icon: 'fact_check' },
  { name: 'Calendar', icon: 'calendar_month' },
];
</script>

<template>
  <nav class="fixed bottom-0 left-0 w-full z-50 rounded-t-[32px] border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg flex justify-around items-center h-20 px-4 pb-safe md:hidden">
    <button
      v-for="item in navItems"
      :key="item.name"
      @click="store.setActiveView(item.name)"
      :class="[
        'flex flex-col items-center justify-center transition-all duration-300 ease-out px-5 py-1.5 rounded-full',
        store.activeView === item.name
          ? 'bg-primary/10 text-primary'
          : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
      ]"
    >
      <BaseIcon
        :name="item.icon"
        :size="24"
        class="mb-1"
      />
      <span class="font-manrope text-[10px] font-semibold uppercase tracking-widest">{{ item.name }}</span>
    </button>
  </nav>

  <!-- Desktop Navigation -->
  <div class="hidden md:flex fixed top-0 right-20 h-16 items-center gap-lg z-50 font-label-caps text-label-caps uppercase">
    <button
      v-for="item in navItems"
      :key="item.name"
      @click="store.setActiveView(item.name)"
      :class="[
        'transition-colors pb-1 border-b-2',
        store.activeView === item.name
          ? 'text-primary font-semibold border-primary'
          : 'text-outline-variant hover:text-primary border-transparent'
      ]"
    >
      {{ item.name }}
    </button>
  </div>
</template>
