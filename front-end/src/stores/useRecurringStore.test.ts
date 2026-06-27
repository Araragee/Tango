import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mock references ───────────────────────────────────────────────────

const authState = vi.hoisted(() => ({ user: { id: 'user-1' } as any }))

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => authState,
}))

vi.mock('./useStore', () => ({
  useAppStore: () => ({
    addTransaction: vi.fn(async () => {}),
  }),
}))

vi.mock('./useOfflineQueue', () => ({
  useOfflineQueue: () => ({ enqueue: vi.fn() }),
}))

import { useRecurringStore, type Cadence } from './useRecurringStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
})

// ── Factory helper ────────────────────────────────────────────────────────────

function makeRecurring(overrides: Partial<{
  id: string, title: string, amount: number, type: 'expense' | 'income',
  cadence: Cadence, next_run_at: string, active: boolean,
}> = {}) {
  return {
    id: 'r-1',
    household_id: 'hh-1',
    created_by: 'user-1',
    title: 'Netflix',
    amount: 15.99,
    type: 'expense' as const,
    category: 'Entertainment',
    icon: 'tv',
    cadence: 'monthly' as Cadence,
    start_date: '2025-01-01',
    end_date: null,
    next_run_at: '2025-01-01',
    last_run_at: null,
    active: true,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── add (demo / isConfigured=false) ──────────────────────────────────────────

describe('add', () => {
  it('adds a new recurring item optimistically', async () => {
    const store = useRecurringStore()
    await store.add('hh-1', {
      title: 'Spotify',
      amount: 9.99,
      type: 'expense',
      category: 'Entertainment',
      icon: 'music_note',
      cadence: 'monthly',
      start_date: '2025-06-01',
    })
    expect(store.items).toHaveLength(1)
    expect(store.items[0].title).toBe('Spotify')
  })

  it('sets active=true on new items', async () => {
    const store = useRecurringStore()
    await store.add('hh-1', {
      title: 'Rent', amount: 1200, type: 'expense',
      category: 'Housing', icon: 'home', cadence: 'monthly', start_date: '2025-01-01',
    })
    expect(store.items[0].active).toBe(true)
  })

  it('sets next_run_at equal to start_date', async () => {
    const store = useRecurringStore()
    await store.add('hh-1', {
      title: 'Gym', amount: 50, type: 'expense',
      category: 'Health', icon: 'fitness_center', cadence: 'monthly', start_date: '2025-03-15',
    })
    expect(store.items[0].next_run_at).toBe('2025-03-15')
  })

  it('sets last_run_at to null for new items', async () => {
    const store = useRecurringStore()
    await store.add('hh-1', {
      title: 'Phone', amount: 40, type: 'expense',
      category: 'Bills', icon: 'phone', cadence: 'monthly', start_date: '2025-01-01',
    })
    expect(store.items[0].last_run_at).toBeNull()
  })

  it('throws when user is not authenticated', async () => {
    authState.user = null
    const store = useRecurringStore()
    await expect(
      store.add('hh-1', {
        title: 'Netflix', amount: 15, type: 'expense',
        category: 'Entertainment', icon: 'tv', cadence: 'monthly', start_date: '2025-01-01',
      })
    ).rejects.toThrow('Not authenticated')
    authState.user = { id: 'user-1' }
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('update', () => {
  it('applies the patch to the item in place', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', title: 'Old Title' }))
    await store.update('r-1', { title: 'New Title' })
    expect(store.items[0].title).toBe('New Title')
  })

  it('does nothing when the id is not found', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1' }))
    await expect(store.update('nonexistent', { title: 'X' })).resolves.not.toThrow()
    expect(store.items[0].title).toBe('Netflix')
  })
})

// ── remove ────────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('removes the item from the list', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1' }))
    await store.remove('r-1')
    expect(store.items).toHaveLength(0)
  })

  it('does nothing when the id is not found', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1' }))
    await expect(store.remove('ghost')).resolves.not.toThrow()
    expect(store.items).toHaveLength(1)
  })
})

// ── togglePaused ──────────────────────────────────────────────────────────────

describe('togglePaused', () => {
  it('flips active from true to false', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', active: true }))
    await store.togglePaused('r-1')
    expect(store.items[0].active).toBe(false)
  })

  it('flips active from false to true', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', active: false }))
    await store.togglePaused('r-1')
    expect(store.items[0].active).toBe(true)
  })
})

// ── computed: active ──────────────────────────────────────────────────────────

describe('computed: active', () => {
  it('filters only active items', () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', active: true }))
    store.items.push(makeRecurring({ id: 'r-2', active: false }))
    store.items.push(makeRecurring({ id: 'r-3', active: true }))
    expect(store.active).toHaveLength(2)
  })

  it('returns empty when all items are paused', () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', active: false }))
    expect(store.active).toHaveLength(0)
  })
})

// ── computed: upcoming ────────────────────────────────────────────────────────

describe('computed: upcoming', () => {
  it('sorts active items by next_run_at ascending', () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', next_run_at: '2025-03-01', active: true }))
    store.items.push(makeRecurring({ id: 'r-2', next_run_at: '2025-01-01', active: true }))
    store.items.push(makeRecurring({ id: 'r-3', next_run_at: '2025-02-01', active: true }))
    expect(store.upcoming.map(r => r.id)).toEqual(['r-2', 'r-3', 'r-1'])
  })

  it('excludes paused items from upcoming', () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', next_run_at: '2025-01-01', active: false }))
    store.items.push(makeRecurring({ id: 'r-2', next_run_at: '2025-02-01', active: true }))
    expect(store.upcoming.map(r => r.id)).toEqual(['r-2'])
  })
})

// ── spawnDueAndAdvance (offline guard) ────────────────────────────────────────

describe('spawnDueAndAdvance', () => {
  it('returns 0 and does nothing when householdId is empty', async () => {
    const store = useRecurringStore()
    const count = await store.spawnDueAndAdvance('')
    expect(count).toBe(0)
  })

  it('returns 0 when no items are due (all future dates)', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', next_run_at: '2099-01-01', active: true }))
    const count = await store.spawnDueAndAdvance('hh-1')
    expect(count).toBe(0)
  })

  it('prevents concurrent spawning via the spawning guard', async () => {
    const store = useRecurringStore()
    // Manually set spawning to simulate an in-flight spawn
    store.spawning = true as any
    const count = await store.spawnDueAndAdvance('hh-1')
    expect(count).toBe(0)
  })

  it('skips paused items even when next_run_at is in the past', async () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring({ id: 'r-1', next_run_at: '2020-01-01', active: false }))
    const count = await store.spawnDueAndAdvance('hh-1')
    expect(count).toBe(0)
  })

  it('resets spawning to false after completion', async () => {
    const store = useRecurringStore()
    await store.spawnDueAndAdvance('hh-1')
    expect(store.spawning).toBe(false)
  })
})

// ── unsubscribe ───────────────────────────────────────────────────────────────

describe('unsubscribe', () => {
  it('clears the items list', () => {
    const store = useRecurringStore()
    store.items.push(makeRecurring())
    store.unsubscribe()
    expect(store.items).toHaveLength(0)
  })
})

// ── loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts as false', () => {
    const store = useRecurringStore()
    expect(store.loading).toBe(false)
  })
})
