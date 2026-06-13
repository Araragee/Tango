<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { FocusTrap } from 'focus-trap-vue';
import { useScrollLock } from '../composables/useScrollLock';

interface Props {
  show: boolean;
  title: string;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 'max-w-lg'
});
const emit = defineEmits(['close']);

const { lock, unlock } = useScrollLock();

const onKeydown = (e: KeyboardEvent) => {
  if (props.show && e.key === 'Escape') {
    emit('close');
  }
};

watch(() => props.show, (newShow) => {
  if (newShow) {
    lock();
  } else {
    unlock();
  }
}, { immediate: true });

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  unlock();
});

</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Background Overlay -->
      <div class="absolute inset-0 bg-dither opacity-90" @click="emit('close')"></div>

      <!-- Modal Container -->
      <FocusTrap :active="show">
        <div
          class="relative z-20 w-[90vw] min-w-[280px] lg:w-[60vw] lg:min-h-[50vh] lg:max-h-[90vh] bg-surface pixel-border hard-shadow flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <!-- Modal Header -->
          <div class="bg-primary text-on-primary border-b-2 border-on-background p-4 flex justify-between items-center">
            <h2 id="modal-title" class="text-headline-md m-0 uppercase">{{ title }}</h2>
            <button @click="emit('close')" aria-label="Close modal" class="tap-target -mr-2 text-on-primary hover:opacity-70 transition-opacity">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">close</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto flex-1 max-h-[70vh] lg:max-h-none">
            <slot />
          </div>

          <!-- Modal Footer -->
          <div class="p-6 pt-0 flex flex-wrap gap-4 justify-end border-t-2 border-on-surface/10 mt-2 md:pt-4">
            <slot name="footer" />
          </div>
        </div>
      </FocusTrap>
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
