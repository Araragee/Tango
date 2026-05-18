import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AccentColor = 'rose' | 'blue' | 'green' | 'amber' | 'purple'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)
  const accentColor = ref<AccentColor>('rose')

  function applyTheme() {
    const root = document.documentElement
    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Remove old accent classes
    const accentColors: AccentColor[] = ['rose', 'blue', 'green', 'amber', 'purple']
    accentColors.forEach(c => root.classList.remove(`theme-${c}`))

    // Add new accent class
    root.classList.add(`theme-${accentColor.value}`)
  }

  // Re-apply theme to DOM whenever values change
  watch(isDark, applyTheme)
  watch(accentColor, applyTheme)

  function toggleDark() {
    isDark.value = !isDark.value
  }

  function setAccent(color: AccentColor) {
    accentColor.value = color
  }

  return {
    isDark,
    accentColor,
    toggleDark,
    setAccent,
    applyTheme,
  }
}, {
  persist: {
    key: 'tango-theme',
    afterHydrate(ctx) {
      // Re-apply theme to DOM after state is restored from localStorage
      ctx.store.applyTheme()
    },
  },
})
