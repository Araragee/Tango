import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useHouseholdStore } from './useHouseholdStore'

export interface Contribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string | null
  created_at: string
}

function mapContribution(r: any): Contribution {
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

    const { error } = await supabase.from('goal_contributions').insert({
      id,
      goal_id: goalId,
      user_id: auth.user.id,
      amount,
      note: note ?? null,
    })

    if (error) {
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
      items.value = [removed, ...items.value]
      throw error
    }
  }

  function subscribe(householdId: string) {
    if (!isConfigured) return
    if (_channel && _householdId === householdId) return

    if (_channel) supabase.removeChannel(_channel)
    _householdId = householdId

    _channel = supabase
      .channel(`contributions:${householdId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'goal_contributions',
      }, async () => {
        const household = useHouseholdStore()
        if (household.householdId) await fetchForHousehold(household.householdId)
      })
      .subscribe()
  }

  function unsubscribe() {
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
