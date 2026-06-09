<script setup lang="ts">
import { useUndoToast } from '../composables/useUndoToast'

const { isVisible, currentOptions, handleUndo, hide } = useUndoToast()
</script>

<template>
  <Transition name="toast">
    <div
      v-if="isVisible && currentOptions"
      class="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 bg-surface pixel-border hard-shadow-dark min-w-[300px] max-w-[90vw]"
      role="alert"
      aria-live="assertive"
    >
      <span class="text-body-md font-bold text-on-surface flex-1">{{ currentOptions.message }}</span>
      <button
        @click="handleUndo"
        class="text-primary uppercase font-black text-label-md tracking-wider hover:opacity-80 transition-opacity"
      >
        Undo
      </button>
      <button
        @click="hide"
        class="text-on-surface-variant hover:text-on-surface transition-colors p-1"
        aria-label="Close"
      >
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
