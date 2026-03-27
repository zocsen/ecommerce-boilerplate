/* ------------------------------------------------------------------ */
/*  Auth callback route handler                                        */
/*  Handles Supabase auth callbacks: email confirmation, magic links,  */
/*  OAuth redirects, and password reset.                               */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWelcomeEmail } from "@/lib/integrations/email/actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Send welcome email on first sign-in (created_at ≈ last_sign_in_at within 60s)
      const user = sessionData?.user;
      if (user?.email) {
        const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
        const signedInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
        const isFirstSignIn = Math.abs(signedInAt - createdAt) < 60_000;

        if (isFirstSignIn) {
          const name =
            (user.user_metadata?.full_name as string | undefined) ?? user.email.split("@")[0];
          void sendWelcomeEmail({ to: user.email, name });
        }
      }

      return response;
    }
  }

  // If code exchange failed or no code provided, redirect to an error page
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
