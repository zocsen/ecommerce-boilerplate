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

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
          A fizetes megszakadt
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          A fizetesi folyamat megszakadt vagy nem sikerult. A kosarad tartalma
          megmaradt, nyugodtan probald ujra.
        </p>

        {/* ── CTAs ──────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" render={<Link href="/cart" />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Vissza a kosarhoz
          </Button>

          <Link
            href="/products"
            className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            Termekek bongeszese
          </Link>
        </div>
      </div>
    </div>
  );
}
