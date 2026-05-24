import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'

export interface AuditEntry {
  id: string
  household_id: string
  user_id: string | null
  table_name: string
  row_id: string
  action: 'insert' | 'update' | 'delete'
  before: Record<string, any> | null
  after: Record<string, any> | null
  summary: string | null
  created_at: string
}

const PAGE_SIZE = 50

export const useActivityStore = defineStore('activity', () => {
  const entries = ref<AuditEntry[]>([])
  const loading = ref(false)

  let _channel: RealtimeChannel | null = null
  let _householdId: string | null = null

  async function fetch(householdId: string) {
    if (!isConfigured || !householdId) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) { console.error('[activity]', error); return }
      entries.value = (data ?? []) as AuditEntry[]
    } finally {
      loading.value = false
    }
  }

  function subscribe(householdId: string) {
    if (!isConfigured) return
    if (_channel && _householdId === householdId) return

    if (_channel) supabase.removeChannel(_channel)
    _householdId = householdId

    _channel = supabase
      .channel(`audit:${householdId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'audit_log',
        filter: `household_id=eq.${householdId}`,
      }, (payload) => {
        const row = payload.new as AuditEntry
        // Guard against duplicate entries: Supabase may replay recent INSERT
        // events when the channel reconnects after a CHANNEL_ERROR. Prepending
        // without checking would show the same audit row twice. (B95)
        if (entries.value.some(e => e.id === row.id)) return
        // Trim to PAGE_SIZE (50) to stay consistent with the fetch() limit.
        // Previously sliced to PAGE_SIZE * 2 = 100, creating an asymmetry
        // between the initial fetch and the in-memory buffer. (I16)
        entries.value = [row, ...entries.value].slice(0, PAGE_SIZE)
      })
      .subscribe()
  }

  function unsubscribe() {
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
    _householdId = null
    entries.value = []
  }

  const recent = computed(() => entries.value.slice(0, 20))

  return {
    entries,
    recent,
    loading,
    fetch,
    subscribe,
    unsubscribe,
  }
})
