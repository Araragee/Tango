<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navItems = [
  { name: 'Budget', icon: 'payments', path: '/app/budget' },
  { name: 'Plans', icon: 'stars', path: '/app/plans' },
  { name: 'To-Dos', icon: 'checklist_rtl', path: '/app/todos' },
  { name: 'Calendar', icon: 'calendar_month', path: '/app/calendar' },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <nav class="md:hidden bg-surface border-t-2 border-black dark:border-white fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2">
    <button
      v-for="item in navItems"
      :key="item.path"
      @click="router.push(item.path)"
      class="flex flex-col items-center justify-center p-2 active:scale-95 transition-transform"
      :class="[
        isActive(item.path)
          ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
          : 'text-on-surface-variant hover:bg-primary-container'
      ]"
    >
      <span class="material-symbols-outlined mb-1" :style="isActive(item.path) ? 'font-variation-settings: \'FILL\' 1;' : ''">
        {{ item.icon }}
      </span>
      <span class="font-space-grotesk text-[10px] font-bold uppercase tracking-tight mt-1">{{ item.name }}</span>
    </button>
  </nav>

  <!-- Desktop Navigation -->
  <div class="hidden md:flex fixed top-0 right-24 h-16 items-center gap-6 z-50">
    <button
      v-for="item in navItems"
      :key="item.path"
      @click="router.push(item.path)"
      class="px-4 py-1 text-label-sm uppercase font-bold transition-all"
      :class="[
        isActive(item.path)
          ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
          : 'text-on-surface hover:text-primary'
      ]"
    >
      {{ item.name }}
    </button>
  </div>
</template>
