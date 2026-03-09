"use server";

/* ------------------------------------------------------------------ */
/*  Dev-only server action: quick login with seed user credentials     */
/*  Only functional when NODE_ENV === "development"                    */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/server";

const DEV_PASSWORD = "password123";

export async function devSignIn(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Hard guard: never allow in production
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "Dev login is disabled in production." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Unexpected error during dev sign-in." };
  }
}
