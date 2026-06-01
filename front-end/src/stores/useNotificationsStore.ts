import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface AppNotification {
  id: string
  user_id: string
  household_id: string | null
  type: string
  title: string
  body: string | null
  payload: Record<string, any> | null
  read_at: string | null
  created_at: string
}

const PAGE_SIZE = 50

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const loading = ref(false)

  let _channel: RealtimeChannel | null = null
  let _userId: string | null = null

  const unread = computed(() => items.value.filter(n => !n.read_at))
  const unreadCount = computed(() => unread.value.length)

  async function fetch() {
    const auth = useAuthStore()
    if (!isConfigured || !auth.user) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) { console.error('[notifications]', error); return }
      items.value = (data ?? []) as AppNotification[]
    } finally {
      loading.value = false
    }
  }

  async function markRead(ids?: string[]) {
    if (!isConfigured) return
    // An explicit empty array means "mark nothing" — treat the same as a no-op.
    // Previously, ids?.length evaluated to 0 (falsy) for [], falling through to
    // the mark-all else branch and marking every notification as read. (B96)
    if (Array.isArray(ids) && ids.length === 0) return
    const { error } = await supabase.rpc('mark_notifications_read', { ids: ids ?? null })
    if (error) { console.error('[markRead]', error); return }
    const now = new Date().toISOString()
    if (ids?.length) {
      items.value = items.value.map(n => ids.includes(n.id) ? { ...n, read_at: now } : n)
    } else {
      items.value = items.value.map(n => n.read_at ? n : { ...n, read_at: now })
    }
  }

  async function nudgePartnerTodo(todoId: string) {
    if (!isConfigured) throw new Error('Supabase not configured')
    const { error } = await supabase.rpc('nudge_partner_todo', { todo_id: todoId })
    if (error) throw error
  }

  async function remove(id: string) {
    if (!isConfigured) {
      items.value = items.value.filter(n => n.id !== id)
      return
    }
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter(n => n.id !== id)
  }

  function subscribe(userId: string) {
    if (!isConfigured) return
    if (_channel && _userId === userId) return

    if (_channel) supabase.removeChannel(_channel)
    _userId = userId

    _channel = supabase
      .channel(`notif:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const row = payload.new as AppNotification
        items.value = [row, ...items.value]
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const row = payload.new as AppNotification
        items.value = items.value.map(n => n.id === row.id ? row : n)
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const id = (payload.old as any).id
        items.value = items.value.filter(n => n.id !== id)
      })
      .subscribe()
  }

  function unsubscribe() {
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
    _userId = null
    items.value = []
  }

  return {
    items,
    unread,
    unreadCount,
    loading,
    fetch,
    markRead,
    nudgePartnerTodo,
    remove,
    subscribe,
    unsubscribe,
  }
})
