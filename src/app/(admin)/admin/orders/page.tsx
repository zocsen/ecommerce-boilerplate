import { Suspense } from "react";
import { AdminOrdersClient } from "./orders-client";

/* ------------------------------------------------------------------ */
/*  Admin Orders page — wraps client component with Suspense           */
/* ------------------------------------------------------------------ */

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          Betöltés...
        </div>
      }
    >
      <AdminOrdersClient />
    </Suspense>
  );
}
