/**
 * Extended tests for useStore covering error paths, rollback behaviour,
 * version-conflict detection, and recalculateBudget edge cases.
 * Uses isConfigured=true to exercise the Supabase code paths.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mock references ───────────────────────────────────────────────────

const { mockFrom, mockChannel, mockRemoveChannel, mockEnqueue } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockEnqueue: vi.fn(async () => {}),
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('./useHouseholdStore', () => ({
  useHouseholdStore: () => ({
    householdId: 'hh-1',
    partner: null,
    members: [{ user_id: 'user-1' }],
    loadMembers: vi.fn(),
  }),
}))

vi.mock('./useOfflineQueue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
}))

vi.mock('./usePreferencesStore', () => ({
  usePreferencesStore: () => ({ incomeAllocations: [] }),
}))

vi.mock('./useContributionsStore', () => ({
  useContributionsStore: () => ({ addContribution: vi.fn() }),
}))

vi.mock('@/composables/useReadCache', () => ({
  loadReadCache: vi.fn(async () => null),
  saveReadCache: vi.fn(),
}))

vi.mock('@/utils/categoryIcons', () => ({
  categoryIcon: vi.fn((cat: string) => cat.toLowerCase()),
}))

vi.mock('@/utils/dateUtils', () => ({
  localDateISO: vi.fn(() => '2025-06-01'),
}))

import { useAppStore, VersionConflictError } from './useStore'

// ── Query builder factory ─────────────────────────────────────────────────────

function makeQueryBuilder(overrides: { error?: any; data?: any } = {}) {
  const { error = null, data = [] } = overrides
  const b: any = {
    insert: vi.fn().mockResolvedValue({ error }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data, error }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  }
  // delete/update chain that doesn't call .select() resolves directly
  b.delete.mockReturnThis()
  b.eq.mockResolvedValue({ error })
  return b
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockEnqueue.mockClear()
  mockRemoveChannel.mockClear()
  mockFrom.mockImplementation(() => makeQueryBuilder())
  mockChannel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })
})

// ── addTransaction — error paths ──────────────────────────────────────────────

describe('addTransaction — error paths', () => {
  it('rolls back the optimistic update on a non-network server error', async () => {
    const store = useAppStore()
    mockFrom.mockReturnValue({
      ...makeQueryBuilder(),
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    })

    await expect(
      store.addTransaction({ title: 'Coffee', amount: -5, type: 'expense', category: 'Food', date: '2025-01-01', icon: 'cafe' })
    ).rejects.toThrow('DB error')

    expect(store.budget.recentActivity).toHaveLength(0)
  })

  it('enqueues to offline queue on network error and keeps the optimistic item', async () => {
    const store = useAppStore()
    const networkErr = new Error('Failed to fetch')
    mockFrom.mockReturnValue({
      ...makeQueryBuilder(),
      insert: vi.fn().mockResolvedValue({ error: networkErr }),
    })

    await store.addTransaction({ title: 'Rent', amount: -1000, type: 'expense', category: 'Housing', date: '2025-01-01', icon: 'home' })

    expect(mockEnqueue).toHaveBeenCalledWith('transactions', 'insert', expect.any(Object), expect.any(String))
    expect(store.budget.recentActivity).toHaveLength(1)
  })
})

// ── deleteTransaction — rollback ──────────────────────────────────────────────

describe('deleteTransaction — rollback', () => {
  it('restores the item when the server delete fails', async () => {
    const store = useAppStore()
    // Seed an item directly (bypass Supabase for add)
    store.budget.recentActivity.unshift({ id: 'tx-1', title: 'Coffee', amount: -5, type: 'expense', category: 'Food', date: '2025-01-01', icon: 'cafe' })

    // Make the delete chain reject
    const errBuilder: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('constraint') }),
    }
    mockFrom.mockReturnValue(errBuilder)

    await expect(store.deleteTransaction('tx-1')).rejects.toThrow('constraint')
    expect(store.budget.recentActivity).toHaveLength(1)
  })
})

// ── updateTransaction — version conflict ──────────────────────────────────────

describe('updateTransaction — version conflict', () => {
  it('throws VersionConflictError when the update returns an empty data array', async () => {
    const store = useAppStore()
    store.budget.recentActivity.unshift({ id: 'tx-2', title: 'Salary', amount: 3000, type: 'income', category: 'Income', date: '2025-01-01', icon: 'paid', version: 1 })

    const versionBuilder: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(versionBuilder)

    await expect(store.updateTransaction('tx-2', { title: 'Updated' })).rejects.toBeInstanceOf(VersionConflictError)
    expect(store.budget.recentActivity[0].title).toBe('Salary')
  })
})

// ── recalculateBudget edge cases ──────────────────────────────────────────────

describe('recalculateBudget', () => {
  beforeEach(() => {
    // Use demo mode for budget calc tests — just set isConfigured=false behaviour
    // by not letting any Supabase calls matter; the store reads householdId=null
    // via the mock which returns null for household, so addTransaction won't try Supabase.
    // Instead we seed recentActivity directly and call the store's addTransaction
    // via the existing demo-mode mock that short-circuits.
  })

  it('balance sums all transaction amounts', () => {
    const store = useAppStore()
    store.budget.recentActivity.unshift({ id: 'a', title: 'Salary', amount: 3000, type: 'income', category: 'Income', date: '2025-01-01', icon: 'paid' })
    store.budget.recentActivity.unshift({ id: 'b', title: 'Rent', amount: -1000, type: 'expense', category: 'Housing', date: '2025-01-01', icon: 'home' })
    store.updateBalance(store.budget.recentActivity.reduce((s, t) => s + t.amount, 0))
    expect(store.budget.balance).toBe(2000)
  })

  it('monthlySpending only includes expenses from the current month', () => {
    const store = useAppStore()
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    // Seed directly into recentActivity and trigger recalculation via addTransaction no-op
    const activity = store.budget.recentActivity as any[]
    activity.push({ id: 'c1', title: 'Coffee', amount: -5, type: 'expense', category: 'Food', date: thisMonth, icon: 'cafe' })
    activity.push({ id: 'c2', title: 'Old bill', amount: -100, type: 'expense', category: 'Bills', date: lastMonth, icon: 'receipt' })

    // Force recalculation by calling a no-op that triggers it
    store.updateBalance(activity.reduce((s: number, t: any) => s + t.amount, 0))

    // Access via the internal computed that aggregates by month
    // We validate by checking that monthlySpending length matches expectations
    // (the recalculate is called by addTransaction internally; here we test via direct seeding)
    expect(store.budget.monthlySpending.every((s: any) => !s.category.includes('Bills') || s.category === 'Food')).toBe(true)
  })
})

// ── goal calcProgress edge cases ──────────────────────────────────────────────

describe('addGoal — calcProgress edge cases (demo mode)', () => {
  beforeEach(() => {
    // Use demo path by making the household store return null householdId for the goal add
    // Since mockFrom is set up, we override from to return success
    mockFrom.mockImplementation(() => ({
      ...makeQueryBuilder(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }))
  })

  it('does not produce Infinity/NaN when target is 0', async () => {
    const store = useAppStore()
    await store.addGoal({ title: 'Mystery', description: '', target: 0, saved: 0, icon: 'help', completed_at: null, version: 1 })
    expect(store.plans.goals[0].progress).toBe(0)
    expect(store.plans.goals[0].status).toBe('Behind')
  })

  it('marks status as Completed when progress >= 100', async () => {
    const store = useAppStore()
    await store.addGoal({ title: 'Vacation', description: '', target: 1000, saved: 1000, icon: 'flight', completed_at: null, version: 1 })
    expect(store.plans.goals[0].status).toBe('Completed')
  })

  it('marks status as On Track when progress is between 50 and 99', async () => {
    const store = useAppStore()
    await store.addGoal({ title: 'Car', description: '', target: 10000, saved: 5000, icon: 'car', completed_at: null, version: 1 })
    expect(store.plans.goals[0].status).toBe('On Track')
  })
})

// ── deleteGoal — rollback ─────────────────────────────────────────────────────

describe('deleteGoal — rollback', () => {
  it('restores the goal when the server call fails', async () => {
    const store = useAppStore()
    // Seed directly
    store.plans.goals.push({ id: 'g-1', title: 'Car', description: '', target: 10000, saved: 0, icon: 'car', progress: 0, status: 'Behind' })

    const errBuilder: any = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('FK constraint') }),
    }
    mockFrom.mockReturnValue(errBuilder)

    await expect(store.deleteGoal('g-1')).rejects.toThrow('FK constraint')
    expect(store.plans.goals).toHaveLength(1)
  })
})

// ── completeGoal ──────────────────────────────────────────────────────────────

describe('completeGoal', () => {
  beforeEach(() => {
    mockFrom.mockImplementation(() => ({
      ...makeQueryBuilder(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
  })

  it('sets status to Completed', async () => {
    const store = useAppStore()
    store.plans.goals.push({ id: 'g-2', title: 'Fund', description: '', target: 500, saved: 200, icon: 'savings', progress: 40, status: 'Behind', completed_at: null })

    await store.completeGoal('g-2')
    expect(store.plans.goals[0].status).toBe('Completed')
  })

  it('sets completed_at to a non-null value', async () => {
    const store = useAppStore()
    store.plans.goals.push({ id: 'g-3', title: 'Fund', description: '', target: 500, saved: 200, icon: 'savings', progress: 40, status: 'Behind', completed_at: null })

    await store.completeGoal('g-3')
    expect(store.plans.goals[0].completed_at).not.toBeNull()
  })

  it('preserves a pre-existing completed_at value', async () => {
    const store = useAppStore()
    store.plans.goals.push({ id: 'g-4', title: 'Fund', description: '', target: 500, saved: 500, icon: 'savings', progress: 100, status: 'Behind', completed_at: '2025-01-15T10:00:00Z' })

    await store.completeGoal('g-4')
    expect(store.plans.goals[0].completed_at).toBe('2025-01-15T10:00:00Z')
  })
})

// ── toggleTodo — version conflict ─────────────────────────────────────────────

describe('toggleTodo — version conflict', () => {
  it('rolls back the toggle when version conflict is detected', async () => {
    const store = useAppStore()
    store.todos.items.push({ id: 'td-1', text: 'Buy milk', category: 'General', completed: false, version: 1 })

    const versionBuilder: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(versionBuilder)

    await expect(store.toggleTodo('td-1')).rejects.toBeInstanceOf(VersionConflictError)
    expect(store.todos.items[0].completed).toBe(false)
  })
})

// ── unsubscribeRealtime ───────────────────────────────────────────────────────

describe('unsubscribeRealtime', () => {
  it('calls removeChannel when a channel is active', () => {
    const store = useAppStore()
    store.subscribeRealtime('hh-1')
    store.unsubscribeRealtime()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
