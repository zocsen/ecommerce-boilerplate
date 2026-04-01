import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Unified StatusBadge for any entity status                           */
/* ------------------------------------------------------------------ */

/** Configuration for a single status variant. */
export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

export interface StatusBadgeProps<T extends string = string> {
  /** The status key to render */
  status: T;
  /** Map of status keys to their display configuration */
  config: Record<T, StatusConfig>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generic status badge that renders any entity status with the
 * appropriate label and variant colour.
 *
 * Works in both Server Components and Client Components.
 *
 * @example
 * <StatusBadge status="subscribed" config={SUBSCRIBER_STATUS_CONFIG} />
 */
export function StatusBadge<T extends string>({ status, config, className }: StatusBadgeProps<T>) {
  const entry = config[status];

  if (!entry) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant={entry.variant} className={cn("text-xs", className)}>
      {entry.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Pre-built config maps for common entity types                       */
/* ------------------------------------------------------------------ */

/** Subscriber status configuration (marketing page) */
export const SUBSCRIBER_STATUS_CONFIG: Record<string, StatusConfig> = {
  subscribed: { label: "Aktív", variant: "default" },
  unsubscribed: { label: "Leiratkozott", variant: "outline" },
  bounced: { label: "Visszapattant", variant: "destructive" },
  complained: { label: "Panasz", variant: "destructive" },
};
