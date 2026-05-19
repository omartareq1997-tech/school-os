import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""

// Module-level singleton — createBrowserClient stores the session in cookies,
// which persists across page refreshes and works with the SSR middleware.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
