import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── IDB mock ─────────────────────────────────────────────────────────────────
// Keep an in-memory representation of the two stores so tests can verify
// persistence logic without a real IndexedDB.
const _memStores: Record<string, Map<string, any>> = {
  mutations: new Map(),
  failed: new Map(),
}

const _mockDb = {
  getAll: vi.fn(async (storeName: string) => Array.from(_memStores[storeName].values())),
  put: vi.fn(async (storeName: string, item: any) => { _memStores[storeName].set(item.id, item) }),
  get: vi.fn(async (storeName: string, id: string) => _memStores[storeName].get(id)),
  delete: vi.fn(async (storeName: string, id: string) => { _memStores[storeName].delete(id) }),
  clear: vi.fn(async (storeName: string) => { _memStores[storeName].clear() }),
}

vi.mock('idb', () => ({
  openDB: vi.fn(async () => _mockDb),
}))

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    from: vi.fn(),
  },
}))

// Import after mocks are registered
import { useOfflineQueue } from './useOfflineQueue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMemStores() {
  _memStores.mutations.clear()
  _memStores.failed.clear()
  _mockDb.getAll.mockClear()
  _mockDb.put.mockClear()
  _mockDb.get.mockClear()
  _mockDb.delete.mockClear()
  _mockDb.clear.mockClear()
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMemStores()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── enqueue ───────────────────────────────────────────────────────────────────

describe('enqueue', () => {
  it('adds an entry to the pending list', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { title: 'Coffee', amount: -5 })
    expect(q.pending).toHaveLength(1)
    expect(q.pending[0].table).toBe('transactions')
    expect(q.pending[0].op).toBe('insert')
  })

  it('assigns a unique id to every entry', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { amount: 1 })
    await q.enqueue('transactions', 'insert', { amount: 2 })
    const ids = q.pending.map(m => m.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('persists the entry to IDB', async () => {
    const q = useOfflineQueue()
    await q.enqueue('goals', 'update', { saved: 100 }, 'goal-1')
    expect(_mockDb.put).toHaveBeenCalledWith('mutations', expect.objectContaining({
      table: 'goals',
      op: 'update',
      row_id: 'goal-1',
    }))
  })

  it('starts attempts at 0', async () => {
    const q = useOfflineQueue()
    await q.enqueue('todos', 'delete', {}, 'todo-1')
    expect(q.pending[0].attempts).toBe(0)
  })

  it('stores the row_id when provided', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'delete', {}, 'tx-99')
    expect(q.pending[0].row_id).toBe('tx-99')
  })

  it('can enqueue multiple different operations', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { amount: -10 })
    await q.enqueue('goals', 'update', { saved: 50 }, 'g-1')
    await q.enqueue('todos', 'delete', {}, 't-1')
    expect(q.pending).toHaveLength(3)
  })
})

// ── clearEntry ────────────────────────────────────────────────────────────────

describe('clearEntry', () => {
  it('removes the entry from pending', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { amount: -5 })
    const id = q.pending[0].id
    await q.clearEntry(id)
    expect(q.pending).toHaveLength(0)
  })

  it('deletes the entry from IDB', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { amount: -5 })
    const id = q.pending[0].id
    await q.clearEntry(id)
    expect(_mockDb.delete).toHaveBeenCalledWith('mutations', id)
  })

  it('does nothing when id does not exist', async () => {
    const q = useOfflineQueue()
    await expect(q.clearEntry('nonexistent')).resolves.not.toThrow()
  })
})

// ── clearAll ──────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('empties both pending and failed lists', async () => {
    const q = useOfflineQueue()
    await q.enqueue('transactions', 'insert', { amount: -5 })
    // Manually populate failed via IDB mock to simulate a prior failure
    const failedEntry = { id: 'f1', table: 'goals', op: 'insert', payload: {}, created_at: Date.now(), attempts: 5 }
    _memStores.failed.set('f1', failedEntry)
    // Re-load so the store picks up the seeded failed entry
    setActivePinia(createPinia())
    const q2 = useOfflineQueue()
    await q2.enqueue('transactions', 'insert', { amount: -5 })
    await q2.clearAll()
    expect(q2.pending).toHaveLength(0)
    expect(q2.failed).toHaveLength(0)
  })

  it('clears both IDB stores', async () => {
    const q = useOfflineQueue()
    await q.clearAll()
    expect(_mockDb.clear).toHaveBeenCalledWith('mutations')
    expect(_mockDb.clear).toHaveBeenCalledWith('failed')
  })
})

// ── retryFailed ───────────────────────────────────────────────────────────────

describe('retryFailed', () => {
  it('moves item from failed to pending and resets attempts', async () => {
    const q = useOfflineQueue()
    // Seed a failed entry in IDB so retryFailed can find it
    const failedItem = {
      id: 'fail-1', table: 'todos', op: 'insert' as const, payload: { text: 'Buy milk' },
      created_at: Date.now(), attempts: 5, last_error: 'network error',
    }
    _memStores.failed.set('fail-1', failedItem)
    // Simulate the store having loaded the failed entry
    q.failed.push({ ...failedItem })

    // Make get return the item from failed store
    _mockDb.get.mockImplementation(async (storeName: string, id: string) => {
      return _memStores[storeName]?.get(id)
    })

    await q.retryFailed('fail-1')

    expect(q.failed.find(m => m.id === 'fail-1')).toBeUndefined()
    expect(q.pending.find(m => m.id === 'fail-1')).toBeDefined()
    expect(q.pending.find(m => m.id === 'fail-1')?.attempts).toBe(0)
    expect(q.pending.find(m => m.id === 'fail-1')?.last_error).toBeUndefined()
  })

  it('does nothing when id is not in the failed IDB store', async () => {
    const q = useOfflineQueue()
    _mockDb.get.mockResolvedValue(undefined)
    await expect(q.retryFailed('ghost')).resolves.not.toThrow()
    expect(q.pending).toHaveLength(0)
  })
})

// ── clearFailed ───────────────────────────────────────────────────────────────

describe('clearFailed', () => {
  it('removes the item from the failed list and IDB', async () => {
    const q = useOfflineQueue()
    const item = {
      id: 'bad-1', table: 'goals', op: 'delete' as const, payload: {},
      created_at: Date.now(), attempts: 5,
    }
    _memStores.failed.set('bad-1', item)
    q.failed.push({ ...item })

    await q.clearFailed('bad-1')

    expect(q.failed.find(m => m.id === 'bad-1')).toBeUndefined()
    expect(_mockDb.delete).toHaveBeenCalledWith('failed', 'bad-1')
  })
})

// ── clearAllFailed ────────────────────────────────────────────────────────────

describe('clearAllFailed', () => {
  it('clears the failed reactive list and the IDB store', async () => {
    const q = useOfflineQueue()
    q.failed.push({ id: 'x', table: 'todos', op: 'insert', payload: {}, created_at: 0, attempts: 3 })
    await q.clearAllFailed()
    expect(q.failed).toHaveLength(0)
    expect(_mockDb.clear).toHaveBeenCalledWith('failed')
  })
})

// ── flush (offline path) ──────────────────────────────────────────────────────

describe('flush (offline guard)', () => {
  it('does nothing when navigator.onLine is false', async () => {
    const onlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    try {
      const q = useOfflineQueue()
      await q.enqueue('transactions', 'insert', { amount: -5 })
      await q.flush()
      // Entry should still be in the queue since we were offline
      expect(q.pending).toHaveLength(1)
    } finally {
      if (onlineDescriptor) Object.defineProperty(navigator, 'onLine', onlineDescriptor)
    }
  })
})

// ── startAutoFlush / stopAutoFlush ────────────────────────────────────────────

describe('startAutoFlush / stopAutoFlush', () => {
  it('registers and removes an online event listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const q = useOfflineQueue()
    q.startAutoFlush()
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))

    q.stopAutoFlush()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
  })

  it('replaces the previous listener on a second startAutoFlush call', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const q = useOfflineQueue()
    q.startAutoFlush()
    q.startAutoFlush() // second call should remove the first handler

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    q.stopAutoFlush()
  })
})

// ── isNetworkError helper (indirectly via flushing.value guard) ───────────────

describe('flushing guard', () => {
  it('flushing starts as false', () => {
    const q = useOfflineQueue()
    expect(q.flushing).toBe(false)
  })
})
