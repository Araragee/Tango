<script setup lang="ts">
import { ref } from 'vue';

interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

const notifications = ref<Notification[]>([]);
let nextId = 0;

const add = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = nextId++;
    notifications.value.push({ id, message, type });
    setTimeout(() => {
        remove(id);
    }, 3000);
};

const remove = (id: number) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
};

defineExpose({ add });
</script>

<template>
  <div class="fixed bottom-24 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center gap-2 px-4">
    <TransitionGroup name="toast">
        <div
            v-for="n in notifications"
            :key="n.id"
            class="pointer-events-auto bg-surface pixel-border hard-shadow-dark px-6 py-3 flex items-center gap-3 max-w-md w-full"
            :class="{
                'border-secondary-container': n.type === 'success',
                'border-error': n.type === 'error',
                'border-primary': n.type === 'info',
            }"
        >
            <span class="material-symbols-outlined" :class="{
                'text-secondary': n.type === 'success',
                'text-error': n.type === 'error',
                'text-primary': n.type === 'info',
            }">
                {{ n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : 'info' }}
            </span>
            <span class="text-label-sm uppercase font-bold">{{ n.message }}</span>
        </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
