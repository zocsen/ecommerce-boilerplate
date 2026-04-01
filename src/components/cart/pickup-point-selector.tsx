"use client";

/* ------------------------------------------------------------------ */
/*  PickupPointSelector                                                 */
/*                                                                     */
/*  Renders the two-level pickup selection UI:                         */
/*   1. Provider radio list (Foxpost, GLS Automata, Packeta, etc.)     */
/*   2. Point dropdown / list for the selected provider                */
/*                                                                     */
/*  Used inside the checkout multi-step form (Step 1).                 */
/*  Accepts react-hook-form register/setValue/watch from the parent.   */
/* ------------------------------------------------------------------ */

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHUF } from "@/lib/utils/format";
import { getCarrierFee } from "@/lib/utils/shipping";
import type { PickupPointProvider } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────

export interface PickupPoint {
  id: string;
  label: string;
}

export interface PickupCarrier {
  id: string;
  name: string;
}

export interface PickupPointSelectorProps {
  /** Carrier list from siteConfig (already filtered to active only) */
  carriers: PickupCarrier[];
  /** Map of provider id → available points (may be mocked or API-driven) */
  pointsByProvider: Record<PickupPointProvider, PickupPoint[]>;
  /** Currently selected provider id */
  selectedProvider: string;
  /** Currently selected point id */
  selectedPointId: string;
  /** Cart subtotal for fee calculation */
  subtotal: number;
  /** Called when the user selects a different provider */
  onProviderChange: (providerId: string) => void;
  /** Called when the user selects a pickup point */
  onPointChange: (pointId: string, pointLabel: string) => void;
  /** Validation error for the point selection */
  pointError?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function PickupPointSelector({
  carriers,
  pointsByProvider,
  selectedProvider,
  selectedPointId,
  subtotal,
  onProviderChange,
  onPointChange,
  pointError,
}: PickupPointSelectorProps) {
  const availablePoints: PickupPoint[] =
    pointsByProvider[selectedProvider as PickupPointProvider] ?? [];

  return (
    <div className="space-y-6">
      {/* ── Provider selection ─────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-medium">Szolgáltató választása</h3>
        <div className="space-y-3">
          {carriers.map((carrier) => {
            const fee = getCarrierFee("pickup", carrier.id, subtotal);
            const isSelected = selectedProvider === carrier.id;

            return (
              <label
                key={carrier.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-300",
                  isSelected
                    ? "border-foreground bg-foreground/[0.03]"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    value={carrier.id}
                    checked={isSelected}
                    onChange={() => onProviderChange(carrier.id)}
                    className="accent-foreground size-4"
                  />
                  <span className="text-sm font-medium">{carrier.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {fee === 0 ? "Ingyenes" : formatHUF(fee ?? 0)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Point selection ────────────────────────────── */}
      {selectedProvider && availablePoints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-medium">
            <MapPin className="mr-1.5 inline-block size-4" />
            Átvételi pont választása
          </h3>
          <p className="text-muted-foreground text-xs">
            Válasszon a listán elérhető átvételi pontok közül.
          </p>
          <div className="space-y-2">
            {availablePoints.map((point) => (
              <label
                key={point.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300",
                  selectedPointId === point.id
                    ? "border-foreground bg-foreground/[0.03]"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <input
                  type="radio"
                  checked={selectedPointId === point.id}
                  onChange={() => onPointChange(point.id, point.label)}
                  className="accent-foreground size-4"
                />
                <div>
                  <span className="text-sm">{point.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({point.id})</span>
                </div>
              </label>
            ))}
          </div>
          {pointError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Kérlek, válassz átvételi pontot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
