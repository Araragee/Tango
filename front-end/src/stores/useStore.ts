import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useHouseholdStore } from './useHouseholdStore'
import { useAuthStore } from './useAuthStore'
import { useOfflineQueue } from './useOfflineQueue'
import { saveReadCache, loadReadCache } from '@/composables/useReadCache'
import { categoryIcon } from '@/utils/categoryIcons'

export class VersionConflictError extends Error {
  constructor(public table: string, public id: string) {
    super('This item was changed elsewhere. Please refresh to see the latest version.')
    this.name = 'VersionConflictError'
  }
}

function isNetworkError(e: any): boolean {
  if (!e) return false
  if (!navigator.onLine) return true
  const msg = String(e.message ?? e).toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  title: string
  amount: number
  date: string
  type: 'expense' | 'income'
  icon: string
  category: string
  note?: string | null
  receipt_url?: string | null
  version?: number
}

export interface Goal {
  id: string
  title: string
  description: string
  saved: number
  target: number
  status: string
  icon: string
  progress: number
  deadline?: string | null
  completed_at?: string | null
  version?: number
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  category: string
  shared?: boolean
  subtext?: string
  assigned?: string
  assignee_id?: string | null
  priority?: 'Chill' | 'Normal' | 'ASAP'
  due_date?: string | null
  created_at?: string | null
  completed_at?: string | null
  version?: number
}

export interface CalendarEvent {
  id: string
  title: string
  time: string
  date: string
  category: string
  partners: string[]
  icon: string
  mood?: number | null
  review_note?: string | null
  notes?: string | null
  version?: number
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapTransaction(r: any): Transaction {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    date: r.date,
    type: r.type,
    icon: r.icon,
    category: r.category,
    // Use null (not undefined) to preserve the database value faithfully.
    // `null ?? undefined` evaluates to `undefined`, which is a type mismatch
    // with the Transaction interface (string | null) and can cause subtle
    // JSON-serialisation edge-cases when the value is later spread into
    // Supabase update payloads. (B86)
    note: r.note ?? null,
    receipt_url: r.receipt_url ?? null,
    version: r.version,
  }
}

function mapGoal(r: any): Goal {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    saved: Number(r.saved),
    target: Number(r.target),
    status: r.status,
    icon: r.icon,
    progress: r.progress,
    deadline: r.deadline ?? null,
    completed_at: r.completed_at ?? null,
    version: r.version,
  }
}

function mapTodo(r: any): Todo {
  return {
    id: r.id,
    text: r.text,
    completed: r.completed,
    category: r.category,
    shared: r.shared,
    subtext: r.subtext,
    assigned: r.assigned,
    assignee_id: r.assignee_id ?? null,
    priority: r.priority,
    due_date: r.due_date,
    created_at: r.created_at ?? null,
    completed_at: r.completed_at ?? null,
    version: r.version,
  }
}

function mapEvent(r: any): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    time: r.time,
    date: r.date,
    category: r.category,
    partners: r.partners ?? [],
    icon: r.icon,
    mood: r.mood ?? null,
    review_note: r.review_note ?? null,
    notes: r.notes ?? null,
    version: r.version,
  }
}

// categoryIcon is imported from @/utils/categoryIcons — see top of file.

function calcProgress(saved: number, target: number) {
  // Guard against target=0: saved/0 = Infinity (or NaN when saved=0 too),
  // which causes calcStatus to mis-classify the goal as 'Completed'.
  // Use Math.max(1, target) as a floor — matches the B69 fix pattern. (B83)
  return Math.round((saved / Math.max(1, target)) * 100)
}

function calcStatus(progress: number) {
  return progress >= 100 ? 'Completed' : progress >= 50 ? 'On Track' : 'Behind'
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = defineStore('app', () => {
  // State
  const userName = ref('Alex')
  const partnerName = ref('Sam')
  const avatarUrl = ref<string | null>(null)
  const partnerAvatarUrl = ref<string | null>(null)

  const balance = ref(0)
  const savedThisMonth = ref(0)
  const budgetLastUpdated = ref<Date | null>(null)
  const monthlySpending = ref<{ id: string; category: string; spent: number; icon: string }[]>([])
  const recentActivity = ref<Transaction[]>([])

  const goals = ref<Goal[]>([])
  const todos = ref<Todo[]>([])
  const events = ref<CalendarEvent[]>([])

  // Internal
  let _channel: RealtimeChannel | null = null
  let _subscribedHouseholdId: string | null = null
  // Exponential-backoff reconnect on CHANNEL_ERROR. (B101)
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let _reconnectDelay = 2_000 // ms; doubles on each retry, capped at 30s
  const loading = ref(false)

  // ── Profiles ──────────────────────────────────────────────────────────────

  async function fetchProfiles() {
    const household = useHouseholdStore()
    const auth = useAuthStore()
    if (!isConfigured || !household.householdId || !auth.user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', household.members.map(m => m.user_id))

    if (error) { console.error('[fetchProfiles]', error); return }

    const myProfile = data?.find(p => p.id === auth.user?.id)
    const partnerProfile = data?.find(p => p.id !== auth.user?.id)

    if (myProfile) {
      userName.value = myProfile.display_name
      avatarUrl.value = myProfile.avatar_url ?? null
    }
    if (partnerProfile) {
      partnerName.value = partnerProfile.display_name
      partnerAvatarUrl.value = partnerProfile.avatar_url ?? null
    } else {
      partnerAvatarUrl.value = null
    }
  }

  async function updateProfile(newDisplayName: string) {
    const auth = useAuthStore()

    // Apply immediately (optimistic) — works in demo mode and offline
    const previousName = userName.value
    userName.value = newDisplayName

    if (!isConfigured || !auth.user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: auth.user.id, display_name: newDisplayName })

      if (error) throw error
    } catch (e: any) {
      if (isNetworkError(e)) {
        // Queue for retry when the network comes back
        await useOfflineQueue().enqueue(
          'profiles',
          'update',
          { display_name: newDisplayName },
          auth.user.id,
        )
        return
      }
      // Non-network error — roll back the optimistic update
      userName.value = previousName
      throw e
    }
  }

  // Allowed MIME types for avatar uploads — reject anything else client-side
  // before it ever hits Supabase storage.  The storage bucket should also have
  // a server-side MIME restriction, but this is a fast first line of defence.
  const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

  async function uploadAvatar(file: File): Promise<string> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')
    if (!isConfigured) throw new Error('Supabase not configured')
    if (!navigator.onLine) throw new Error('Cannot upload avatar while offline.')

    // Validate MIME type against an allowlist (extension spoofing protection)
    if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.')
    }
    // Cap file size at 5 MB client-side
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image is too large. Maximum size is 5 MB.')
    }

    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = publicData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', auth.user.id)
    if (updateError) throw updateError

    avatarUrl.value = publicUrl
    return publicUrl
  }

  async function removeAvatar() {
    const auth = useAuthStore()
    if (!auth.user) return
    if (!isConfigured) {
      avatarUrl.value = null
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', auth.user.id)
    if (error) throw error
    avatarUrl.value = null
  }

  // ── Fetch helpers ────────────────────────────────────────────────────────

  async function fetchBudget() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const cacheKey = `${household.householdId}:transactions`
    const cached = await loadReadCache<Transaction>(cacheKey)
    if (cached) { recentActivity.value = cached; recalculateBudget() }
    else { recentActivity.value = []; recalculateBudget() }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: false })

    if (error) { console.error('[fetchBudget]', error); return }

    recentActivity.value = (data ?? []).map(mapTransaction)
    recalculateBudget()
    saveReadCache(cacheKey, recentActivity.value)
  }

  async function fetchGoals() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const cacheKey = `${household.householdId}:goals`
    const cached = await loadReadCache<Goal>(cacheKey)
    if (cached) goals.value = cached

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[fetchGoals]', error); return }
    goals.value = (data ?? []).map(mapGoal)
    saveReadCache(cacheKey, goals.value)
  }

  async function fetchTodos() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const cacheKey = `${household.householdId}:todos`
    const cached = await loadReadCache<Todo>(cacheKey)
    if (cached) todos.value = cached

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[fetchTodos]', error); return }
    todos.value = (data ?? []).map(mapTodo)
    saveReadCache(cacheKey, todos.value)
  }

  async function fetchCalendar() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const cacheKey = `${household.householdId}:calendar_events`
    const cached = await loadReadCache<CalendarEvent>(cacheKey)
    if (cached) events.value = cached
    else events.value = []

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('household_id', household.householdId)
      .order('date', { ascending: true })

    if (error) { console.error('[fetchCalendar]', error); return }
    events.value = (data ?? []).map(mapEvent)
    saveReadCache(cacheKey, events.value)
  }

  // ── fetchAll + Realtime ──────────────────────────────────────────────────

  async function fetchAll() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return
    loading.value = true
    try {
      await Promise.all([fetchBudget(), fetchGoals(), fetchTodos(), fetchCalendar(), fetchProfiles()])
    } finally {
      loading.value = false
    }
    // Boot realtime after initial fetch (idempotent)
    subscribeRealtime(household.householdId)
  }

  function subscribeRealtime(householdId: string) {
    if (!isConfigured) return

    // Idempotency guard — fetchAll() calls this after every initial load.
    // Re-creating the channel for the same household causes a brief subscription
    // gap; skip if we're already subscribed to this exact household. (I10)
    if (_channel && _subscribedHouseholdId === householdId) return

    // Tear down any existing channel first (different household or reconnect)
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
      _subscribedHouseholdId = null
    }

    // Build the profiles filter only when we have member IDs.  An empty IN-list
    // `id=in.()` is invalid SQL and causes a CHANNEL_ERROR; a solo user or a race
    // where members haven't loaded yet would trigger this. (B70)
    const memberIds = useHouseholdStore().members.map(m => m.user_id)

    let channel = supabase
      .channel(`tango:${householdId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `household_id=eq.${householdId}`,
      }, () => fetchBudget())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'goals',
        filter: `household_id=eq.${householdId}`,
      }, () => fetchGoals())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'todos',
        filter: `household_id=eq.${householdId}`,
      }, () => fetchTodos())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'calendar_events',
        filter: `household_id=eq.${householdId}`,
      }, () => fetchCalendar())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'household_members',
        filter: `household_id=eq.${householdId}`,
      }, () => {
        const household = useHouseholdStore()
        // After loading the updated member list, rebuild the realtime channel so
        // the profiles subscription filter includes the new partner's user_id.
        // Without the rebuild the profiles listener keeps the snapshotted
        // memberIds from channel creation time and future profile edits by the
        // new partner are never received. (B78)
        household.loadMembers().then(() => {
          fetchProfiles()
          // Force a channel rebuild by clearing the idempotency guard, then
          // resubscribing with the now-updated member list.
          unsubscribeRealtime()
          subscribeRealtime(householdId)
        })
      })

    if (memberIds.length > 0) {
      channel = channel.on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles',
        filter: `id=in.(${memberIds.join(',')})`,
      }, () => fetchProfiles())
    }

    _channel = channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to household:', householdId)
        // Reset reconnect delay on a clean connection. (B101)
        _reconnectDelay = 2_000
        if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
      }
      if (status === 'CHANNEL_ERROR') {
        // Instead of silently losing realtime, schedule a reconnect with
        // exponential backoff (2s → 4s → 8s … capped at 30s). Tear down
        // the broken channel so subscribeRealtime's idempotency guard
        // doesn't block the retry. (B101)
        console.error('[Realtime] Channel error — reconnecting in', _reconnectDelay, 'ms')
        if (_reconnectTimer) clearTimeout(_reconnectTimer)
        const delay = _reconnectDelay
        _reconnectDelay = Math.min(_reconnectDelay * 2, 30_000)
        _reconnectTimer = setTimeout(() => {
          _reconnectTimer = null
          // Clear idempotency guard so the retry actually rebuilds the channel.
          if (_channel) { supabase.removeChannel(_channel); _channel = null; _subscribedHouseholdId = null }
          subscribeRealtime(householdId)
        }, delay)
      }
    })
    _subscribedHouseholdId = householdId
  }

  function unsubscribeRealtime() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
      _subscribedHouseholdId = null
    }
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()

    if (!isConfigured || !household.householdId) {
      recentActivity.value.unshift({ ...transaction, id: crypto.randomUUID() })
      // Use recalculateBudget so savedThisMonth, budgetLastUpdated, and
      // monthlySpending (the category breakdown) all update in demo mode.
      // Previously only balance was incremented directly, leaving the Spending
      // Breakdown and Vibe Check stale. (B73)
      recalculateBudget()
      return
    }

    const id = crypto.randomUUID()
    const newTx = { ...transaction, id } as Transaction
    recentActivity.value.unshift(newTx)
    recalculateBudget()

    const payload = {
      id,
      household_id: household.householdId,
      created_by: auth.user?.id,
      updated_by: auth.user?.id,
      ...transaction,
    }

    const { error } = await supabase.from('transactions').insert(payload)

    if (error) {
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('transactions', 'insert', payload, id)
        return
      }
      recentActivity.value = recentActivity.value.filter(t => t.id !== id)
      recalculateBudget()
      throw error
    }
  }

  function recalculateBudget() {
    balance.value = recentActivity.value.reduce((s, t) => s + t.amount, 0)

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    savedThisMonth.value = recentActivity.value
      .filter(t => t.type === 'income' && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0)

    budgetLastUpdated.value = new Date()

    const categories: Record<string, number> = {}
    recentActivity.value
      .filter(t => t.type === 'expense' && t.date.startsWith(thisMonth))
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount)
      })

    // Sort by spent descending so the most impactful category is always first
    // in the breakdown, regardless of the insertion order of transactions in
    // recentActivity (which changes as new transactions arrive). (I14)
    monthlySpending.value = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([name, spent]) => ({
        id: name,
        category: name,
        spent,
        icon: categoryIcon(name),
      }))
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    const tx = recentActivity.value.find(t => t.id === id)
    if (!tx) return

    const auth = useAuthStore()
    const expectedVersion = tx.version
    const oldTx = { ...tx }
    Object.assign(tx, updates)
    recalculateBudget()

    if (!isConfigured) return

    let q = supabase.from('transactions').update({ ...updates, updated_by: auth.user?.id }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      Object.assign(tx, oldTx)
      recalculateBudget()
      throw error
    }
    if (!data || data.length === 0) {
      Object.assign(tx, oldTx)
      recalculateBudget()
      throw new VersionConflictError('transactions', id)
    }
    tx.version = data[0].version
  }

  async function deleteTransaction(id: string) {
    const idx = recentActivity.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const removed = recentActivity.value[idx]
    recentActivity.value.splice(idx, 1)
    recalculateBudget()

    if (!isConfigured) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('transactions', 'delete', {}, id)
        return
      }
      recentActivity.value.splice(idx, 0, removed)
      recalculateBudget()
      throw error
    }
  }

  // ── Goals ────────────────────────────────────────────────────────────────

  async function addGoal(goal: Omit<Goal, 'id' | 'progress' | 'status'>): Promise<string> {
    const household = useHouseholdStore()
    const auth = useAuthStore()
    const progress = calcProgress(goal.saved, goal.target)
    const status = calcStatus(progress)

    if (!isConfigured || !household.householdId) {
      const id = crypto.randomUUID()
      goals.value.push({ ...goal, id, progress, status })
      return id
    }

    const id = crypto.randomUUID()
    const newGoal = { ...goal, id, progress, status } as Goal
    goals.value.push(newGoal)

    const payload = {
      id,
      household_id: household.householdId,
      created_by: auth.user?.id,
      progress,
      status,
      ...goal,
    }

    const { error } = await supabase.from('goals').insert(payload)

    if (error) {
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('goals', 'insert', payload, id)
        return id
      }
      goals.value = goals.value.filter(g => g.id !== id)
      throw error
    }
    // Return the new goal's ID so callers (e.g. EditGoalModal initial-contribution
    // flow) can reliably reference the correct goal without fragile array-index
    // lookups. (B68)
    return id
  }

  async function editGoal(id: string, updates: Partial<Goal>) {
    const goal = goals.value.find(g => g.id === id)
    if (!goal) return

    const saved = updates.saved ?? goal.saved
    const target = updates.target ?? goal.target ?? 1
    const progress = calcProgress(saved, target)
    const status = calcStatus(progress)

    const expectedVersion = goal.version
    const oldGoal = { ...goal }
    Object.assign(goal, updates, { progress, status })

    if (!isConfigured) return

    let q = supabase.from('goals').update({
      ...updates,
      progress,
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      Object.assign(goal, oldGoal)
      throw error
    }
    if (!data || data.length === 0) {
      Object.assign(goal, oldGoal)
      throw new VersionConflictError('goals', id)
    }
    goal.version = data[0].version
  }

  async function deleteGoal(id: string) {
    // Optimistic removal — mirrors deleteTransaction pattern so we can roll back
    // if the server call fails (previously there was no rollback here).
    const idx = goals.value.findIndex(g => g.id === id)
    if (idx === -1) return
    const removed = goals.value[idx]
    goals.value.splice(idx, 1)

    if (!isConfigured) return

    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) {
      // Offline: queue the delete for replay on reconnect instead of rolling
      // back, matching deleteTransaction's offline-first behaviour. (B103)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('goals', 'delete', {}, id)
        return
      }
      // Restore the goal at its original position on failure
      goals.value.splice(idx, 0, removed)
      throw error
    }
  }

  async function completeGoal(id: string) {
    const goal = goals.value.find(g => g.id === id)
    if (!goal) return
    const oldStatus = goal.status
    // Save the prior completed_at so we can restore it exactly on rollback.
    // Previously the rollback always set completed_at = null, which would
    // incorrectly clear a pre-existing value if completeGoal ever errored on
    // an already-completed goal. (B102)
    const oldCompletedAt = goal.completed_at
    // Optimistic update — works in both demo and configured modes
    goal.status = 'Completed'
    goal.completed_at = goal.completed_at ?? new Date().toISOString()

    if (!isConfigured) return

    const { error } = await supabase
      .from('goals')
      .update({ status: 'Completed', completed_at: goal.completed_at })
      .eq('id', id)
    if (error) {
      goal.status = oldStatus
      goal.completed_at = oldCompletedAt  // restore prior value, not always null
      throw error
    }
  }

  async function updateGoalProgress(id: string, saved: number) {
    const goal = goals.value.find(g => g.id === id)
    if (!goal) return

    const target = goal.target ?? 1
    const progress = calcProgress(saved, target)
    const status = calcStatus(progress)

    // Optimistic update — works in demo mode and gives instant UI feedback
    const oldSaved = goal.saved
    const oldProgress = goal.progress
    const oldStatus = goal.status
    Object.assign(goal, { saved, progress, status })

    if (!isConfigured) return

    const { error } = await supabase.from('goals').update({ saved, progress, status }).eq('id', id)
    if (error) {
      // Roll back on server error
      Object.assign(goal, { saved: oldSaved, progress: oldProgress, status: oldStatus })
      throw error
    }
  }

  // ── Todos ────────────────────────────────────────────────────────────────

  async function addTask(task: Omit<Todo, 'id' | 'completed'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()

    if (!isConfigured || !household.householdId) {
      todos.value.push({ ...task, id: crypto.randomUUID(), completed: false })
      return
    }

    const id = crypto.randomUUID()
    const newTask = { ...task, id, completed: false } as Todo
    todos.value.push(newTask)

    const payload = {
      id,
      household_id: household.householdId,
      owner_id: auth.user?.id,
      completed: false,
      shared: true,
      updated_by: auth.user?.id,
      ...task,
    }

    const { error } = await supabase.from('todos').insert(payload)

    if (error) {
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('todos', 'insert', payload, id)
        return
      }
      todos.value = todos.value.filter(t => t.id !== id)
      throw error
    }
  }

  async function deleteTask(id: string) {
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const removed = todos.value[idx]
    todos.value.splice(idx, 1)

    if (!isConfigured) return

    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) {
      // Offline: queue the delete for replay on reconnect instead of rolling
      // back, matching deleteTransaction's offline-first behaviour. (B103)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('todos', 'delete', {}, id)
        return
      }
      // Roll back the optimistic removal on server error
      todos.value.splice(idx, 0, removed)
      throw error
    }
  }

  async function toggleTodo(id: string) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    const auth = useAuthStore()
    const oldStatus = todo.completed
    const oldCompletedAt = todo.completed_at
    const expectedVersion = todo.version
    todo.completed = !todo.completed
    // Stamp completed_at on flip so the Monthly Report (F7) can attribute
    // completions to the correct calendar month. Cleared when un-completing
    // so a re-completion in a later month is counted in that later month.
    todo.completed_at = todo.completed ? new Date().toISOString() : null

    if (!isConfigured) return

    let q = supabase.from('todos').update({
      completed: todo.completed,
      completed_at: todo.completed_at,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id,
    }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      todo.completed = oldStatus
      todo.completed_at = oldCompletedAt
      throw error
    }
    if (!data || data.length === 0) {
      todo.completed = oldStatus
      todo.completed_at = oldCompletedAt
      throw new VersionConflictError('todos', id)
    }
    todo.version = data[0].version
  }

  async function editTask(id: string, updates: Partial<Omit<Todo, 'id' | 'completed'>>) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    const auth = useAuthStore()
    const expectedVersion = todo.version
    const oldTodo = { ...todo }
    Object.assign(todo, updates)

    if (!isConfigured) return

    let q = supabase.from('todos').update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id,
    }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      Object.assign(todo, oldTodo)
      throw error
    }
    if (!data || data.length === 0) {
      Object.assign(todo, oldTodo)
      throw new VersionConflictError('todos', id)
    }
    todo.version = data[0].version
  }

  // ── Calendar ─────────────────────────────────────────────────────────────

  async function addEvent(event: Omit<CalendarEvent, 'id'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()

    if (!isConfigured || !household.householdId) {
      events.value.push({ ...event, id: crypto.randomUUID() })
      return
    }

    const id = crypto.randomUUID()
    const newEvent = { ...event, id } as CalendarEvent
    events.value.push(newEvent)

    const payload = {
      id,
      household_id: household.householdId,
      created_by: auth.user?.id,
      updated_by: auth.user?.id,
      ...event,
    }

    const { error } = await supabase.from('calendar_events').insert(payload)

    if (error) {
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('calendar_events', 'insert', payload, id)
        return
      }
      events.value = events.value.filter(e => e.id !== id)
      throw error
    }
  }

  async function editEvent(id: string, updates: Partial<CalendarEvent>) {
    const event = events.value.find(e => e.id === id)
    if (!event) return

    const auth = useAuthStore()
    const expectedVersion = event.version
    const oldEvent = { ...event }
    Object.assign(event, updates)

    if (!isConfigured) return

    let q = supabase.from('calendar_events').update({ ...updates, updated_by: auth.user?.id }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      Object.assign(event, oldEvent)
      throw error
    }
    if (!data || data.length === 0) {
      Object.assign(event, oldEvent)
      throw new VersionConflictError('calendar_events', id)
    }
    event.version = data[0].version
  }

  async function deleteEvent(id: string) {
    const idx = events.value.findIndex(e => e.id === id)
    if (idx === -1) return
    const removed = events.value[idx]
    events.value.splice(idx, 1)

    if (!isConfigured) return

    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) {
      // Offline: queue the delete for replay on reconnect instead of rolling
      // back, matching deleteTransaction's offline-first behaviour. (B103)
      if (isNetworkError(error)) {
        await useOfflineQueue().enqueue('calendar_events', 'delete', {}, id)
        return
      }
      events.value.splice(idx, 0, removed)
      throw error
    }
  }

  // ── Compat shape ─────────────────────────────────────────────────────────
  // Components access store.budget.recentActivity, store.plans.goals, etc.
  // computed() ensures Vue's template system tracks the underlying refs.
  const _budget = computed(() => ({
    balance: balance.value,
    savedThisMonth: savedThisMonth.value,
    monthlySpending: monthlySpending.value,
    recentActivity: recentActivity.value,
    lastUpdated: budgetLastUpdated.value,
  }))
  const _plans = computed(() => ({ goals: goals.value }))
  const _todos = computed(() => ({ items: todos.value }))
  const _calendar = computed(() => ({ events: events.value }))

  // ── Exposed ──────────────────────────────────────────────────────────────

  return {
    loading,
    userName,
    partnerName,
    avatarUrl,
    partnerAvatarUrl,

    budget: _budget,
    plans: _plans,
    todos: _todos,
    calendar: _calendar,

    // Actions
    updateProfile,
    uploadAvatar,
    removeAvatar,
    fetchBudget,
    fetchGoals,
    fetchTodos,
    fetchCalendar,
    fetchAll,
    subscribeRealtime,
    unsubscribeRealtime,

    addTransaction,
    updateTransaction,
    deleteTransaction,

    addGoal,
    editGoal,
    deleteGoal,
    completeGoal,
    updateGoalProgress,

    addTask,
    editTask,
    deleteTask,
    toggleTodo,

    addEvent,
    editEvent,
    deleteEvent,

    syncWithPartner() { /* handled by Realtime */ },
    updateBalance(amount: number) { balance.value = amount },
  }
}, {
  persist: {
    key: 'tango:app',
    pick: ['userName', 'partnerName', 'avatarUrl', 'partnerAvatarUrl'],
  },
})
