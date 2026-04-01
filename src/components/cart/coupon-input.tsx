"use client";

import { useState, useCallback } from "react";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatHUF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Coupon input — validate code via server action callback            */
/* ------------------------------------------------------------------ */

interface CouponInputProps {
  onApply: (code: string) => Promise<{ success: boolean; discount?: number; error?: string }>;
}

type CouponState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; discount: number; code: string }
  | { status: "error"; message: string };

export function CouponInput({ onApply }: CouponInputProps) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<CouponState>({ status: "idle" });

  const handleApply = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setState({ status: "loading" });

    try {
      const result = await onApply(trimmed);

      if (result.success && result.discount != null) {
        setState({ status: "success", discount: result.discount, code: trimmed });
      } else {
        setState({
          status: "error",
          message: result.error ?? "Érvénytelen kuponkód.",
        });
      }
    } catch {
      setState({ status: "error", message: "Hiba történt. Próbáld újra." });
    }
  }, [code, onApply]);

  const handleClear = useCallback(() => {
    setCode("");
    setState({ status: "idle" });
  }, []);

  const isLoading = state.status === "loading";
  const isSuccess = state.status === "success";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              // Reset error when user types
              if (state.status === "error") {
                setState({ status: "idle" });
              }
            }}
            placeholder="Kuponkód"
            disabled={isLoading || isSuccess}
            className="pl-8 uppercase"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading && !isSuccess) {
                e.preventDefault();
                void handleApply();
              }
            }}
          />
        </div>

        {isSuccess ? (
          <Button variant="outline" size="default" onClick={handleClear}>
            <X className="size-3.5" />
            Törlés
          </Button>
        ) : (
          <Button
            variant="outline"
            size="default"
            onClick={() => void handleApply()}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Alkalmaz"}
          </Button>
        )}
      </div>

      {/* ── Feedback ───────────────────────────────────── */}
      {state.status === "success" && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
          <span>
            Kupon alkalmazva: <strong>{state.code}</strong> &mdash; {formatHUF(state.discount)}{" "}
            kedvezmény
          </span>
        </div>
      )}

      {state.status === "error" && (
        <p className={cn("text-sm text-red-600 dark:text-red-400")}>{state.message}</p>
      )}
    </div>
  );
}
