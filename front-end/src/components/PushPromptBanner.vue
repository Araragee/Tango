<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { usePushSubscription } from '@/composables/usePushSubscription'
import { useAuthStore } from '@/stores/useAuthStore'

const DISMISS_KEY = 'tango.push.bannerDismissed'

const push = usePushSubscription()
const auth = useAuthStore()

const dismissed = ref(false)
const justEnabled = ref(false)

onMounted(() => {
  dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
})

const visible = computed(() => {
  if (!auth.user) return false
  if (dismissed.value) return false
  if (justEnabled.value) return false
  return push.canPrompt.value
})

function dismiss() {
  dismissed.value = true
  localStorage.setItem(DISMISS_KEY, '1')
}

async function onEnable() {
  const ok = await push.enable()
  if (ok) {
    justEnabled.value = true
    localStorage.setItem(DISMISS_KEY, '1')
  }
}

watch(
  () => auth.user?.id ?? null,
  (uid, prevUid) => {
    if (uid && uid !== prevUid) push.refresh()
  },
)
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="visible"
      class="fixed left-1/2 -translate-x-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-md p-3 pixel-border bg-surface text-on-surface flex items-start gap-3"
      role="region"
      aria-label="Enable notifications"
    >
      <span
        class="material-symbols-outlined text-primary mt-0.5"
        style="font-variation-settings: 'FILL' 1;"
      >notifications_active</span>

      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold uppercase tracking-wide">Get partner pings</p>
        <p class="text-xs text-on-surface-variant mt-0.5">
          Push notifications when your partner updates a goal, todo, or transaction.
        </p>
        <p
          v-if="push.lastError.value"
          class="text-xs text-error mt-1"
        >{{ push.lastError.value }}</p>

        <div class="flex gap-2 mt-2">
          <button
            type="button"
            :disabled="push.busy.value"
            @click="onEnable"
            class="px-3 py-1 pixel-border-sm bg-primary text-on-primary text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
          >
            {{ push.busy.value ? 'Enabling…' : 'Enable' }}
          </button>
          <button
            type="button"
            @click="dismiss"
            class="px-3 py-1 pixel-border-sm bg-surface-variant text-on-surface-variant text-xs font-bold uppercase hover:bg-surface-container-high"
          >
            Not now
          </button>
        </div>
      </div>

      <button
        type="button"
        @click="dismiss"
        class="material-symbols-outlined text-on-surface-variant hover:text-on-surface"
        aria-label="Dismiss"
      >close</button>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease-out;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
