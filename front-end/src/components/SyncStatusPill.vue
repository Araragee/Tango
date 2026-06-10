<script setup lang="ts">
import { computed } from 'vue'
import { useOfflineQueue } from '../stores/useOfflineQueue'
import { useRouter } from 'vue-router'
import { usePresenceStore } from '../stores/usePresenceStore'

const queue = useOfflineQueue()
const presence = usePresenceStore()
const router = useRouter()

const statusText = computed(() => {
  if (queue.flushing) return 'Syncing...'
  if (queue.failed.length > 0) return `Failed: tap to retry`
  if (!presence.isOnline) {
    if (queue.pending.length > 0) return `Offline · ${queue.pending.length} queued`
    return 'Offline'
  }
  if (queue.pending.length > 0) return `Queued (${queue.pending.length})`
  return 'Online'
})

const pillClass = computed(() => {
  if (queue.failed.length > 0) return 'bg-error text-on-error cursor-pointer hover:opacity-90'
  if (!presence.isOnline) return 'bg-surface-variant text-on-surface-variant'
  if (queue.flushing || queue.pending.length > 0) return 'bg-[#f59e0b] text-black cursor-pointer hover:opacity-90 animate-pulse'
  return 'bg-primary-container text-on-primary-container'
})

const handleClick = () => {
  if (queue.failed.length > 0 || queue.pending.length > 0) {
    router.push('/app/settings?tab=data') // We'll add this tab later
  }
}
</script>

<template>
  <div
    class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold transition-all border border-black/10 dark:border-white/10"
    :class="pillClass"
    @click="handleClick"
    :title="statusText"
  >
    <div
      class="w-1.5 h-1.5 rounded-full"
      :class="{
        'bg-current': true,
        'animate-ping': queue.flushing
      }"
    ></div>
    <span class="whitespace-nowrap">{{ statusText }}</span>
  </div>
</template>
