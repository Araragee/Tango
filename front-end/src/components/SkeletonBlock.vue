<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  rounded?: boolean
}>()
</script>

<template>
  <div
    class="animate-pulse bg-surface-variant"
    :class="rounded ? 'rounded-full' : 'pixel-border-sm'"
    :style="{
      width: width ?? '100%',
      height: height ?? '1rem',
    }"
  ></div>
</template>
