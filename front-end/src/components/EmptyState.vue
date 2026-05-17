<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="w-full min-w-0 py-12 px-6">
    <div class="w-full max-w-content mx-auto flex flex-col items-center text-center gap-3">
      <span
        v-if="icon"
        class="material-symbols-outlined text-on-surface-variant opacity-40 text-5xl"
        style="font-variation-settings: 'FILL' 1;"
      >{{ icon }}</span>
      <p class="w-full text-body-lg font-bold text-on-surface-variant uppercase tracking-wide break-words">{{ title }}</p>
      <p
        v-if="description"
        class="w-full text-body-md text-on-surface-variant break-words"
      >{{ description }}</p>
      <slot />
    </div>
  </div>
</template>
