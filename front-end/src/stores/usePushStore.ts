import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useHouseholdStore } from './useHouseholdStore'

// ─── VAPID public key ────────────────────────────────────────────────────────
// Set VITE_VAPID_PUBLIC_KEY in .env (base64url, from web-push CLI or openssl)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export const usePushStore = defineStore('push', () => {
  const subscribed = ref(false)
  const busy = ref(false)
  const supported = computed(
    () => 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
  )

  // ── Check current state ──────────────────────────────────────────────────
  async function checkSubscription() {
    if (!supported.value) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = !!sub
    } catch {
      subscribed.value = false
    }
  }

  // ── Subscribe ────────────────────────────────────────────────────────────
  async function subscribe() {
    const auth = useAuthStore()
    if (!supported.value || !auth.user) return
    if (busy.value) return
    busy.value = true
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        busy.value = false
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as unknown as ArrayBuffer,
      })

      subscribed.value = true
      await persistSubscription(sub)
    } catch (e) {
      console.error('[push.subscribe]', e)
    } finally {
      busy.value = false
    }
  }

  // ── Unsubscribe ──────────────────────────────────────────────────────────
  async function unsubscribe() {
    if (busy.value) return
    busy.value = true
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removeSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      subscribed.value = false
    } catch (e) {
      console.error('[push.unsubscribe]', e)
    } finally {
      busy.value = false
    }
  }

  // ── Persist to Supabase ──────────────────────────────────────────────────
  async function persistSubscription(sub: PushSubscription) {
    const auth = useAuthStore()
    const household = useHouseholdStore()
    if (!isConfigured || !auth.user) return
    const json = sub.toJSON()
    const row = {
      user_id: auth.user.id,
      household_id: household.householdId,
      endpoint: json.endpoint,
      p256dh: (json.keys as any)?.p256dh ?? null,
      auth_key: (json.keys as any)?.auth ?? null,
    }
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' })
    if (error) console.error('[push.persist]', error)
  }

  async function removeSubscription(endpoint: string) {
    if (!isConfigured) return
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    if (error) console.error('[push.remove]', error)
  }

  return { subscribed, busy, supported, checkSubscription, subscribe, unsubscribe }
})
