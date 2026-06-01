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

  function setNotificationsEnabled(val: boolean) {
    notificationsEnabled.value = val
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
    addTodoCategory,
    addTransactionCategory,
    addEventCategory,
    getBudgetLimit,
    setBudgetLimit,
    setNotificationsEnabled,
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
