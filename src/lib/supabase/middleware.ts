/* ------------------------------------------------------------------ */
/*  Middleware session refresh utility                                  */
/*                                                                     */
/*  Call `updateSession(request)` from your root middleware.ts.         */
/*  It refreshes the Supabase auth session (rewrites cookies) and      */
/*  returns the updated NextResponse. Does NOT redirect.               */
/* ------------------------------------------------------------------ */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Calling `getUser()` ensures the auth token is refreshed
  // before the response is sent to the browser. Do NOT remove this.
  await supabase.auth.getUser();

  return supabaseResponse;
}
