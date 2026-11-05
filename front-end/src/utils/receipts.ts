// Receipt attachments live in the private `receipts` bucket (migration 022).
// The transactions.receipt_url column stores a reference, not a URL:
//
//   storage:<bucket>/<household_id>/<tx_id>_<uuid>.<ext>
//
// and a short-lived signed URL is minted when the receipt is viewed. Older rows
// may still hold a public URL from the shared `avatars` bucket; those keep
// working (read-only legacy) until replaced.
import { supabase } from '@/lib/supabase'

const REF_PREFIX = 'storage:'
const SIGNED_URL_TTL_SECONDS = 60 * 60

export function receiptRef(bucket: string, path: string): string {
  return `${REF_PREFIX}${bucket}/${path}`
}

/** Bucket + object path for a stored receipt value (reference or legacy public URL). */
export function parseReceipt(value: string | null | undefined): { bucket: string; path: string } | null {
  if (!value) return null
  if (value.startsWith(REF_PREFIX)) {
    const rest = value.slice(REF_PREFIX.length)
    const slash = rest.indexOf('/')
    if (slash <= 0 || slash === rest.length - 1) return null
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) }
  }
  const m = value.match(/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null
}

export function isPdfReceipt(value: string | null | undefined): boolean {
  const parsed = parseReceipt(value)
  return (parsed?.path ?? value ?? '').toLowerCase().endsWith('.pdf')
}

/**
 * A URL safe to put in an <img src>/<a href>, or null. Only https URLs are
 * ever returned, so a tampered column value (e.g. `javascript:`) can't render.
 */
export async function resolveReceiptUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  if (value.startsWith(REF_PREFIX)) {
    const parsed = parseReceipt(value)
    if (!parsed) return null
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl.startsWith('https://') ? data.signedUrl : null
  }
  return parseReceipt(value) ? value : null
}
