<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
    <span
      v-if="icon"
      class="material-symbols-outlined text-on-surface-variant opacity-40 text-5xl"
      style="font-variation-settings: 'FILL' 1;"
    >{{ icon }}</span>
    <p class="text-body-lg font-bold text-on-surface-variant uppercase tracking-wide">{{ title }}</p>
    <p v-if="description" class="text-body-md text-on-surface-variant max-w-xs">{{ description }}</p>
    <slot />
  </div>
</template>
