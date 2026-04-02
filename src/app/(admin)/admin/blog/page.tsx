"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { AdminPagination } from "@/components/admin/pagination";
import { adminGetPosts, adminDeletePost, adminTogglePostPublished } from "@/lib/actions/blog";
import { formatDateTime } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PostAdmin } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Blog Posts Page                                               */
/* ------------------------------------------------------------------ */

type StatusTab = "all" | "published" | "draft";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Összes" },
  { key: "published", label: "Publikált" },
  { key: "draft", label: "Vázlat" },
];

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostAdmin[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(true);

  // Actions
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch posts ───────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const res = await adminGetPosts({
      page,
      perPage: 20,
      status: statusTab,
      search: search || undefined,
    });

    if (res.success && res.data) {
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "Hiba történt a betöltés során.");
    }
    setLoading(false);
  }, [page, statusTab, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  // ── Toggle publish ────────────────────────────────────────────
  async function handleTogglePublish(id: string) {
    setTogglingId(id);
    setError(null);
    const res = await adminTogglePostPublished(id);
    if (res.success) {
      await fetchPosts();
    } else {
      setError(res.error ?? "Hiba történt a módosítás során.");
    }
    setTogglingId(null);
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string, title: string) {
    if (!confirm(`Biztosan törölni szeretnéd a(z) "${title}" bejegyzést?`)) return;

    setDeletingId(id);
    setError(null);
    const res = await adminDeletePost(id);
    if (res.success) {
      await fetchPosts();
    } else {
      setError(res.error ?? "Hiba történt a törlés során.");
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog bejegyzések</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bejegyzések kezelése, publikálás és szerkesztés.
          </p>
        </div>
        <Link href="/admin/blog/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Új bejegyzés
          </Button>
        </Link>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Newspaper className="text-muted-foreground size-5" />
            <div>
              <p className="text-2xl font-semibold">{total}</p>
              <p className="text-muted-foreground text-xs">Összes bejegyzés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="text-muted-foreground size-5" />
            <div>
              <p className="text-2xl font-semibold">{posts.filter((p) => p.is_published).length}</p>
              <p className="text-muted-foreground text-xs">Publikált</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <EyeOff className="text-muted-foreground size-5" />
            <div>
              <p className="text-2xl font-semibold">
                {posts.filter((p) => !p.is_published).length}
              </p>
              <p className="text-muted-foreground text-xs">Vázlat</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Keresés cím alapján…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={statusTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              {search || statusTab !== "all"
                ? "Nem található bejegyzés a szűrési feltételeknek megfelelően."
                : "Még nincs blog bejegyzés. Hozd létre az elsőt!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Cím</TableHead>
                  <TableHead>Állapot</TableHead>
                  <TableHead>Szerző</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="font-medium hover:underline"
                        >
                          {post.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">/{post.slug}</span>
                        {post.tags && post.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                            {post.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{post.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.is_published ? (
                        <Badge variant="default">Publikált</Badge>
                      ) : (
                        <Badge variant="secondary">Vázlat</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {post.author_name ?? "Ismeretlen"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {formatDateTime(post.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {post.is_published && (
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Button variant="ghost" size="icon" title="Megtekintés">
                              <ExternalLink className="size-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(post.id)}
                          disabled={togglingId === post.id}
                          title={post.is_published ? "Visszavonás" : "Publikálás"}
                        >
                          {togglingId === post.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : post.is_published ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                        <Link href={`/admin/blog/${post.id}`}>
                          <Button variant="ghost" size="icon" title="Szerkesztés">
                            <Pencil className="size-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={deletingId === post.id}
                          className="text-destructive hover:text-destructive"
                          title="Törlés"
                        >
                          {deletingId === post.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ──────────────────────────────────────────── */}
      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        suffix={`— ${total} bejegyzés`}
      />
    </div>
  );
}
