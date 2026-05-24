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

let _dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return _dbPromise
}

export const useOfflineQueue = defineStore('offlineQueue', () => {
  const pending = ref<QueuedMutation[]>([])
  const flushing = ref(false)

  async function load() {
    const d = await db()
    pending.value = (await d.getAll(STORE)) as QueuedMutation[]
  }

  async function enqueue(table: string, op: QueueOp, payload: Record<string, any>, row_id?: string) {
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
    const d = await db()
    await d.delete(STORE, id)
    pending.value = pending.value.filter(m => m.id !== id)
  }

  async function bumpFailure(id: string, message: string) {
    const d = await db()
    const item = (await d.get(STORE, id)) as QueuedMutation | undefined
    if (!item) return
    item.attempts += 1
    item.last_error = message
    await d.put(STORE, item)
    pending.value = pending.value.map(m => m.id === id ? item : m)
  }

  async function replay(entry: QueuedMutation) {
    if (!isConfigured) return
    if (entry.op === 'insert') {
      const { error } = await supabase.from(entry.table).insert(entry.payload)
      if (error) throw error
    } else if (entry.op === 'update') {
      if (!entry.row_id) throw new Error('Missing row_id for update')
      const { error } = await supabase.from(entry.table).update(entry.payload).eq('id', entry.row_id)
      if (error) throw error
    } else if (entry.op === 'delete') {
      if (!entry.row_id) throw new Error('Missing row_id for delete')
      const { error } = await supabase.from(entry.table).delete().eq('id', entry.row_id)
      if (error) throw error
    }
  }

  async function clearAll() {
    const d = await db()
    await d.clear(STORE)
    pending.value = []
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
          // bumpFailure writes a new object into pending.value but `entry` is
          // still the pre-bumpFailure copy from the spread at the top of flush().
          // Using `entry.attempts` here would read the stale pre-increment value,
          // causing entries to be dropped after the 6th failure instead of the
          // intended 5th. Add 1 to account for the increment done inside
          // bumpFailure. (B93)
          if (entry.attempts + 1 >= 5) {
            console.warn('[offline] dropping mutation after 5 attempts', entry)
            await clearEntry(entry.id)
          }
          // Only pause the queue for network errors — the device is offline so
          // all subsequent replays would fail too.  For permanent server errors
          // (4xx / 5xx) the entry stays queued for a later retry and we continue
          // flushing remaining mutations rather than blocking everything. (B80)
          if (networkErr) break
        }
      }
    } finally {
      flushing.value = false
    }
  }

  // Stable listener reference so we can remove the exact same function later
  // and avoid accumulating duplicate 'online' listeners across hot-reloads or
  // Pinia store re-initialisation.
  let _onlineHandler: (() => void) | null = null

  function startAutoFlush() {
    // Remove any stale listener from a previous startAutoFlush call
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

  return {
    pending,
    flushing,
    load,
    enqueue,
    clearEntry,
    clearAll,
    flush,
    startAutoFlush,
    stopAutoFlush,
  }
})
