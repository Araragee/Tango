import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useHouseholdStore } from './useHouseholdStore'
import { useAuthStore } from './useAuthStore'
import { useOfflineQueue } from './useOfflineQueue'

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
  note?: string
  receipt_url?: string
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
  deadline?: string
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
  due_date?: string
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
    note: r.note ?? undefined,
    receipt_url: r.receipt_url ?? undefined,
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
    deadline: r.deadline,
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

function calcProgress(saved: number, target: number) {
  return Math.round((saved / target) * 100)
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
    if (!isConfigured || !auth.user) {
      userName.value = newDisplayName
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: auth.user.id, display_name: newDisplayName })

    if (error) throw error
    userName.value = newDisplayName
  }

  async function uploadAvatar(file: File): Promise<string> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')
    if (!isConfigured) throw new Error('Supabase not configured')

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

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: false })

    if (error) { console.error('[fetchBudget]', error); return }

    recentActivity.value = (data ?? []).map(mapTransaction)
    recalculateBudget()
  }

  async function fetchGoals() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[fetchGoals]', error); return }
    goals.value = (data ?? []).map(mapGoal)
  }

  async function fetchTodos() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('household_id', household.householdId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[fetchTodos]', error); return }
    todos.value = (data ?? []).map(mapTodo)
  }

  async function fetchCalendar() {
    const household = useHouseholdStore()
    if (!isConfigured || !household.householdId) return

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('household_id', household.householdId)
      .order('date', { ascending: true })

    if (error) { console.error('[fetchCalendar]', error); return }
    events.value = (data ?? []).map(mapEvent)
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

    // Tear down any existing channel first
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }

    _channel = supabase
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
        event: '*', schema: 'public', table: 'profiles',
      }, () => fetchProfiles())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'household_members',
        filter: `household_id=eq.${householdId}`,
      }, () => {
        const household = useHouseholdStore()
        household.loadMembers().then(() => fetchProfiles())
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') console.log('[Realtime] Subscribed to household:', householdId)
        if (status === 'CHANNEL_ERROR') console.error('[Realtime] Channel error')
      })
  }

  function unsubscribeRealtime() {
    if (_channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  async function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()

    if (!isConfigured || !household.householdId) {
      recentActivity.value.unshift({ ...transaction, id: crypto.randomUUID() })
      balance.value += transaction.amount
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

    monthlySpending.value = Object.entries(categories).map(([name, spent], i) => ({
      id: String(i),
      category: name,
      spent,
      icon: 'category'
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

  async function addGoal(goal: Omit<Goal, 'id' | 'progress' | 'status'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()
    const progress = calcProgress(goal.saved, goal.target)
    const status = calcStatus(progress)

    if (!isConfigured || !household.householdId) {
      goals.value.push({ ...goal, id: crypto.randomUUID(), progress, status })
      return
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
        return
      }
      goals.value = goals.value.filter(g => g.id !== id)
      throw error
    }
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
    if (!isConfigured) {
      goals.value = goals.value.filter(g => g.id !== id)
      return
    }
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  }

  async function completeGoal(id: string) {
    if (!isConfigured) {
      const goal = goals.value.find(g => g.id === id)
      if (goal) goal.status = 'Completed'
      return
    }
    const { error } = await supabase.from('goals').update({ status: 'Completed' }).eq('id', id)
    if (error) throw error
  }

  async function updateGoalProgress(id: string, saved: number) {
    const goal = goals.value.find(g => g.id === id)
    const target = goal?.target ?? 1
    const progress = calcProgress(saved, target)
    const status = calcStatus(progress)

    if (!isConfigured) {
      if (goal) Object.assign(goal, { saved, progress, status })
      return
    }

    const { error } = await supabase.from('goals').update({ saved, progress, status }).eq('id', id)
    if (error) throw error
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
    if (!isConfigured) {
      todos.value = todos.value.filter(t => t.id !== id)
      return
    }
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) throw error
  }

  async function toggleTodo(id: string) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    const auth = useAuthStore()
    const oldStatus = todo.completed
    const expectedVersion = todo.version
    todo.completed = !todo.completed

    if (!isConfigured) return

    let q = supabase.from('todos').update({
      completed: todo.completed,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id,
    }).eq('id', id)
    if (typeof expectedVersion === 'number') q = q.eq('version', expectedVersion)
    const { data, error } = await q.select('version')

    if (error) {
      todo.completed = oldStatus
      throw error
    }
    if (!data || data.length === 0) {
      todo.completed = oldStatus
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
})

