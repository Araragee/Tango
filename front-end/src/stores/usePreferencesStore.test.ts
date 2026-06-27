import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { usePreferencesStore } from './usePreferencesStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
})

// ── currency ──────────────────────────────────────────────────────────────────

describe('currency', () => {
  it('defaults to USD', () => {
    const store = usePreferencesStore()
    expect(store.currency).toBe('USD')
  })

  it('currencySymbol is $ for USD', () => {
    const store = usePreferencesStore()
    expect(store.currencySymbol).toBe('$')
  })

  it('setCurrency switches to PHP and updates symbol', () => {
    const store = usePreferencesStore()
    store.setCurrency('PHP')
    expect(store.currency).toBe('PHP')
    expect(store.currencySymbol).toBe('₱')
  })

  it('setCurrency back to USD restores the dollar symbol', () => {
    const store = usePreferencesStore()
    store.setCurrency('PHP')
    store.setCurrency('USD')
    expect(store.currencySymbol).toBe('$')
  })
})

// ── money() ───────────────────────────────────────────────────────────────────

describe('money()', () => {
  it('formats a positive integer with two decimal places', () => {
    const store = usePreferencesStore()
    expect(store.money(5)).toMatch(/\$5\.00/)
  })

  it('formats a negative amount', () => {
    const store = usePreferencesStore()
    const result = store.money(-12.5)
    expect(result).toMatch(/-?\$?12\.50|\$-12\.50|-\$12\.50/)
  })

  it('treats null as 0', () => {
    const store = usePreferencesStore()
    expect(store.money(null)).toMatch(/\$0\.00/)
  })

  it('treats undefined as 0', () => {
    const store = usePreferencesStore()
    expect(store.money(undefined)).toMatch(/\$0\.00/)
  })

  it('uses the PHP symbol after setCurrency', () => {
    const store = usePreferencesStore()
    store.setCurrency('PHP')
    expect(store.money(100)).toMatch(/₱/)
  })
})

// ── categories ────────────────────────────────────────────────────────────────

describe('addTodoCategory', () => {
  it('adds a new category', () => {
    const store = usePreferencesStore()
    const before = store.todoCategories.length
    store.addTodoCategory('Custom')
    expect(store.todoCategories).toContain('Custom')
    expect(store.todoCategories.length).toBe(before + 1)
  })

  it('ignores duplicates', () => {
    const store = usePreferencesStore()
    store.addTodoCategory('General')
    const count = store.todoCategories.filter(c => c === 'General').length
    expect(count).toBe(1)
  })

  it('trims whitespace before adding', () => {
    const store = usePreferencesStore()
    store.addTodoCategory('  Pets  ')
    expect(store.todoCategories).toContain('Pets')
  })

  it('ignores empty or whitespace-only strings', () => {
    const store = usePreferencesStore()
    const before = store.todoCategories.length
    store.addTodoCategory('   ')
    expect(store.todoCategories.length).toBe(before)
  })
})

describe('addTransactionCategory', () => {
  it('adds a new transaction category', () => {
    const store = usePreferencesStore()
    store.addTransactionCategory('Pets')
    expect(store.transactionCategories).toContain('Pets')
  })

  it('does not add duplicates', () => {
    const store = usePreferencesStore()
    store.addTransactionCategory('Food')
    const count = store.transactionCategories.filter(c => c === 'Food').length
    expect(count).toBe(1)
  })
})

describe('addEventCategory', () => {
  it('adds a new event category', () => {
    const store = usePreferencesStore()
    store.addEventCategory('workout')
    expect(store.eventCategories).toContain('workout')
  })
})

// ── budget limits ─────────────────────────────────────────────────────────────

describe('budgetLimits', () => {
  it('getBudgetLimit returns 1000 by default', () => {
    const store = usePreferencesStore()
    expect(store.getBudgetLimit('Food')).toBe(1000)
  })

  it('setBudgetLimit stores the value', () => {
    const store = usePreferencesStore()
    store.setBudgetLimit('Food', 500)
    expect(store.getBudgetLimit('Food')).toBe(500)
  })

  it('setBudgetLimit clamps negative values to 0', () => {
    const store = usePreferencesStore()
    store.setBudgetLimit('Transport', -100)
    expect(store.getBudgetLimit('Transport')).toBe(0)
  })
})

// ── quiet hours ───────────────────────────────────────────────────────────────

describe('isInQuietHours', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when quiet hours disabled', () => {
    const store = usePreferencesStore()
    store.setQuietHours(false)
    expect(store.isInQuietHours()).toBe(false)
  })

  it('returns true when current time is within a daytime range', () => {
    vi.useFakeTimers()
    // 14:00
    vi.setSystemTime(new Date('2025-01-01T14:00:00'))
    const store = usePreferencesStore()
    store.setQuietHours(true, '12:00', '18:00')
    expect(store.isInQuietHours()).toBe(true)
    vi.useRealTimers()
  })

  it('returns false when current time is outside a daytime range', () => {
    vi.useFakeTimers()
    // 10:00 is before 12:00 start
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))
    const store = usePreferencesStore()
    store.setQuietHours(true, '12:00', '18:00')
    expect(store.isInQuietHours()).toBe(false)
    vi.useRealTimers()
  })

  it('returns true for overnight range when time is after start (23:00)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T23:00:00'))
    const store = usePreferencesStore()
    store.setQuietHours(true, '22:00', '07:00')
    expect(store.isInQuietHours()).toBe(true)
    vi.useRealTimers()
  })

  it('returns true for overnight range when time is before end (06:00)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T06:00:00'))
    const store = usePreferencesStore()
    store.setQuietHours(true, '22:00', '07:00')
    expect(store.isInQuietHours()).toBe(true)
    vi.useRealTimers()
  })

  it('returns false for overnight range when time is in the gap (10:00)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))
    const store = usePreferencesStore()
    store.setQuietHours(true, '22:00', '07:00')
    expect(store.isInQuietHours()).toBe(false)
    vi.useRealTimers()
  })
})

// ── income allocations ────────────────────────────────────────────────────────

describe('setIncomeAllocation', () => {
  it('adds a new allocation', () => {
    const store = usePreferencesStore()
    const err = store.setIncomeAllocation('goal-1', 30)
    expect(err).toBeNull()
    expect(store.incomeAllocations).toEqual([{ goalId: 'goal-1', percent: 30 }])
  })

  it('updates an existing allocation', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 30)
    store.setIncomeAllocation('goal-1', 50)
    expect(store.incomeAllocations).toHaveLength(1)
    expect(store.incomeAllocations[0].percent).toBe(50)
  })

  it('removes the allocation when percent is 0', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 30)
    store.setIncomeAllocation('goal-1', 0)
    expect(store.incomeAllocations).toHaveLength(0)
  })

  it('returns an error message when total would exceed 100%', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 60)
    const err = store.setIncomeAllocation('goal-2', 50)
    expect(err).not.toBeNull()
    expect(err).toContain('110%')
  })

  it('does not apply the allocation that would exceed 100%', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 60)
    store.setIncomeAllocation('goal-2', 50)
    expect(store.incomeAllocations).toHaveLength(1)
  })

  it('clamps negative percent to 0 (removes allocation)', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 40)
    store.setIncomeAllocation('goal-1', -5)
    expect(store.incomeAllocations).toHaveLength(0)
  })
})

describe('removeIncomeAllocation', () => {
  it('removes the entry for the given goalId', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 20)
    store.removeIncomeAllocation('goal-1')
    expect(store.incomeAllocations).toHaveLength(0)
  })

  it('does nothing when goalId is not found', () => {
    const store = usePreferencesStore()
    store.setIncomeAllocation('goal-1', 20)
    store.removeIncomeAllocation('goal-99')
    expect(store.incomeAllocations).toHaveLength(1)
  })
})

// ── category emoji overrides ──────────────────────────────────────────────────

describe('category emoji', () => {
  it('getCategoryEmoji returns null when no override is set', () => {
    const store = usePreferencesStore()
    expect(store.getCategoryEmoji('Food')).toBeNull()
  })

  it('setCategoryEmoji stores an emoji', () => {
    const store = usePreferencesStore()
    store.setCategoryEmoji('Food', '🍔')
    expect(store.getCategoryEmoji('Food')).toBe('🍔')
  })

  it('lookup is case-insensitive', () => {
    const store = usePreferencesStore()
    store.setCategoryEmoji('FOOD', '🍔')
    expect(store.getCategoryEmoji('food')).toBe('🍔')
    expect(store.getCategoryEmoji('Food')).toBe('🍔')
  })

  it('setCategoryEmoji with empty string removes the override', () => {
    const store = usePreferencesStore()
    store.setCategoryEmoji('Food', '🍔')
    store.setCategoryEmoji('Food', '  ')
    expect(store.getCategoryEmoji('Food')).toBeNull()
  })

  it('clearCategoryEmoji removes the override', () => {
    const store = usePreferencesStore()
    store.setCategoryEmoji('Transport', '🚗')
    store.clearCategoryEmoji('Transport')
    expect(store.getCategoryEmoji('Transport')).toBeNull()
  })
})

// ── notification muting ───────────────────────────────────────────────────────

describe('notification muting', () => {
  it('isNotifCategoryMuted returns false by default', () => {
    const store = usePreferencesStore()
    expect(store.isNotifCategoryMuted('transaction.added')).toBe(false)
  })

  it('toggleNotifCategory mutes a category', () => {
    const store = usePreferencesStore()
    store.toggleNotifCategory('transaction')
    expect(store.isNotifCategoryMuted('transaction.added')).toBe(true)
  })

  it('toggleNotifCategory unmutes when called twice', () => {
    const store = usePreferencesStore()
    store.toggleNotifCategory('transaction')
    store.toggleNotifCategory('transaction')
    expect(store.isNotifCategoryMuted('transaction.added')).toBe(false)
  })

  it('prefix matching works for sub-types', () => {
    const store = usePreferencesStore()
    store.toggleNotifCategory('goal')
    expect(store.isNotifCategoryMuted('goal.completed')).toBe(true)
    expect(store.isNotifCategoryMuted('transaction.added')).toBe(false)
  })
})

// ── notifications enabled ─────────────────────────────────────────────────────

describe('notificationsEnabled', () => {
  it('defaults to true', () => {
    const store = usePreferencesStore()
    expect(store.notificationsEnabled).toBe(true)
  })

  it('setNotificationsEnabled can disable', () => {
    const store = usePreferencesStore()
    store.setNotificationsEnabled(false)
    expect(store.notificationsEnabled).toBe(false)
  })
})

// ── defaultTodoAssignee ───────────────────────────────────────────────────────

describe('defaultTodoAssignee', () => {
  it('defaults to both', () => {
    const store = usePreferencesStore()
    expect(store.defaultTodoAssignee).toBe('both')
  })

  it('setDefaultTodoAssignee changes the value', () => {
    const store = usePreferencesStore()
    store.setDefaultTodoAssignee('me')
    expect(store.defaultTodoAssignee).toBe('me')
  })
})
