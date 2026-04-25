<script setup lang="ts">
import { computed } from 'vue';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  class?: ClassValue;
}

const props = defineProps<Props>();

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const classes = computed(() => cn(
  'bg-surface-container-lowest rounded-xl p-md border border-surface-variant/20 shadow-sm',
  props.class
));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
