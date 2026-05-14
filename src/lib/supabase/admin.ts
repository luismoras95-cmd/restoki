import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

/**
 * Cliente con SUPABASE_SERVICE_ROLE_KEY que BYPASEA RLS.
 * SOLO usar desde webhooks y rutas server donde NO hay user session
 * (típicamente: Stripe webhook). Nunca expongas el resultado al cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en env."
    )
  }
  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
