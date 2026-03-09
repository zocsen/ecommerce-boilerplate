"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
} from "lucide-react";
import { adminListAuditLogs } from "@/lib/actions/audit";
import { formatDateTime } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
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

function actionVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("create")) return "default";
  if (action.includes("update") || action.includes("tag")) return "secondary";
  if (action.includes("delete") || action.includes("soft_delete"))
    return "destructive";
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
  const [actionFilter, setActionFilter] = useState("");
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
  const entityTypes = [
    "product",
    "category",
    "coupon",
    "order",
    "subscriber",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit napló</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} bejegyzés összesen
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Entitás:</span>
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
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Betöltés...
        </div>
      ) : logs.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-8 text-muted-foreground/50" />
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
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={actionVariant(log.action)}
                    className="text-xs font-mono"
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.entity_type}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.entity_id ? log.entity_id.slice(0, 8) : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.actor_id ? log.actor_id.slice(0, 8) : "rendszer"}
                </TableCell>
                <TableCell>
                  {log.actor_role ? (
                    <Badge variant="outline" className="text-xs">
                      {log.actor_role}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {Object.keys(log.metadata).length > 0 ? (
                    <code className="block truncate text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata)}
                    </code>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {page}. / {totalPages}. oldal
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
