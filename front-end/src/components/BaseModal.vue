<script setup lang="ts">
import { } from 'vue';
import TangoButton from './TangoButton.vue';

interface Props {
  show: boolean;
  title: string;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 'max-w-lg'
});
const emit = defineEmits(['close']);
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Background Overlay -->
      <div class="absolute inset-0 bg-dither opacity-90" @click="emit('close')"></div>

      <!-- Modal Container -->
      <div 
        :class="[
          'relative z-20 w-[90%] min-w-[320px] bg-surface pixel-border hard-shadow flex flex-col',
          maxWidth === 'max-w-md' ? 'max-w-[448px]' : 
          maxWidth === 'max-w-lg' ? 'max-w-[512px]' : 
          maxWidth === 'max-w-xl' ? 'max-w-[576px]' : 
          maxWidth === 'max-w-2xl' ? 'max-w-[672px]' : 'max-w-[512px]'
        ]"
      >
        <!-- Modal Header -->
        <div class="bg-primary text-on-primary border-b-2 border-on-background p-4 flex justify-between items-center">
          <h2 class="text-headline-md m-0 uppercase">{{ title }}</h2>
          <button @click="emit('close')" aria-label="Close modal" class="text-on-primary hover:text-primary-fixed transition-colors">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[70vh]">
          <slot />
        </div>

        <!-- Modal Footer -->
        <div class="p-6 pt-0 flex gap-4 justify-end border-t-2 border-on-surface border-opacity-10 mt-2 pt-4">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative {
  transform: scale(0.9);
}

.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
