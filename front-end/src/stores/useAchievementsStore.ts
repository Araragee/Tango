import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useHouseholdStore } from './useHouseholdStore'
import { ACHIEVEMENTS, type AchievementSnapshot } from '@/utils/achievements'

export interface UnlockedAchievement {
  id: string
  user_id: string
  household_id: string | null
  code: string
  unlocked_at: string
  payload: Record<string, any> | null
}

export const useAchievementsStore = defineStore('achievements', () => {
  const unlocked = ref<UnlockedAchievement[]>([])
  const definitions = ACHIEVEMENTS

  let _channel: RealtimeChannel | null = null
  let _userId: string | null = null
  let _evaluating = false
  // Exponential-backoff reconnect on CHANNEL_ERROR, matching useStore.ts (B101)
  // and all other realtime stores. (B121)
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _reconnectDelay = 2_000

  const unlockedCodes = computed(() => new Set(unlocked.value.map(u => u.code)))

  async function fetch() {
    const auth = useAuthStore()
    if (!isConfigured || !auth.user) return
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('unlocked_at', { ascending: false })
    if (error) { console.error('[achievements]', error); return }
    unlocked.value = (data ?? []) as UnlockedAchievement[]
  }

  async function unlock(code: string, payload: Record<string, any> | null = null) {
    const auth = useAuthStore()
    const household = useHouseholdStore()
    if (!auth.user) return
    if (unlockedCodes.value.has(code)) return

    if (!isConfigured) {
      unlocked.value = [{
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        household_id: household.householdId,
        code,
        unlocked_at: new Date().toISOString(),
        payload,
      }, ...unlocked.value]
      return
    }

    const row = {
      user_id: auth.user.id,
      household_id: household.householdId,
      code,
      payload,
    }
    const { error } = await supabase.from('achievements').insert(row)
    if (error && !/duplicate key/i.test(error.message)) {
      console.error('[achievements.unlock]', error)
      return
    }
  }

  async function evaluate(snapshot: AchievementSnapshot) {
    if (_evaluating) return
    _evaluating = true
    try {
      for (const def of definitions) {
        if (unlockedCodes.value.has(def.code)) continue
        try {
          if (def.predicate(snapshot)) {
            await unlock(def.code)
          }
        } catch (e) {
          console.error('[achievement predicate]', def.code, e)
        }
      }
    } finally {
      _evaluating = false
    }
  }

  function subscribe(userId: string) {
    if (!isConfigured) return
    if (_channel && _userId === userId) return
    if (_channel) supabase.removeChannel(_channel)
    _userId = userId

    _channel = supabase
      .channel(`achievements:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'achievements',
        filter: `user_id=eq.${userId}`,
      }, () => fetch())
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Reset backoff on a clean connection. (B121)
          _reconnectDelay = 2_000
          if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
        }
        if (status === 'CHANNEL_ERROR') {
          // Schedule a reconnect with exponential backoff (2s → 4s → 8s … capped
          // at 30s) instead of silently losing realtime achievement unlocks. (B121)
          console.error('[Achievements] Channel error — reconnecting in', _reconnectDelay, 'ms')
          if (_reconnectTimer) clearTimeout(_reconnectTimer)
          const delay = _reconnectDelay
          _reconnectDelay = Math.min(_reconnectDelay * 2, 30_000)
          _reconnectTimer = setTimeout(() => {
            _reconnectTimer = null
            if (_channel) { supabase.removeChannel(_channel); _channel = null; _userId = null }
            subscribe(userId)
          }, delay)
        }
      })
  }

  function unsubscribe() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
    _userId = null
    unlocked.value = []
  }

  return {
    unlocked,
    definitions,
    unlockedCodes,
    fetch,
    unlock,
    evaluate,
    subscribe,
    unsubscribe,
  }
})
