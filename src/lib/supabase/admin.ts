/* ------------------------------------------------------------------ */
/*  Admin (service-role) Supabase client                               */
/*                                                                     */
/*  Bypasses RLS — use ONLY in trusted server contexts such as         */
/*  Server Actions that perform privileged operations (stock updates,  */
/*  order creation, audit logging, etc.).                               */
/*                                                                     */
/*  Singleton: a single instance is reused for the lifetime of the     */
/*  server process (suitable for edge & Node runtimes).                */
/* ------------------------------------------------------------------ */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "The admin client requires both to be set.",
    );
  }

  adminClient = createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
