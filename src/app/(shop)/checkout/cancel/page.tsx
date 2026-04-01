/* ------------------------------------------------------------------ */
/*  Checkout cancel page                                               */
/* ------------------------------------------------------------------ */

import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 lg:px-8">
      <div className="flex flex-col items-center text-center">
        {/* ── Cancel icon ───────────────────────────────── */}
        <div className="flex size-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <XCircle className="size-10 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">A fizetés megszakadt</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          A fizetési folyamat megszakadt vagy nem sikerült. A kosarad tartalma megmaradt, nyugodtan
          próbáld újra.
        </p>

        {/* ── CTAs ──────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" render={<Link href="/cart" />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Vissza a kosárhoz
          </Button>

          <Link
            href="/products"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-300"
          >
            Termékek böngészése
          </Link>
        </div>
      </div>
    </div>
  );
}
