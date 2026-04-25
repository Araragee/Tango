<script setup lang="ts">
import { computed } from 'vue';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  class?: ClassValue;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
});

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const variants = {
  primary: 'bg-primary text-on-primary shadow-lg active:scale-95 hover:bg-primary/90',
  secondary: 'bg-secondary text-on-secondary shadow-md active:scale-95 hover:bg-secondary/90',
  ghost: 'bg-transparent text-on-surface hover:bg-surface-variant/20 active:scale-95',
  outline: 'bg-transparent border border-outline text-on-surface hover:bg-surface-variant/10 active:scale-95',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-full',
  md: 'px-6 py-3 font-button text-button rounded-full',
  lg: 'px-8 py-4 text-lg rounded-full',
  icon: 'w-10 h-10 flex items-center justify-center rounded-full',
};

const classes = computed(() => cn(
  'transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none',
  variants[props.variant],
  sizes[props.size],
  props.class
));
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
