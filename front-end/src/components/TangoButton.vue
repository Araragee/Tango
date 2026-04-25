<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'surface';
  shadow?: 'default' | 'dark' | 'none';
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  shadow: 'default',
  size: 'md',
});
</script>

<template>
  <button
    class="pixel-border btn-active font-bold transition-transform flex items-center justify-center gap-2"
    :class="[
      // Variants
      variant === 'primary' && 'bg-primary text-on-primary',
      variant === 'secondary' && 'bg-secondary text-on-secondary',
      variant === 'outline' && 'bg-surface text-primary',
      variant === 'surface' && 'bg-surface text-on-surface',
      
      // Shadows
      shadow === 'default' && 'hard-shadow',
      shadow === 'dark' && 'hard-shadow-dark',
      
      // Sizes
      size === 'sm' && 'px-3 py-1 text-label-sm',
      size === 'md' && 'px-4 py-2 text-body-md',
      size === 'lg' && 'px-8 py-4 text-body-lg uppercase tracking-wider',
    ]"
  >
    <slot />
  </button>
</template>
