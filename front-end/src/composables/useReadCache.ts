import { openDB } from 'idb'

const DB_NAME = 'tango-read-cache'
const STORE = 'cache'

let _dbPromise: Promise<any> | null = null

function db() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE)
      },
    })
  }
  return _dbPromise
}

export async function saveReadCache(key: string, data: unknown[]): Promise<void> {
  try {
    const d = await db()
    // IDB uses the structured clone algorithm internally, so no manual
    // JSON round-trip is needed — pass the data directly.
    await d.put(STORE, data, key)
  } catch (e) {
    console.warn('[readCache] save failed', e)
  }
}

export async function loadReadCache<T>(key: string): Promise<T[] | null> {
  try {
    const d = await db()
    return (await d.get(STORE, key)) ?? null
  } catch {
    return null
  }
}
