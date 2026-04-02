"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Filter } from "lucide-react";
import { AdminPagination } from "@/components/admin/pagination";
import { adminListAuditLogs } from "@/lib/actions/audit";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Action → color mapping                                             */
/* ------------------------------------------------------------------ */

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("create")) return "default";
  if (action.includes("update") || action.includes("tag")) return "secondary";
  if (action.includes("delete") || action.includes("soft_delete")) return "destructive";
  return "outline";
}

/* ------------------------------------------------------------------ */
/*  Admin Audit Logs Page                                              */
/* ------------------------------------------------------------------ */

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, _setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await adminListAuditLogs({
      page,
      perPage: 30,
      entityType: entityType || undefined,
      action: actionFilter || undefined,
    });
    if (res.success && res.data) {
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, entityType, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Unique entity types + actions (from current page) ──────────
  const entityTypes = ["product", "category", "coupon", "order", "subscriber"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit napló</h1>
        <p className="text-muted-foreground mt-1 text-sm">{total} bejegyzés összesen</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">Entitás:</span>
          <div className="flex items-center gap-1">
            <Button
              variant={entityType === "" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setEntityType("");
                setPage(1);
              }}
            >
              Mind
            </Button>
            {entityTypes.map((type) => (
              <Button
                key={type}
                variant={entityType === type ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setEntityType(type);
                  setPage(1);
                }}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          Betöltés...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
          <FileText className="text-muted-foreground/50 size-8" />
          <p>Nincsenek audit bejegyzések.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Időpont</TableHead>
              <TableHead>Művelet</TableHead>
              <TableHead>Entitás</TableHead>
              <TableHead>Entitás ID</TableHead>
              <TableHead>Szereplő</TableHead>
              <TableHead>Szerepkör</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={actionVariant(log.action)} className="font-mono text-xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.entity_type}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {log.entity_id ? log.entity_id.slice(0, 8) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {log.actor_id ? log.actor_id.slice(0, 8) : "rendszer"}
                </TableCell>
                <TableCell>
                  {log.actor_role ? (
                    <Badge variant="outline" className="text-xs">
                      {log.actor_role}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {typeof log.metadata === "object" &&
                  log.metadata !== null &&
                  !Array.isArray(log.metadata) &&
                  Object.keys(log.metadata).length > 0 ? (
                    <code className="text-muted-foreground block truncate text-xs">
                      {JSON.stringify(log.metadata)}
                    </code>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      <AdminPagination page={page} totalPages={totalPages} onPageChange={(n) => setPage(n)} />
    </div>
  );
}
