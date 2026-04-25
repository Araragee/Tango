<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  progress: number;
  color?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'bg-primary',
  height: 'h-2',
});

const progressWidth = computed(() => `${Math.min(100, Math.max(0, props.progress))}%`);
</script>

<template>
  <div :class="['w-full bg-surface-variant rounded-full overflow-hidden relative', height]">
    <div
      :class="['h-full rounded-full transition-all duration-1000 ease-out', color]"
      :style="{ width: progressWidth }"
    >
      <div class="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-t-full"></div>
    </div>
  </div>
</template>
