import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useHouseholdStore } from './useHouseholdStore'
import { useAuthStore } from './useAuthStore'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  title: string
  amount: number
  date: string
  type: 'expense' | 'income'
  icon: string
  category: string
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
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  category: string
  shared?: boolean
  subtext?: string
  assigned?: string
  priority?: 'Chill' | 'Normal' | 'ASAP'
  due_date?: string
}

export interface CalendarEvent {
  id: string
  title: string
  time: string
  date: string
  category: string
  partners: string[]
  icon: string
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
    priority: r.priority,
    due_date: r.due_date,
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

  const balance = ref(0)
  const savedThisMonth = ref(0)
  const budgetLastUpdated = ref<Date | null>(null)
  const monthlySpending = ref<{ id: string; category: string; spent: number; limit: number; icon: string }[]>([])
  const recentActivity = ref<Transaction[]>([])

  const goals = ref<Goal[]>([])
  const todos = ref<Todo[]>([])
  const events = ref<CalendarEvent[]>([])

  // Internal
  let _channel: RealtimeChannel | null = null

  // ── Profiles ──────────────────────────────────────────────────────────────

  async function fetchProfiles() {
    const household = useHouseholdStore()
    const auth = useAuthStore()
    if (!isConfigured || !household.householdId || !auth.user) return

    // Get all members' profiles in the household
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', household.members.map(m => m.user_id))

    if (error) { console.error('[fetchProfiles]', error); return }

    const myProfile = data?.find(p => p.id === auth.user?.id)
    const partnerProfile = data?.find(p => p.id !== auth.user?.id)

    if (myProfile) userName.value = myProfile.display_name
    if (partnerProfile) partnerName.value = partnerProfile.display_name
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

    await Promise.all([fetchBudget(), fetchGoals(), fetchTodos(), fetchCalendar(), fetchProfiles()])

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
      // Demo / offline fallback
      recentActivity.value.unshift({ ...transaction, id: crypto.randomUUID() })
      balance.value += transaction.amount
      return
    }

    // Optimistic update
    const newTx = { ...transaction, id: crypto.randomUUID() } as Transaction
    recentActivity.value.unshift(newTx)
    recalculateBudget()

    const { error } = await supabase.from('transactions').insert({
      household_id: household.householdId,
      created_by: auth.user?.id,
      ...transaction,
    })
    
    if (error) {
      // Rollback on error
      recentActivity.value = recentActivity.value.filter(t => t.id !== newTx.id)
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
    recentActivity.value.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount)
    })

    monthlySpending.value = Object.entries(categories).map(([name, spent], i) => ({
      id: String(i),
      category: name,
      spent,
      limit: 1000,
      icon: 'category'
    }))
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    if (!isConfigured) {
      const tx = recentActivity.value.find(t => t.id === id)
      if (tx) Object.assign(tx, updates)
      return
    }
    const { error } = await supabase.from('transactions').update(updates).eq('id', id)
    if (error) throw error
  }

  async function deleteTransaction(id: string) {
    if (!isConfigured) {
      const idx = recentActivity.value.findIndex(t => t.id === id)
      if (idx !== -1) {
        balance.value -= recentActivity.value[idx].amount
        recentActivity.value.splice(idx, 1)
      }
      return
    }
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
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

    // Optimistic update
    const newGoal = { ...goal, id: crypto.randomUUID(), progress, status } as Goal
    goals.value.push(newGoal)

    const { error } = await supabase.from('goals').insert({
      household_id: household.householdId,
      created_by: auth.user?.id,
      progress,
      status,
      ...goal,
    })
    
    if (error) {
      goals.value = goals.value.filter(g => g.id !== newGoal.id)
      throw error
    }
  }

  async function editGoal(id: string, updates: Partial<Goal>) {
    const goal = goals.value.find(g => g.id === id)
    const saved = updates.saved ?? goal?.saved ?? 0
    const target = updates.target ?? goal?.target ?? 1
    const progress = calcProgress(saved, target)
    const status = calcStatus(progress)

    // Optimistic update
    const oldGoal = { ...goal }
    Object.assign(goal, updates, { progress, status })

    if (!isConfigured) return

    const { error } = await supabase.from('goals').update({
      ...updates,
      progress,
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    
    if (error) {
      Object.assign(goal, oldGoal)
      throw error
    }
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

    // Optimistic update
    const newTask = { ...task, id: crypto.randomUUID(), completed: false } as Todo
    todos.value.push(newTask)

    const { error } = await supabase.from('todos').insert({
      household_id: household.householdId,
      owner_id: auth.user?.id,
      completed: false,
      shared: true,
      updated_by: auth.user?.id,
      ...task,
    })
    
    if (error) {
      todos.value = todos.value.filter(t => t.id !== newTask.id)
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

    // Optimistic update
    const oldStatus = todo.completed
    todo.completed = !todo.completed

    if (!isConfigured) return

    const { error } = await supabase.from('todos').update({
      completed: todo.completed,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    
    if (error) {
      todo.completed = oldStatus
      throw error
    }
  }

  async function editTask(id: string, updates: Partial<Omit<Todo, 'id' | 'completed'>>) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    const oldTodo = { ...todo }
    Object.assign(todo, updates)

    if (!isConfigured) return

    const { error } = await supabase.from('todos').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) {
      Object.assign(todo, oldTodo)
      throw error
    }
  }

  // ── Calendar ─────────────────────────────────────────────────────────────

  async function addEvent(event: Omit<CalendarEvent, 'id'>) {
    const household = useHouseholdStore()
    const auth = useAuthStore()

    if (!isConfigured || !household.householdId) {
      events.value.push({ ...event, id: crypto.randomUUID() })
      return
    }

    const newEvent = { ...event, id: crypto.randomUUID() } as CalendarEvent
    events.value.push(newEvent)

    const { error } = await supabase.from('calendar_events').insert({
      household_id: household.householdId,
      created_by: auth.user?.id,
      ...event,
    })
    
    if (error) {
      events.value = events.value.filter(e => e.id !== newEvent.id)
      throw error
    }
  }

  async function editEvent(id: string, updates: Partial<CalendarEvent>) {
    if (!isConfigured) {
      const event = events.value.find(e => e.id === id)
      if (event) Object.assign(event, updates)
      return
    }
    const { error } = await supabase.from('calendar_events').update(updates).eq('id', id)
    if (error) throw error
  }

  async function deleteEvent(id: string) {
    if (!isConfigured) {
      events.value = events.value.filter(e => e.id !== id)
      return
    }
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) throw error
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
    userName,
    partnerName,

    budget: _budget,
    plans: _plans,
    todos: _todos,
    calendar: _calendar,

    // Actions
    updateProfile,
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

export function setupStorePersistence(_store: ReturnType<typeof useAppStore>) {
  // Supabase is source of truth; localStorage not used
}
