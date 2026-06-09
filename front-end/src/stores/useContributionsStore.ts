import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useHouseholdStore } from './useHouseholdStore'
import { useAppStore } from './useStore'
import { useOfflineQueue } from './useOfflineQueue'
import type { Database } from '@/types/database.types'

function isNetworkError(e: any): boolean {
  if (!e) return false
  if (!navigator.onLine) return true
  const msg = String(e.message ?? e).toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')
}

export interface Contribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string | null
  created_at: string
}

function mapContribution(r: Database['public']['Tables']['goal_contributions']['Row']): Contribution {
  return {
    id: r.id,
    goal_id: r.goal_id,
    user_id: r.user_id,
    amount: Number(r.amount),
    note: r.note ?? null,
    created_at: r.created_at,
  }
}

export const useContributionsStore = defineStore('contributions', () => {
  const items = ref<Contribution[]>([])
  const loading = ref(false)

  let _channel: RealtimeChannel | null = null
  let _householdId: string | null = null
  // Exponential-backoff reconnect on CHANNEL_ERROR, matching useStore.ts (B101)
  // and all other realtime stores. (B121)
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _reconnectDelay = 2_000

  async function fetchForHousehold(householdId: string) {
    if (!isConfigured || !householdId) return
    loading.value = true
    try {
      const { data: goalIds } = await supabase
        .from('goals')
        .select('id')
        .eq('household_id', householdId)

      const ids = (goalIds ?? []).map((g: any) => g.id)
      if (ids.length === 0) {
        items.value = []
        return
      }

      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .in('goal_id', ids)
        .order('created_at', { ascending: false })

      if (error) { console.error('[contributions]', error); return }
      items.value = (data ?? []).map(mapContribution)
    } finally {
      loading.value = false
    }
  }

  function forGoal(goalId: string) {
    return computed(() => items.value.filter(c => c.goal_id === goalId))
  }

  function totalsByUser(goalId: string) {
    return computed(() => {
      const totals: Record<string, number> = {}
      for (const c of items.value) {
        if (c.goal_id !== goalId) continue
        totals[c.user_id] = (totals[c.user_id] ?? 0) + c.amount
      }
      return totals
    })
  }

  async function addContribution(goalId: string, amount: number, note?: string) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')
    if (amount <= 0) throw new Error('Amount must be positive')

    const id = crypto.randomUUID()
    const optimistic: Contribution = {
      id,
      goal_id: goalId,
      user_id: auth.user.id,
      amount,
      note: note ?? null,
      created_at: new Date().toISOString(),
    }
    items.value = [optimistic, ...items.value]

    if (!isConfigured) return optimistic

    const insertPayload = {
      id,
      goal_id: goalId,
      user_id: auth.user.id,
      amount,
      note: note ?? null,
    }

    const { error } = await supabase.from('goal_contributions').insert(insertPayload)

    if (error) {
      // Enqueue offline rather than dropping the contribution silently. (B74)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('goal_contributions', 'insert', insertPayload, id)
        return optimistic
      }
      items.value = items.value.filter(c => c.id !== id)
      throw error
    }
    return optimistic
  }

  async function removeContribution(id: string) {
    const removed = items.value.find(c => c.id === id)
    if (!removed) return
    items.value = items.value.filter(c => c.id !== id)
    if (!isConfigured) return
    const { error } = await supabase.from('goal_contributions').delete().eq('id', id)
    if (error) {
      // Enqueue offline delete rather than silently dropping the operation. (B74)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('goal_contributions', 'delete', {}, id)
        return
      }
      items.value = [removed, ...items.value]
      throw error
    }
  }

  function subscribe(householdId: string) {
    if (!isConfigured) return
    if (_channel && _householdId === householdId) return

    if (_channel) supabase.removeChannel(_channel)
    _householdId = householdId

    // Note: Supabase realtime does not support IN-clause filters on non-FK columns,
    // so we can't filter goal_contributions directly by household. Instead we scope
    // by re-fetching through the household-scoped fetchForHousehold query, which only
    // returns contributions for goals that belong to this household.
    _channel = supabase
      .channel(`contributions:${householdId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'goal_contributions',
      }, async (payload) => {
        // Only process if the changed goal belongs to this household.
        const household = useHouseholdStore()
        if (!household.householdId) return

        const affectedGoalId = (payload.new as any)?.goal_id ?? (payload.old as any)?.goal_id

        // For UPDATE/DELETE: check our local contribution cache (fast, no network).
        // For INSERT: the contribution is new so it won't be in items yet — fall
        // back to the app store's goal list which is always scoped to this household.
        // This closes the residual cross-household leak where another household's
        // first contribution would unconditionally trigger a refetch here. (B71)
        const appStore = useAppStore()
        const isOurs = !affectedGoalId
          || items.value.some(c => c.goal_id === affectedGoalId)
          || appStore.plans.goals.some((g: any) => g.id === affectedGoalId)

        if (isOurs) {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newContrib = mapContribution(payload.new as any)
            if (!items.value.some(c => c.id === newContrib.id)) {
              items.value = [newContrib, ...items.value]
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedContrib = mapContribution(payload.new as any)
            const idx = items.value.findIndex(c => c.id === updatedContrib.id)
            if (idx !== -1) {
              items.value[idx] = updatedContrib
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as any).id
            if (deletedId) {
              items.value = items.value.filter(c => c.id !== deletedId)
            }
          } else {
            await fetchForHousehold(household.householdId)
          }
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Reset backoff on a clean connection. (B121)
          _reconnectDelay = 2_000
          if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
        }
        if (status === 'CHANNEL_ERROR') {
          // Schedule a reconnect with exponential backoff (2s → 4s → 8s … capped
          // at 30s) instead of silently losing realtime contribution updates. (B121)
          console.error('[Contributions] Channel error — reconnecting in', _reconnectDelay, 'ms')
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

  function unsubscribe() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
    _householdId = null
    items.value = []
  }

  return {
    items,
    loading,
    fetchForHousehold,
    forGoal,
    totalsByUser,
    addContribution,
    removeContribution,
    subscribe,
    unsubscribe,
  }
})
