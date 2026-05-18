<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore, type AppNotification } from '../stores/useNotificationsStore';

const router = useRouter();
const notifications = useNotificationsStore();

const open = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const recent = computed(() => notifications.items.slice(0, 12));

const toggle = () => {
    open.value = !open.value;
};

const close = () => {
    open.value = false;
};

const handleOutside = (e: MouseEvent) => {
    if (!dropdownRef.value) return;
    if (!dropdownRef.value.contains(e.target as Node)) close();
};

const iconFor = (type: string) => {
    if (type.startsWith('transaction')) return 'receipt_long';
    if (type.startsWith('goal'))        return 'flag';
    if (type.startsWith('todo'))        return 'task_alt';
    if (type.startsWith('event'))       return 'event';
    if (type.startsWith('partner'))     return 'favorite';
    return 'notifications';
};

const routeFor = (n: AppNotification) => {
    if (n.type.startsWith('transaction')) return '/app/budget';
    if (n.type.startsWith('goal'))        return '/app/plans';
    if (n.type.startsWith('todo'))        return '/app/todos';
    if (n.type.startsWith('event'))       return '/app/calendar';
    return null;
};

const onItemClick = async (n: AppNotification) => {
    if (!n.read_at) await notifications.markRead([n.id]);
    const r = routeFor(n);
    if (r) router.push(r);
    close();
};

const markAll = async () => {
    await notifications.markRead();
};

const relativeTime = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

onMounted(() => {
    document.addEventListener('click', handleOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleOutside);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      @click.stop="toggle"
      class="material-symbols-outlined text-on-surface hover:text-primary transition-colors relative"
      aria-label="Notifications"
    >
      notifications
      <span
        v-if="notifications.unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 pixel-border-sm bg-error text-on-error text-[10px] font-black flex items-center justify-center"
      >
        {{ notifications.unreadCount > 99 ? '99+' : notifications.unreadCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="fixed sm:absolute left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 top-16 sm:top-10 w-[90vw] sm:w-[380px] max-h-[calc(100dvh-80px)] sm:max-h-[420px] bg-surface pixel-border hard-shadow overflow-hidden z-50 flex flex-col"
    >
      <div class="flex items-center justify-between p-3 border-b-2 border-on-surface">
        <span class="text-label-md uppercase font-bold">Notifications</span>
        <button
          v-if="notifications.unreadCount > 0"
          @click="markAll"
          class="text-label-sm uppercase text-primary hover:underline"
        >Mark all read</button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="recent.length === 0" class="p-6 text-center text-on-surface-variant text-body-md">
          You're all caught up.
        </div>
        <button
          v-for="n in recent"
          :key="n.id"
          @click="onItemClick(n)"
          class="w-full text-left flex items-start gap-3 p-3 border-b border-outline-variant hover:bg-surface-variant transition-colors"
          :class="!n.read_at && 'bg-primary-container/40'"
        >
          <span class="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">
            {{ iconFor(n.type) }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-label-md font-bold truncate">{{ n.title }}</span>
              <span class="text-[10px] uppercase text-outline shrink-0">{{ relativeTime(n.created_at) }}</span>
            </div>
            <p v-if="n.body" class="text-label-sm text-on-surface-variant truncate">{{ n.body }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
