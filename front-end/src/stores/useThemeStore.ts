import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useOfflineQueue } from './useOfflineQueue'

export type AccentColor = 'rose' | 'blue' | 'green' | 'amber' | 'purple'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('tango-dark') === 'true')
  const accentColor = ref<AccentColor>((localStorage.getItem('tango-accent') as AccentColor) || 'rose')

  watch(isDark, (val) => {
    localStorage.setItem('tango-dark', String(val))
    applyTheme()
    syncTheme()
  })

  watch(accentColor, (val) => {
    localStorage.setItem('tango-accent', val)
    applyTheme()
    syncTheme()
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

  async function syncTheme() {
    const auth = useAuthStore()
    if (!auth.user) return

    if (!isConfigured) return

    const payload = {
      id: auth.user.id,
      theme_dark: isDark.value,
      theme_accent: accentColor.value
    }

    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) {
      const msg = String(error.message ?? error).toLowerCase()
      const isNetwork = msg.includes('failed to fetch') || msg.includes('networkerror') || !navigator.onLine
      if (isNetwork) {
        await useOfflineQueue().enqueue('profiles', 'upsert', payload)
      }
    }
  }

  applyTheme()

  return {
    isDark,
    accentColor,
    toggleDark,
    setAccent,
    applyTheme,
    syncTheme
  }
})
