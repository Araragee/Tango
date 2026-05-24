import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type AccentColor = 'rose' | 'blue' | 'green' | 'amber' | 'purple'

export const useThemeStore = defineStore('theme', () => {
  // Manual preference (user-set). Ignored when followSystem is true.
  const isDark = ref(false)
  const accentColor = ref<AccentColor>('rose')

  // F15: follow prefers-color-scheme instead of the manual toggle.
  // When true, the OS/browser dark-mode setting drives the UI automatically.
  const followSystem = ref(false)

  // Mirrors the current OS dark-mode preference. Not persisted — re-read
  // on every page load from the live MediaQueryList.
  const systemDark = ref(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )

  // The value that actually controls the DOM class.
  const effectiveDark = computed(() => followSystem.value ? systemDark.value : isDark.value)

  // ── MediaQueryList watcher ────────────────────────────────────────────────

  let _mql: MediaQueryList | null = null
  let _mqlHandler: ((e: MediaQueryListEvent) => void) | null = null

  function _stopSystemWatch() {
    if (_mql && _mqlHandler) {
      _mql.removeEventListener('change', _mqlHandler)
      _mql = null
      _mqlHandler = null
    }
  }

  // Starts watching prefers-color-scheme. Idempotent — safe to call multiple
  // times (cleans up the old listener before registering a new one).
  function initSystemWatch() {
    if (typeof window === 'undefined') return
    _stopSystemWatch()
    _mql = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = _mql.matches
    _mqlHandler = (e: MediaQueryListEvent) => {
      systemDark.value = e.matches
      applyTheme()
    }
    _mql.addEventListener('change', _mqlHandler)
    applyTheme()
  }

  // ── DOM application ───────────────────────────────────────────────────────

  function applyTheme() {
    const root = document.documentElement
    if (effectiveDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    const accentColors: AccentColor[] = ['rose', 'blue', 'green', 'amber', 'purple']
    accentColors.forEach(c => root.classList.remove(`theme-${c}`))
    root.classList.add(`theme-${accentColor.value}`)
  }

  // Re-apply when the effective dark value or accent changes.
  watch(effectiveDark, applyTheme)
  watch(accentColor, applyTheme)

  // When followSystem is toggled on, start the MQL watcher; off → stop it.
  watch(followSystem, (on) => {
    if (on) {
      initSystemWatch()
    } else {
      _stopSystemWatch()
      applyTheme()
    }
  })

  // ── Actions ───────────────────────────────────────────────────────────────

  function toggleDark() {
    // Manual toggle is a no-op when the system preference is in control.
    if (followSystem.value) return
    isDark.value = !isDark.value
  }

  function setAccent(color: AccentColor) {
    accentColor.value = color
  }

  function setFollowSystem(on: boolean) {
    followSystem.value = on
    // The watch(followSystem, ...) above handles starting/stopping the watcher.
  }

  return {
    isDark,
    accentColor,
    followSystem,
    effectiveDark,
    toggleDark,
    setAccent,
    setFollowSystem,
    applyTheme,
    initSystemWatch,
  }
}, {
  persist: {
    key: 'tango-theme',
    // Only persist user choices. systemDark and effectiveDark are derived at
    // runtime. followSystem IS persisted so the preference survives a reload.
    pick: ['isDark', 'accentColor', 'followSystem'],
    afterHydrate(ctx) {
      // Re-apply theme to DOM after state is restored from localStorage.
      // If followSystem was enabled, kick off the MediaQueryList watcher so
      // OS preference changes are picked up even after a page refresh. (F15)
      if (ctx.store.followSystem) {
        ctx.store.initSystemWatch()
      } else {
        ctx.store.applyTheme()
      }
    },
  },
})
