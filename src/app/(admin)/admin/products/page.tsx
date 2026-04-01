import { Suspense } from "react";
import { AdminProductsClient } from "./products-client";

/* ------------------------------------------------------------------ */
/*  Admin Products page — wraps client component with Suspense         */
/* ------------------------------------------------------------------ */

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          Betöltés...
        </div>
      }
    >
      <AdminProductsClient />
    </Suspense>
  );
}
