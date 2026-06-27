import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mock references ───────────────────────────────────────────────────

const { mockFrom, mockChannel, mockRemoveChannel, mockEnqueue, authState } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
  mockEnqueue: vi.fn(async () => {}),
  authState: { user: { id: 'user-1' } as any },
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => authState,
}))

vi.mock('./useHouseholdStore', () => ({
  useHouseholdStore: () => ({ householdId: 'hh-1' }),
}))

vi.mock('./useStore', () => ({
  useAppStore: () => ({ plans: { goals: [] } }),
}))

vi.mock('./useOfflineQueue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
}))

import { useContributionsStore } from './useContributionsStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockFrom.mockClear()
  mockEnqueue.mockClear()
  mockRemoveChannel.mockClear()
  authState.user = { id: 'user-1' }
})

// ── addContribution (demo mode, isConfigured=false) ───────────────────────────

describe('addContribution (demo mode)', () => {
  it('adds an optimistic contribution to items', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 100)
    expect(store.items).toHaveLength(1)
    expect(store.items[0].goal_id).toBe('goal-1')
    expect(store.items[0].amount).toBe(100)
  })

  it('sets user_id to the current user', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 50)
    expect(store.items[0].user_id).toBe('user-1')
  })

  it('sets note to null when not provided', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 50)
    expect(store.items[0].note).toBeNull()
  })

  it('stores the optional note', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 50, 'Birthday money')
    expect(store.items[0].note).toBe('Birthday money')
  })

  it('throws when amount is zero', async () => {
    const store = useContributionsStore()
    await expect(store.addContribution('goal-1', 0)).rejects.toThrow('Amount must be positive')
  })

  it('throws when amount is negative', async () => {
    const store = useContributionsStore()
    await expect(store.addContribution('goal-1', -50)).rejects.toThrow('Amount must be positive')
  })

  it('throws when not authenticated', async () => {
    authState.user = null
    const store = useContributionsStore()
    await expect(store.addContribution('goal-1', 100)).rejects.toThrow('Not authenticated')
  })

  it('prepends new contributions (most recent first)', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 10)
    await store.addContribution('goal-1', 20)
    expect(store.items[0].amount).toBe(20)
  })
})

// ── removeContribution (demo mode) ───────────────────────────────────────────

describe('removeContribution (demo mode)', () => {
  it('removes the contribution from items', async () => {
    const store = useContributionsStore()
    const result = await store.addContribution('goal-1', 100)
    await store.removeContribution(result.id)
    expect(store.items).toHaveLength(0)
  })

  it('does nothing when the id is not found', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 100)
    await expect(store.removeContribution('ghost-id')).resolves.not.toThrow()
    expect(store.items).toHaveLength(1)
  })
})

// ── addContribution — configured mode (isConfigured=true) ────────────────────

describe('addContribution (Supabase mode)', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/supabase')
    vi.mocked(mod).isConfigured = true as any
  })

  afterEach(async () => {
    const mod = await import('@/lib/supabase')
    vi.mocked(mod).isConfigured = false as any
  })

  it('rolls back on a non-network server error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    })

    const store = useContributionsStore()
    await expect(store.addContribution('goal-1', 100)).rejects.toThrow('DB error')
    expect(store.items).toHaveLength(0)
  })

  it('enqueues to offline queue on network error and keeps the optimistic item', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('Failed to fetch') }),
    })

    const store = useContributionsStore()
    await store.addContribution('goal-1', 100)
    expect(mockEnqueue).toHaveBeenCalledWith('goal_contributions', 'insert', expect.any(Object), expect.any(String))
    expect(store.items).toHaveLength(1)
  })
})

// ── removeContribution — rollback on failure ──────────────────────────────────

describe('removeContribution — rollback (Supabase mode)', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/supabase')
    vi.mocked(mod).isConfigured = true as any
  })

  afterEach(async () => {
    const mod = await import('@/lib/supabase')
    vi.mocked(mod).isConfigured = false as any
  })

  it('restores the item when delete fails', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('FK constraint') }),
    })

    const store = useContributionsStore()
    // Seed directly to bypass the Supabase insert path
    store.items.push({
      id: 'c-1',
      goal_id: 'goal-1',
      user_id: 'user-1',
      amount: 100,
      note: null,
      created_at: new Date().toISOString(),
    })

    await expect(store.removeContribution('c-1')).rejects.toThrow('FK constraint')
    expect(store.items).toHaveLength(1)
  })
})

// ── forGoal computed ──────────────────────────────────────────────────────────

describe('forGoal computed', () => {
  it('returns only contributions for the specified goal', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 100)
    await store.addContribution('goal-2', 200)
    await store.addContribution('goal-1', 50)

    const forGoal1 = store.forGoal('goal-1')
    expect(forGoal1.value).toHaveLength(2)
    expect(forGoal1.value.every(c => c.goal_id === 'goal-1')).toBe(true)
  })

  it('returns empty array when no contributions for goal', () => {
    const store = useContributionsStore()
    const result = store.forGoal('nonexistent-goal')
    expect(result.value).toHaveLength(0)
  })
})

// ── totalsByUser computed ─────────────────────────────────────────────────────

describe('totalsByUser computed', () => {
  it('sums contributions per user for a goal', async () => {
    const store = useContributionsStore()
    store.items.push(
      { id: 'c-1', goal_id: 'goal-1', user_id: 'user-1', amount: 100, note: null, created_at: '' },
      { id: 'c-2', goal_id: 'goal-1', user_id: 'user-2', amount: 200, note: null, created_at: '' },
      { id: 'c-3', goal_id: 'goal-1', user_id: 'user-1', amount: 50, note: null, created_at: '' },
    )

    const totals = store.totalsByUser('goal-1')
    expect(totals.value['user-1']).toBe(150)
    expect(totals.value['user-2']).toBe(200)
  })

  it('excludes contributions from other goals', async () => {
    const store = useContributionsStore()
    store.items.push(
      { id: 'c-1', goal_id: 'goal-1', user_id: 'user-1', amount: 100, note: null, created_at: '' },
      { id: 'c-2', goal_id: 'goal-2', user_id: 'user-1', amount: 999, note: null, created_at: '' },
    )

    const totals = store.totalsByUser('goal-1')
    expect(totals.value['user-1']).toBe(100)
  })

  it('returns an empty object when no contributions exist for the goal', () => {
    const store = useContributionsStore()
    expect(store.totalsByUser('goal-99').value).toEqual({})
  })
})

// ── unsubscribe ───────────────────────────────────────────────────────────────

describe('unsubscribe', () => {
  it('clears all items', async () => {
    const store = useContributionsStore()
    await store.addContribution('goal-1', 100)
    store.unsubscribe()
    expect(store.items).toHaveLength(0)
  })

  it('does not throw when called without a prior subscribe', () => {
    const store = useContributionsStore()
    expect(() => store.unsubscribe()).not.toThrow()
  })
})

// ── loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts as false', () => {
    const store = useContributionsStore()
    expect(store.loading).toBe(false)
  })
})
