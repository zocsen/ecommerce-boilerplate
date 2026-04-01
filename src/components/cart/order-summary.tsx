import { formatHUF } from "@/lib/utils/format";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Order summary panel — subtotal, shipping, discount, total          */
/* ------------------------------------------------------------------ */

interface OrderSummaryProps {
  subtotal: number;
  shippingFee: number;
  discount: number;
  /** Utánvét kezelési díj — only shown when > 0 */
  codFee?: number;
  total: number;
}

export function OrderSummary({
  subtotal,
  shippingFee,
  discount,
  codFee = 0,
  total,
}: OrderSummaryProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
        Összesítés
      </h3>

      <div className="mt-5 space-y-3">
        <SummaryLine label="Részösszeg" value={formatHUF(subtotal)} />

        <SummaryLine
          label="Szállítás"
          value={shippingFee === 0 ? "Ingyenes" : formatHUF(shippingFee)}
        />

        {discount > 0 && (
          <SummaryLine label="Kedvezmény" value={`-${formatHUF(discount)}`} highlight />
        )}

        {codFee > 0 && <SummaryLine label="Utánvét kezelési díj" value={formatHUF(codFee)} />}
      </div>

      <Separator className="my-4" />

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">Összesen</span>
        <span className="text-lg font-semibold tracking-[-0.02em] text-foreground tabular-nums">
          {formatHUF(total)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary line helper                                                */
/* ------------------------------------------------------------------ */

function SummaryLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight
            ? "font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
            : "font-medium tabular-nums text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
