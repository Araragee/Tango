import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AccentColor = 'rose' | 'blue' | 'green' | 'amber' | 'purple'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('tango-dark') === 'true')
  const accentColor = ref<AccentColor>((localStorage.getItem('tango-accent') as AccentColor) || 'rose')

  watch(isDark, (val) => {
    localStorage.setItem('tango-dark', String(val))
    applyTheme()
  })

  watch(accentColor, (val) => {
    localStorage.setItem('tango-accent', val)
    applyTheme()
  })

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
    applyTheme
  }
})
