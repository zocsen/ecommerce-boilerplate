"use client";

import {
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  Wallet,
  Banknote,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  TRANSITION_META,
  getStatusTransitions,
  getTransitionDescription,
  getStepOrder,
} from "@/lib/constants/order-status";
import type { OrderStatus, AddressJson, PaymentMethod } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Icon maps                                                            */
/* ------------------------------------------------------------------ */

const STEP_ICONS: Record<OrderStatus, React.ElementType> = {
  draft: Package,
  awaiting_payment: Wallet,
  paid: CheckCircle2,
  processing: Package,
  shipped: Truck,
  cancelled: XCircle,
  refunded: RotateCcw,
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  check: CheckCircle2,
  package: Package,
  truck: Truck,
  x: XCircle,
  undo: RotateCcw,
  banknote: Banknote,
};

/* ------------------------------------------------------------------ */
/*  StatusStepper — visual order progress indicator                     */
/* ------------------------------------------------------------------ */

export interface StatusStepperProps {
  currentStatus: OrderStatus;
  paymentMethod: PaymentMethod;
}

export function StatusStepper({ currentStatus, paymentMethod }: StatusStepperProps) {
  const isTerminal = currentStatus === "cancelled" || currentStatus === "refunded";
  const steps = getStepOrder(paymentMethod);
  const currentIdx = steps.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const Icon = STEP_ICONS[step];
        const isActive = step === currentStatus && !isTerminal;
        const isCompleted = !isTerminal && currentIdx >= 0 && idx < currentIdx;
        const isFuture = !isTerminal && (currentIdx < 0 || idx > currentIdx);

        return (
          <div key={step} className="flex items-center gap-1">
            {idx > 0 && (
              <ArrowRight
                className={`size-3 ${isCompleted ? "text-primary" : "text-muted-foreground/30"}`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary/10 text-primary"
                    : isFuture
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted text-muted-foreground/50"
              }`}
            >
              <Icon className="size-3" />
              {ORDER_STATUS_LABELS[step]}
            </div>
          </div>
        );
      })}

      {isTerminal && (
        <div className="flex items-center gap-1">
          <ArrowRight className="text-destructive/50 size-3" />
          <div className="bg-destructive/10 text-destructive flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            {currentStatus === "cancelled" ? (
              <XCircle className="size-3" />
            ) : (
              <RotateCcw className="size-3" />
            )}
            {ORDER_STATUS_LABELS[currentStatus]}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusTransitionButton — confirmation dialog + action button        */
/* ------------------------------------------------------------------ */

export interface StatusTransitionButtonProps {
  targetStatus: OrderStatus;
  currentStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  disabled: boolean;
  trackingCode?: string;
  onConfirm: (status: OrderStatus) => void;
}

export function StatusTransitionButton({
  targetStatus,
  currentStatus,
  paymentMethod,
  disabled,
  trackingCode,
  onConfirm,
}: StatusTransitionButtonProps) {
  const meta = TRANSITION_META[targetStatus];
  const description = getTransitionDescription(targetStatus, paymentMethod, currentStatus);
  const IconComponent = ACTION_ICONS[meta.icon];

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant={meta.destructive ? "outline" : "default"}
            size="sm"
            disabled={disabled}
            className={
              meta.destructive
                ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                : ""
            }
          >
            <IconComponent className="mr-2 size-3.5" />
            {meta.destructive ? meta.label : `Jelölés: ${meta.label}`}
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {meta.destructive && <AlertTriangle className="text-destructive mr-2 inline size-4" />}
            Státusz módosítása: {meta.label}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {targetStatus === "shipped" && trackingCode && (
          <div className="border-border bg-muted/50 rounded-lg border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Csomagkövetési szám: </span>
            <span className="font-mono font-medium">{trackingCode}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Mégsem</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(targetStatus)}
            render={
              <Button variant={meta.destructive ? "destructive" : "default"}>
                {meta.destructive ? meta.label : `Jelölés: ${meta.label}`}
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  AddressDisplay — formatted address block                            */
/* ------------------------------------------------------------------ */

export interface AddressDisplayProps {
  address: AddressJson;
  label: string;
}

export function AddressDisplay({ address, label }: AddressDisplayProps) {
  if (!address.name && !address.street) return null;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <div className="text-sm">
        <p className="font-medium">{address.name}</p>
        <p>{address.street}</p>
        <p>
          {address.zip} {address.city}
        </p>
        <p>{address.country}</p>
      </div>
    </div>
  );
}
