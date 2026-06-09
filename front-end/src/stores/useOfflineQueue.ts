import { defineStore } from 'pinia'
import { ref } from 'vue'
import { openDB, type IDBPDatabase } from 'idb'
import { supabase, isConfigured } from '@/lib/supabase'

function isNetworkError(e: any): boolean {
  if (!e) return false
  if (!navigator.onLine) return true
  const msg = String(e.message ?? e).toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')
}

export type QueueOp = 'insert' | 'update' | 'delete'

export interface QueuedMutation {
  id: string
  table: string
  op: QueueOp
  payload: Record<string, any>
  row_id?: string
  created_at: number
  attempts: number
  last_error?: string
}

const DB_NAME = 'tango-offline'
const STORE = 'mutations'
const FAILED_STORE = 'failed'

let _dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          if (!database.objectStoreNames.contains(STORE)) {
            database.createObjectStore(STORE, { keyPath: 'id' })
          }
        }
        if (oldVersion < 2) {
          if (!database.objectStoreNames.contains(FAILED_STORE)) {
            database.createObjectStore(FAILED_STORE, { keyPath: 'id' })
          }
        }
      },
    })
  }
  return _dbPromise
}

export const useOfflineQueue = defineStore('offlineQueue', () => {
  const pending = ref<QueuedMutation[]>([])
  const failed = ref<QueuedMutation[]>([])
  const flushing = ref(false)

  let _loadPromise: Promise<void> | null = null

  async function load() {
    if (!_loadPromise) {
      _loadPromise = (async () => {
        const d = await db()
        pending.value = (await d.getAll(STORE)) as QueuedMutation[]
        failed.value = (await d.getAll(FAILED_STORE)) as QueuedMutation[]
      })()
    }
    return _loadPromise
  }

  async function enqueue(table: string, op: QueueOp, payload: Record<string, any>, row_id?: string) {
    await load()
    const entry: QueuedMutation = {
      id: crypto.randomUUID(),
      table,
      op,
      payload,
      row_id,
      created_at: Date.now(),
      attempts: 0,
    }
    const d = await db()
    await d.put(STORE, entry)
    pending.value = [...pending.value, entry]
  }

  async function clearEntry(id: string) {
    await load()
    const d = await db()
    await d.delete(STORE, id)
    pending.value = pending.value.filter(m => m.id !== id)
  }

  async function bumpFailure(id: string, message: string) {
    await load()
    const d = await db()
    const item = (await d.get(STORE, id)) as QueuedMutation | undefined
    if (!item) return
    item.attempts += 1
    item.last_error = message
    await d.put(STORE, item)
    pending.value = pending.value.map(m => m.id === id ? item : m)
  }

  async function moveToFailed(entry: QueuedMutation) {
    await load()
    const d = await db()
    await d.delete(STORE, entry.id)
    pending.value = pending.value.filter(m => m.id !== entry.id)
    await d.put(FAILED_STORE, entry)
    failed.value = [...failed.value, entry]
  }

  async function retryFailed(id: string) {
    await load()
    const d = await db()
    const item = (await d.get(FAILED_STORE, id)) as QueuedMutation | undefined
    if (!item) return

    await d.delete(FAILED_STORE, id)
    failed.value = failed.value.filter(m => m.id !== id)

    item.attempts = 0
    item.last_error = undefined
    await d.put(STORE, item)
    pending.value = [...pending.value, item]

    flush()
  }

  async function clearFailed(id: string) {
    await load()
    const d = await db()
    await d.delete(FAILED_STORE, id)
    failed.value = failed.value.filter(m => m.id !== id)
  }

  async function clearAllFailed() {
    await load()
    const d = await db()
    await d.clear(FAILED_STORE)
    failed.value = []
  }

  async function replay(entry: QueuedMutation) {
    if (!isConfigured) return
    if (entry.op === 'insert') {
      const { error } = await supabase.from(entry.table as any).insert(entry.payload as any)
      if (error) throw error
    } else if (entry.op === 'update') {
      if (!entry.row_id) throw new Error('Missing row_id for update')
      const { error } = await supabase.from(entry.table as any).update(entry.payload as any).eq('id', entry.row_id)
      if (error) throw error
    } else if (entry.op === 'delete') {
      if (!entry.row_id) throw new Error('Missing row_id for delete')
      const { error } = await supabase.from(entry.table as any).delete().eq('id', entry.row_id)
      if (error) throw error
    }
  }

  async function clearAll() {
    await load()
    const d = await db()
    await d.clear(STORE)
    await d.clear(FAILED_STORE)
    pending.value = []
    failed.value = []
  }

  async function flush() {
    if (flushing.value) return
    if (!navigator.onLine) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    flushing.value = true
    try {
      await load()
      const queue = [...pending.value].sort((a, b) => a.created_at - b.created_at)
      for (const entry of queue) {
        try {
          await replay(entry)
          await clearEntry(entry.id)
        } catch (e: any) {
          const networkErr = isNetworkError(e)
          await bumpFailure(entry.id, e.message ?? String(e))
          if (entry.attempts + 1 >= 5) {
            console.warn('[offline] moving mutation to failed after 5 attempts', entry)
            entry.attempts += 1
            entry.last_error = e.message ?? String(e)
            await moveToFailed(entry)
          }
          if (networkErr) break
        }
      }
    } finally {
      flushing.value = false
    }
  }

  let _onlineHandler: (() => void) | null = null

  function startAutoFlush() {
    if (_onlineHandler) {
      window.removeEventListener('online', _onlineHandler)
    }
    _onlineHandler = () => { flush() }
    window.addEventListener('online', _onlineHandler)
    if (navigator.onLine) flush()
  }

  function stopAutoFlush() {
    if (_onlineHandler) {
      window.removeEventListener('online', _onlineHandler)
      _onlineHandler = null
    }
  }

  load()

  return {
    pending,
    failed,
    flushing,
    load,
    enqueue,
    clearEntry,
    clearAll,
    flush,
    startAutoFlush,
    stopAutoFlush,
    retryFailed,
    clearFailed,
    clearAllFailed,
  }
})
