import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
// Support both key name variants
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''

export const isConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl) && supabaseKey.length > 20

// Storage bucket names (overridable via env). Receipts are financial documents,
// so they live in the PRIVATE `receipts` bucket (migration 022) with
// household-scoped RLS and are viewed through short-lived signed URLs.
export const AVATARS_BUCKET: string = import.meta.env.VITE_AVATARS_BUCKET ?? 'avatars'
export const RECEIPTS_BUCKET: string = import.meta.env.VITE_RECEIPTS_BUCKET ?? 'receipts'

import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseKey : 'placeholder-key',
  {
    auth: {
      // PKCE is the recommended flow for SPAs — tokens are never exposed in
      // the URL fragment and the exchange requires a one-time verifier stored
      // in sessionStorage.  The old 'implicit' flow passed the access_token
      // in the hash which was readable by any injected script or analytics.
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
