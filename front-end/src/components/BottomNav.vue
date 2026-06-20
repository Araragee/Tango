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
  <nav
    class="pb-safe hidden max-md:flex bg-surface border-t-2 border-black dark:border-white fixed bottom-0 left-0 w-full z-50 justify-around items-center px-2 sm:px-4 py-2"
    aria-label="Primary"
  >
    <button
      v-for="item in navItems"
      :key="item.path"
      :aria-current="isActive(item.path) ? 'page' : undefined"
      :aria-label="item.name"
      class="flex flex-col items-center justify-center p-2 min-w-[48px] min-h-[48px] active:scale-95 transition-transform"
      :class="[
        isActive(item.path)
          ? 'bg-primary text-on-primary pixel-border hard-shadow-dark'
          : 'text-on-surface-variant hover:bg-primary-container'
      ]"
      @click="router.push(item.path)"
    >
      <span class="material-symbols-outlined mb-1" :style="isActive(item.path) ? 'font-variation-settings: \'FILL\' 1;' : ''">
        {{ item.icon }}
      </span>
      <span class="font-space-grotesk text-[10px] font-bold uppercase tracking-tight mt-1">{{ item.name }}</span>
    </button>
  </nav>

</template>
