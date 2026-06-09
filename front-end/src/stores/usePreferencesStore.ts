import { defineStore } from 'pinia'
import { ref } from 'vue'

const DEFAULT_TODO_CATEGORIES = ['General', 'Grocery', 'Home', 'Work', 'Health', 'Finance']
const DEFAULT_TRANSACTION_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Salary']
const DEFAULT_EVENT_CATEGORIES = ['date', 'errand', 'bill', 'other']

export const usePreferencesStore = defineStore('preferences', () => {
  const todoCategories = ref<string[]>([...DEFAULT_TODO_CATEGORIES])
  const transactionCategories = ref<string[]>([...DEFAULT_TRANSACTION_CATEGORIES])
  const eventCategories = ref<string[]>([...DEFAULT_EVENT_CATEGORIES])
  const budgetLimits = ref<Record<string, number>>({})
  const notificationsEnabled = ref<boolean>(true)

  // F10: per-category emoji overrides. Keyed by lowercased category name so
  // "Food", "food", and "FOOD" share the same emoji. When unset, the renderer
  // falls back to the Material Symbols icon from CATEGORY_ICON_MAP.
  const categoryEmojis = ref<Record<string, string>>({})

  // Notification category muting. Each entry is a prefix string that matches
  // notification.type — e.g. 'transaction' mutes transaction.added etc.
  // Empty array = nothing muted.
  const mutedNotifCategories = ref<string[]>([])

  // Auto-allocate: when income is added, auto-contribute this % to the chosen goal.
  // { goalId, percent } — percent 0-100. Empty = feature off.
  const incomeAllocations = ref<{ goalId: string; percent: number }[]>([])

  // Default assignee for new todos. 'both' keeps existing behaviour.
  const defaultTodoAssignee = ref<'me' | 'partner' | 'both'>('both')

  // Quiet hours: suppress in-app toasts during the set window.
  const quietHoursEnabled = ref(false)
  const quietHoursStart = ref('22:00')
  const quietHoursEnd = ref('07:00')

  function setNotificationsEnabled(val: boolean) {
    notificationsEnabled.value = val
  }

  function setDefaultTodoAssignee(val: 'me' | 'partner' | 'both') {
    defaultTodoAssignee.value = val
  }

  function setQuietHours(enabled: boolean, start?: string, end?: string) {
    quietHoursEnabled.value = enabled
    if (start !== undefined) quietHoursStart.value = start
    if (end !== undefined) quietHoursEnd.value = end
  }

  function isInQuietHours(): boolean {
    if (!quietHoursEnabled.value) return false
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    const startMins = parseMins(quietHoursStart.value)
    const endMins = parseMins(quietHoursEnd.value)
    // Handle overnight range (e.g. 22:00 – 07:00)
    return startMins <= endMins
      ? nowMins >= startMins && nowMins < endMins
      : nowMins >= startMins || nowMins < endMins
  }

  function addTodoCategory(cat: string) {
    const t = cat.trim()
    if (t && !todoCategories.value.includes(t)) {
      todoCategories.value.push(t)
    }
  }

  function addTransactionCategory(cat: string) {
    const t = cat.trim()
    if (t && !transactionCategories.value.includes(t)) {
      transactionCategories.value.push(t)
    }
  }

  function addEventCategory(cat: string) {
    const t = cat.trim()
    if (t && !eventCategories.value.includes(t)) {
      eventCategories.value.push(t)
    }
  }

  function getBudgetLimit(category: string): number {
    return budgetLimits.value[category] ?? 1000
  }

  function setBudgetLimit(category: string, limit: number) {
    budgetLimits.value[category] = Math.max(0, limit)
  }

  function getCategoryEmoji(category: string): string | null {
    return categoryEmojis.value[category.toLowerCase()] ?? null
  }

  function setCategoryEmoji(category: string, emoji: string) {
    const key = category.toLowerCase()
    const trimmed = emoji.trim()
    if (!trimmed) {
      delete categoryEmojis.value[key]
      return
    }
    categoryEmojis.value[key] = trimmed
  }

  function clearCategoryEmoji(category: string) {
    delete categoryEmojis.value[category.toLowerCase()]
  }

  function setIncomeAllocation(goalId: string, percent: number): string | null {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const idx = incomeAllocations.value.findIndex(a => a.goalId === goalId)
    if (clamped === 0) {
      if (idx !== -1) incomeAllocations.value.splice(idx, 1)
      return null
    }
    // Guard: total of all allocations must not exceed 100%.
    // Without this, multiple goals can be set to e.g. 50% each, causing
    // addTransaction() to silently contribute >100% of the income amount. (B123)
    const totalWithout = incomeAllocations.value.reduce((s, a) => a.goalId === goalId ? s : s + a.percent, 0)
    if (totalWithout + clamped > 100) {
      return `Total allocation would be ${totalWithout + clamped}% — reduce other goals first.`
    }
    if (idx === -1) incomeAllocations.value.push({ goalId, percent: clamped })
    else incomeAllocations.value[idx].percent = clamped
    return null
  }

  function removeIncomeAllocation(goalId: string) {
    incomeAllocations.value = incomeAllocations.value.filter(a => a.goalId !== goalId)
  }

  function isNotifCategoryMuted(notifType: string): boolean {
    return mutedNotifCategories.value.some(cat => notifType.startsWith(cat))
  }

  function toggleNotifCategory(cat: string) {
    const idx = mutedNotifCategories.value.indexOf(cat)
    if (idx === -1) mutedNotifCategories.value.push(cat)
    else mutedNotifCategories.value.splice(idx, 1)
  }

  return {
    todoCategories,
    transactionCategories,
    eventCategories,
    budgetLimits,
    notificationsEnabled,
    categoryEmojis,
    mutedNotifCategories,
    incomeAllocations,
    defaultTodoAssignee,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    setQuietHours,
    isInQuietHours,
    setIncomeAllocation,
    removeIncomeAllocation,
    addTodoCategory,
    addTransactionCategory,
    addEventCategory,
    getBudgetLimit,
    setBudgetLimit,
    setNotificationsEnabled,
    setDefaultTodoAssignee,
    getCategoryEmoji,
    setCategoryEmoji,
    clearCategoryEmoji,
    isNotifCategoryMuted,
    toggleNotifCategory,
  }
}, {
  persist: {
    key: 'tango:preferences',
  },
})
