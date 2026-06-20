<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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

// Hide the bar while scrolling down to free up screen space; reveal it again
// when the user scrolls up or stops scrolling.
const navHidden = ref(false);
let lastY = 0;
let stopTimer: ReturnType<typeof setTimeout> | undefined;
const THRESHOLD = 8; // ignore tiny jitters

function onScroll() {
  const y = window.scrollY;
  if (y > lastY + THRESHOLD && y > 64) navHidden.value = true;   // scrolling down
  else if (y < lastY - THRESHOLD) navHidden.value = false;       // scrolling up
  lastY = y;
  // Reveal shortly after scrolling stops.
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => { navHidden.value = false; }, 200);
}

onMounted(() => {
  lastY = window.scrollY;
  window.addEventListener('scroll', onScroll, { passive: true });
});
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  clearTimeout(stopTimer);
});
</script>

<template>
  <nav
    class="pb-safe hidden max-md:flex bg-surface border-t-2 border-black dark:border-white fixed bottom-0 left-0 w-full z-50 justify-around items-center px-2 sm:px-4 py-2 transition-transform duration-300 will-change-transform"
    :class="navHidden ? 'translate-y-full' : 'translate-y-0'"
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
