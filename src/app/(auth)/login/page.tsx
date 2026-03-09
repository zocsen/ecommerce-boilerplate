import { Suspense } from "react";
import { LoginClient } from "./login-client";

/* ------------------------------------------------------------------ */
/*  Login page — wraps client component with Suspense                  */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Betöltés...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
