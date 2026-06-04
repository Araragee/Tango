import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'

interface PresenceState {
  user_id: string
  online_at: string
}

export const usePresenceStore = defineStore('presence', () => {
  const onlineUserIds = ref<Set<string>>(new Set())
  const isOnline = ref<boolean>(navigator.onLine)

  let _channel: RealtimeChannel | null = null
  let _householdId: string | null = null
  // Exponential-backoff reconnect on CHANNEL_ERROR, matching useStore.ts (B101). (B118)
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _reconnectDelay = 2_000

  function handleNetworkChange() {
    isOnline.value = navigator.onLine
  }

  let _watchActive = false

  function startNetworkWatch() {
    if (_watchActive) return
    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)
    _watchActive = true
  }

  function stopNetworkWatch() {
    window.removeEventListener('online', handleNetworkChange)
    window.removeEventListener('offline', handleNetworkChange)
    _watchActive = false
  }

  async function subscribe(householdId: string) {
    if (!isConfigured) return
    if (_channel && _householdId === householdId) return

    const auth = useAuthStore()
    if (!auth.user) return

    if (_channel) {
      await supabase.removeChannel(_channel)
      _channel = null
    }

    _householdId = householdId

    _channel = supabase.channel(`presence:${householdId}`, {
      config: { presence: { key: auth.user.id } },
    })

    _channel
      .on('presence', { event: 'sync' }, () => {
        if (!_channel) return
        const state = _channel.presenceState<PresenceState>()
        const ids = new Set<string>()
        for (const key of Object.keys(state)) {
          ids.add(key)
        }
        onlineUserIds.value = ids
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        onlineUserIds.value = new Set([...onlineUserIds.value, key])
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        const next = new Set(onlineUserIds.value)
        next.delete(key)
        onlineUserIds.value = next
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && _channel && auth.user) {
          // Reset backoff on a clean connection. (B118)
          _reconnectDelay = 2_000
          if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
          await _channel.track({
            user_id: auth.user.id,
            online_at: new Date().toISOString(),
          })
        }
        if (status === 'CHANNEL_ERROR') {
          // Schedule a reconnect with exponential backoff (2s → 4s → 8s … capped
          // at 30s). Without this, a presence channel error silently breaks
          // partner-online indicators for the entire session. (B118)
          console.error('[Presence] Channel error — reconnecting in', _reconnectDelay, 'ms')
          if (_reconnectTimer) clearTimeout(_reconnectTimer)
          const delay = _reconnectDelay
          _reconnectDelay = Math.min(_reconnectDelay * 2, 30_000)
          _reconnectTimer = setTimeout(() => {
            _reconnectTimer = null
            if (_channel) { supabase.removeChannel(_channel); _channel = null; _householdId = null }
            subscribe(householdId)
          }, delay)
        }
      })
  }

  async function unsubscribe() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
    if (_channel) {
      try { await _channel.untrack() } catch {}
      await supabase.removeChannel(_channel)
      _channel = null
    }
    _householdId = null
    onlineUserIds.value = new Set()
  }

  function isUserOnline(userId: string) {
    return onlineUserIds.value.has(userId)
  }

  const onlineCount = computed(() => onlineUserIds.value.size)

  startNetworkWatch()

  return {
    onlineUserIds,
    onlineCount,
    isOnline,
    isUserOnline,
    subscribe,
    unsubscribe,
    stopNetworkWatch,
  }
})
