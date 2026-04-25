<script setup lang="ts">
import { useAppStore } from '../stores/useStore';

const store = useAppStore();

const navItems = [
  { name: 'Budget', icon: 'payments' },
  { name: 'Plans', icon: 'stars' },
  { name: 'To-Dos', icon: 'checklist_rtl' },
  { name: 'Calendar', icon: 'calendar_month' },
];
</script>

<template>
  <nav class="md:hidden bg-surface dark:bg-stone-900 border-t-2 border-black fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2">
    <button
      v-for="item in navItems"
      :key="item.name"
      @click="store.setActiveView(item.name)"
      class="flex flex-col items-center justify-center p-2 active:scale-95 transition-transform"
      :class="[
        store.activeView === item.name
          ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
          : 'text-stone-600 dark:text-stone-400 hover:bg-rose-50 dark:hover:bg-stone-800'
      ]"
    >
      <span class="material-symbols-outlined mb-1" :style="store.activeView === item.name ? 'font-variation-settings: \'FILL\' 1;' : ''">
        {{ item.icon }}
      </span>
      <span class="font-space-grotesk text-[10px] font-bold uppercase tracking-tight mt-1">{{ item.name }}</span>
    </button>
  </nav>

  <!-- Desktop Navigation -->
  <div class="hidden md:flex fixed top-0 right-24 h-16 items-center gap-6 z-50">
    <button
      v-for="item in navItems"
      :key="item.name"
      @click="store.setActiveView(item.name)"
      class="px-4 py-1 text-label-sm uppercase font-bold transition-all"
      :class="[
        store.activeView === item.name
          ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
          : 'text-on-surface hover:text-primary'
      ]"
    >
      {{ item.name }}
    </button>
  </div>
</template>
