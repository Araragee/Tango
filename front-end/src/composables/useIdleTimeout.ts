import { onMounted, onUnmounted } from 'vue'

const IDLE_MS = 15 * 60 * 1000
const WARN_MS = 14 * 60 * 1000

const EVENTS = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'] as const

export function useIdleTimeout(onIdle: () => void, onWarn?: () => void) {
  let idleTimer: ReturnType<typeof setTimeout>
  let warnTimer: ReturnType<typeof setTimeout>

  function reset() {
    clearTimeout(idleTimer)
    clearTimeout(warnTimer)
    if (onWarn) warnTimer = setTimeout(onWarn, WARN_MS)
    idleTimer = setTimeout(onIdle, IDLE_MS)
  }

  onMounted(() => {
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
  })

  onUnmounted(() => {
    EVENTS.forEach(e => window.removeEventListener(e, reset))
    clearTimeout(idleTimer)
    clearTimeout(warnTimer)
  })
}
