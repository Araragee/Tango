import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'tango:preferences'

const DEFAULT_TODO_CATEGORIES = ['General', 'Grocery', 'Home', 'Work', 'Health', 'Finance']
const DEFAULT_TRANSACTION_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Salary']
const DEFAULT_EVENT_CATEGORIES = ['date', 'errand', 'bill', 'other']

export const usePreferencesStore = defineStore('preferences', () => {
  const todoCategories = ref<string[]>([...DEFAULT_TODO_CATEGORIES])
  const transactionCategories = ref<string[]>([...DEFAULT_TRANSACTION_CATEGORIES])
  const eventCategories = ref<string[]>([...DEFAULT_EVENT_CATEGORIES])
  const budgetLimits = ref<Record<string, number>>({})

  function _persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      todoCategories: todoCategories.value,
      transactionCategories: transactionCategories.value,
      eventCategories: eventCategories.value,
      budgetLimits: budgetLimits.value,
    }))
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (Array.isArray(data.todoCategories)) todoCategories.value = data.todoCategories
      if (Array.isArray(data.transactionCategories)) transactionCategories.value = data.transactionCategories
      if (Array.isArray(data.eventCategories)) eventCategories.value = data.eventCategories
      if (data.budgetLimits && typeof data.budgetLimits === 'object') budgetLimits.value = data.budgetLimits
    } catch {}
  }

  function addTodoCategory(cat: string) {
    const t = cat.trim()
    if (t && !todoCategories.value.includes(t)) {
      todoCategories.value.push(t)
      _persist()
    }
  }

  function addTransactionCategory(cat: string) {
    const t = cat.trim()
    if (t && !transactionCategories.value.includes(t)) {
      transactionCategories.value.push(t)
      _persist()
    }
  }

  function addEventCategory(cat: string) {
    const t = cat.trim()
    if (t && !eventCategories.value.includes(t)) {
      eventCategories.value.push(t)
      _persist()
    }
  }

  function getBudgetLimit(category: string): number {
    return budgetLimits.value[category] ?? 1000
  }

  function setBudgetLimit(category: string, limit: number) {
    budgetLimits.value[category] = Math.max(0, limit)
    _persist()
  }

  load()

  return {
    todoCategories,
    transactionCategories,
    eventCategories,
    budgetLimits,
    addTodoCategory,
    addTransactionCategory,
    addEventCategory,
    getBudgetLimit,
    setBudgetLimit,
  }
})
