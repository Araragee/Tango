import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useAppStore } from './useStore'
import { useOfflineQueue } from './useOfflineQueue'

function isNetworkError(e: any): boolean {
  if (!e) return false
  if (!navigator.onLine) return true
  const msg = String(e.message ?? e).toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')
}

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  household_id: string
  created_by: string
  title: string
  amount: number
  type: 'expense' | 'income'
  category: string
  icon: string
  cadence: Cadence
  start_date: string
  end_date: string | null
  next_run_at: string
  last_run_at: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

function mapRecurring(r: any): RecurringTransaction {
  return {
    id: r.id,
    household_id: r.household_id,
    created_by: r.created_by,
    title: r.title,
    amount: Number(r.amount),
    type: r.type,
    category: r.category,
    icon: r.icon,
    cadence: r.cadence,
    start_date: r.start_date,
    end_date: r.end_date,
    next_run_at: r.next_run_at,
    last_run_at: r.last_run_at,
    active: r.active,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

// Use local date (not UTC) so spawnDueAndAdvance compares using the same
// calendar day the user is in. toISOString() returns UTC, which for
// positive-UTC-offset timezones (e.g. UTC+10) would return tomorrow's date
// at local evening hours, causing bills to spawn a day early. (B107)
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useRecurringStore = defineStore('recurring', () => {
  const items = ref<RecurringTransaction[]>([])
  const loading = ref(false)

  let _channel: RealtimeChannel | null = null
  let _householdId: string | null = null
  // Exponential-backoff reconnect on CHANNEL_ERROR, matching useStore.ts (B101). (B115)
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _reconnectDelay = 2_000

  const active = computed(() => items.value.filter(r => r.active))
  const upcoming = computed(() =>
    [...active.value].sort((a, b) => a.next_run_at.localeCompare(b.next_run_at))
  )

  async function fetch(householdId: string) {
    if (!isConfigured || !householdId) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('household_id', householdId)
        .order('next_run_at', { ascending: true })

      if (error) { console.error('[recurring]', error); return }
      items.value = (data ?? []).map(mapRecurring)
    } finally {
      loading.value = false
    }
  }

  async function add(
    householdId: string,
    payload: {
      title: string
      amount: number
      type: 'expense' | 'income'
      category: string
      icon: string
      cadence: Cadence
      start_date: string
      end_date?: string | null
      notes?: string | null
    },
  ) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')

    const id = crypto.randomUUID()
    const optimistic: RecurringTransaction = {
      id,
      household_id: householdId,
      created_by: auth.user.id,
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
      category: payload.category,
      icon: payload.icon,
      cadence: payload.cadence,
      start_date: payload.start_date,
      end_date: payload.end_date ?? null,
      next_run_at: payload.start_date,
      last_run_at: null,
      active: true,
      notes: payload.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    items.value = [optimistic, ...items.value]

    if (!isConfigured) return optimistic

    const insertPayload = {
      id,
      household_id: householdId,
      created_by: auth.user.id,
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
      category: payload.category,
      icon: payload.icon,
      cadence: payload.cadence,
      start_date: payload.start_date,
      end_date: payload.end_date ?? null,
      next_run_at: payload.start_date,
      notes: payload.notes ?? null,
    }

    const { error } = await supabase.from('recurring_transactions').insert(insertPayload)

    if (error) {
      // Enqueue for retry when the network comes back, consistent with all other
      // write paths (addTransaction, addGoal, addContribution). Without this,
      // adding a recurring template while offline silently drops the item. (B94)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('recurring_transactions', 'insert', insertPayload, id)
        return optimistic
      }
      items.value = items.value.filter(r => r.id !== id)
      throw error
    }
    return optimistic
  }

  async function update(id: string, patch: Partial<RecurringTransaction>) {
    const target = items.value.find(r => r.id === id)
    if (!target) return
    const old = { ...target }
    Object.assign(target, patch, { updated_at: new Date().toISOString() })

    if (!isConfigured) return

    const updatePayload = { ...patch, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('recurring_transactions')
      .update(updatePayload)
      .eq('id', id)
    if (error) {
      // Offline: queue the update for replay on reconnect instead of rolling
      // back, matching the offline-first behaviour of other write paths. (B108)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('recurring_transactions', 'update', updatePayload, id)
        return
      }
      Object.assign(target, old)
      throw error
    }
  }

  async function remove(id: string) {
    const idx = items.value.findIndex(r => r.id === id)
    if (idx === -1) return
    const removed = items.value[idx]
    items.value.splice(idx, 1)
    if (!isConfigured) return
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
    if (error) {
      // Offline: queue the delete for replay on reconnect instead of rolling
      // back, matching deleteGoal/deleteTask/deleteEvent offline-first behaviour. (B106)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('recurring_transactions', 'delete', {}, id)
        return
      }
      items.value.splice(idx, 0, removed)
      throw error
    }
  }

  async function togglePaused(id: string) {
    const target = items.value.find(r => r.id === id)
    if (!target) return
    await update(id, { active: !target.active })
  }

  /**
   * Spawn transactions for any recurring rows whose next_run_at <= today.
   * Uses the existing addTransaction flow to keep optimistic + realtime + audit log behaviour.
   * Calls advance_recurring_next RPC to bump the schedule afterwards.
   * Returns count of spawned transactions.
   *
   * Guard against concurrent invocations (onMounted auto-run + manual "Run due" button). (I9)
   */
  const spawning = ref(false)

  async function spawnDueAndAdvance(householdId: string): Promise<number> {
    if (!isConfigured || !householdId) return 0
    // Prevent double-spawn when onMounted auto-run and the "Run due" button race. (I9)
    if (spawning.value) return 0
    spawning.value = true

    try {
      const today = todayISO()
      const due = items.value.filter(r => r.active && r.next_run_at <= today)
      if (due.length === 0) return 0

      const store = useAppStore()

      let spawned = 0
      for (const r of due) {
        try {
          // Skip advancing the schedule when offline: addTransaction silently
          // enqueues to the offline queue without throwing, so calling
          // advance_recurring_next here would bump next_run_at before the
          // transaction is actually persisted, causing a lost transaction if the
          // queue replay fails. (B72)
          if (!navigator.onLine) {
            await store.addTransaction({
              title: r.title,
              amount: r.type === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount),
              date: r.next_run_at,
              type: r.type,
              icon: r.icon,
              category: r.category,
            })
            console.warn('[recurring] offline — transaction queued, schedule not advanced for', r.id)
            continue
          }

          await store.addTransaction({
            title: r.title,
            amount: r.type === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount),
            date: r.next_run_at,
            type: r.type,
            icon: r.icon,
            category: r.category,
          })
          const { error } = await supabase.rpc('advance_recurring_next', { r_id: r.id })
          if (error) {
            console.error('[recurring.advance]', error)
          } else {
            spawned += 1
          }
        } catch (e) {
          console.error('[recurring.spawn]', e)
        }
      }
      // Refresh local view of recurring rows
      await fetch(householdId)
      return spawned
    } finally {
      spawning.value = false
    }
  }

  function subscribe(householdId: string) {
    if (!isConfigured) return
    if (_channel && _householdId === householdId) return

    if (_channel) supabase.removeChannel(_channel)
    _householdId = householdId

    _channel = supabase
      .channel(`recurring:${householdId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'recurring_transactions',
        filter: `household_id=eq.${householdId}`,
      }, () => fetch(householdId))
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Reset backoff on a clean connection. (B115)
          _reconnectDelay = 2_000
          if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
        }
        if (status === 'CHANNEL_ERROR') {
          // Schedule a reconnect with exponential backoff (2s → 4s → 8s … capped
          // at 30s) instead of silently losing realtime updates. (B115)
          console.error('[Recurring] Channel error — reconnecting in', _reconnectDelay, 'ms')
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
    active,
    upcoming,
    loading,
    spawning,
    fetch,
    add,
    update,
    remove,
    togglePaused,
    spawnDueAndAdvance,
    subscribe,
    unsubscribe,
  }
})
