/* ------------------------------------------------------------------ */
/*  Audit logging helper                                               */
/*  Inserts into audit_logs using the admin (service role) client.     */
/*  Safe — catches all errors and logs to console.                     */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/types/database";

interface AuditLogParams {
  actorId: string | null;
  actorRole: AppRole | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const admin = createAdminClient();

    const { error } = await admin.from("audit_logs").insert({
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata ?? {},
    });

    if (error) {
      console.error("[audit] Failed to insert audit log:", error.message, {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[audit] Unexpected error writing audit log:", message, {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}
