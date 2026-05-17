import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

const permission = ref<PermissionState>('default')
const subscribed = ref(false)
const busy = ref(false)
const lastError = ref<string | null>(null)

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function readCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

async function refresh() {
  if (!isSupported()) {
    permission.value = 'unsupported'
    subscribed.value = false
    return
  }
  permission.value = Notification.permission as PermissionState
  const sub = await readCurrentSubscription()
  subscribed.value = !!sub
}

async function enable(): Promise<boolean> {
  lastError.value = null
  if (!isSupported()) {
    lastError.value = 'Push not supported on this browser'
    return false
  }

  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapid) {
    lastError.value = 'VITE_VAPID_PUBLIC_KEY not configured'
    return false
  }

  busy.value = true
  try {
    const perm = await Notification.requestPermission()
    permission.value = perm as PermissionState
    if (perm !== 'granted') {
      lastError.value = 'Notification permission denied'
      return false
    }

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      lastError.value = 'Not signed in'
      return false
    }

    const json = sub.toJSON()
    const endpoint = json.endpoint ?? sub.endpoint
    const p256dh = json.keys?.p256dh
    const auth_key = json.keys?.auth
    if (!endpoint || !p256dh || !auth_key) {
      lastError.value = 'Subscription payload incomplete'
      return false
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userData.user.id,
        endpoint,
        p256dh,
        auth_key,
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    )
    if (error) {
      lastError.value = error.message
      return false
    }

    subscribed.value = true
    return true
  } catch (err: any) {
    lastError.value = err?.message ?? String(err)
    return false
  } finally {
    busy.value = false
  }
}

async function disable(): Promise<boolean> {
  lastError.value = null
  if (!isSupported()) return false
  busy.value = true
  try {
    const sub = await readCurrentSubscription()
    if (!sub) {
      subscribed.value = false
      return true
    }
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    if (error) {
      lastError.value = error.message
      return false
    }
    subscribed.value = false
    return true
  } catch (err: any) {
    lastError.value = err?.message ?? String(err)
    return false
  } finally {
    busy.value = false
  }
}

export function usePushSubscription() {
  onMounted(() => {
    refresh()
  })

  const canPrompt = computed(
    () => permission.value === 'default' && isSupported(),
  )

  return {
    permission,
    subscribed,
    busy,
    lastError,
    canPrompt,
    isSupported,
    enable,
    disable,
    refresh,
  }
}
