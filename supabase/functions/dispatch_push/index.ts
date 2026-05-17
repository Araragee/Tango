// Supabase Edge Function — dispatch_push
// Triggered by pg_net webhook or called directly via Supabase SDK.
//
// Env vars required (set in Supabase dashboard → Project → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY   — base64url-encoded VAPID public key
//   VAPID_PRIVATE_KEY  — base64url-encoded VAPID private key
//   VAPID_CONTACT      — mailto: or https: contact URI  e.g. mailto:you@example.com
//   SUPABASE_URL       — auto-injected by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_CONTACT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

interface DispatchPayload {
  /** Target user_id. If omitted, send to all household members. */
  user_id?: string
  household_id?: string
  title: string
  body: string
  /** Icon URL (optional, defaults to app icon) */
  icon?: string
  /** URL to open on click */
  url?: string
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: DispatchPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!payload.title || !payload.body) {
    return new Response('title and body required', { status: 400 })
  }

  // Resolve target user_ids
  let userIds: string[] = []
  if (payload.user_id) {
    userIds = [payload.user_id]
  } else if (payload.household_id) {
    const { data: members, error: memErr } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', payload.household_id)
    if (memErr) {
      console.error('[dispatch_push] household lookup error', memErr)
      return new Response('DB error', { status: 500 })
    }
    userIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } else {
    return new Response('user_id or household_id required', { status: 400 })
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .in('user_id', userIds)
  if (error) {
    console.error('[dispatch_push] DB error', error)
    return new Response('DB error', { status: 500 })
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon,
    url: payload.url ?? '/app/budget',
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      if (!sub.endpoint || !sub.p256dh || !sub.auth_key) return
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          pushPayload,
        )
      } catch (err: any) {
        // 410 Gone = subscription expired, clean it up
        if (err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        throw err
      }
    }),
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  console.log(`[dispatch_push] sent=${sent} failed=${failed}`)

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
