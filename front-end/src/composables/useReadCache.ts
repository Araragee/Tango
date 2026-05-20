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
    await d.put(STORE, JSON.parse(JSON.stringify(data)), key)
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
