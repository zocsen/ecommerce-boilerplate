/* ------------------------------------------------------------------ */
/*  Middleware session refresh utility                                  */
/*                                                                     */
/*  Call `updateSession(request)` from your root middleware.ts.         */
/*  It refreshes the Supabase auth session (rewrites cookies) and      */
/*  returns the updated NextResponse + authenticated user info.        */
/* ------------------------------------------------------------------ */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database, AppRole } from "@/lib/types/database";

export interface SessionResult {
  response: NextResponse;
  user: { id: string; role: AppRole } | null;
}

export async function updateSession(request: NextRequest): Promise<SessionResult> {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: supabaseResponse, user: null };
  }

  // Fetch role from profiles table (single query, reusing the same client)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role: AppRole = profile?.role ?? "customer";

  return {
    response: supabaseResponse,
    user: { id: user.id, role },
  };
}
