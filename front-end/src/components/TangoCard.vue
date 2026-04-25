<script setup lang="ts">
interface Props {
  shadow?: 'default' | 'dark' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

withDefaults(defineProps<Props>(), {
  shadow: 'default',
  padding: 'md',
});
</script>

<template>
  <div
    class="bg-surface pixel-border relative overflow-hidden"
    :class="[
      shadow === 'default' && 'hard-shadow',
      shadow === 'dark' && 'hard-shadow-dark',
      padding === 'sm' && 'p-4',
      padding === 'md' && 'p-6',
      padding === 'lg' && 'p-8',
      padding === 'xl' && 'p-12',
    ]"
  >
    <slot />
  </div>
</template>
