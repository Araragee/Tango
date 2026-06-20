<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const DISMISS_KEY = 'tango.ios.installHintDismissed'

const auth = useAuthStore()
const route = useRoute()
const dismissed = ref(false)

onMounted(() => {
  dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
})

const isIosSafari = computed(() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua)
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return ios && webkit
})

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return (
    navStandalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
})

const visible = computed(() => {
  if (!auth.user) return false
  if (!route.path.startsWith('/app')) return false
  if (dismissed.value) return false
  if (!isIosSafari.value) return false
  if (isStandalone.value) return false
  return true
})

function dismiss() {
  dismissed.value = true
  localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="visible"
      class="bottom-above-nav fixed left-1/2 -translate-x-1/2 z-50 w-[80vw] max-w-[28rem] p-3 pixel-border bg-surface text-on-surface flex items-start gap-3"
      role="region"
      aria-label="Install Tango"
    >
      <span class="material-symbols-outlined text-primary mt-0.5">ios_share</span>

      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold uppercase tracking-wide">Add to Home Screen</p>
        <p class="text-xs text-on-surface-variant mt-0.5">
          On iOS, push notifications need Tango installed. Tap
          <span class="material-symbols-outlined text-[14px] align-middle">ios_share</span>
          then <strong>Add to Home Screen</strong>.
        </p>
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
  transform: translate(-50%, 10px);
}
</style>
