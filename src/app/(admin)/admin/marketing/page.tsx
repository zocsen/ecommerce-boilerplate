"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  Send,
  Users,
  Loader2,
  Mail,
} from "lucide-react";
import { adminListSubscribers, adminTagSubscriber } from "@/lib/actions/subscribers";
import { sendNewsletterCampaign } from "@/lib/integrations/email/actions";
import type { NewsletterContent } from "@/lib/integrations/email/templates";
import { formatDate } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubscriberRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Marketing Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminMarketingPage() {
  // Subscribers tab
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Tag management
  const [tagEmail, setTagEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagging, setTagging] = useState(false);

  // Newsletter campaign
  const [showCampaign, setShowCampaign] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignHeadline, setCampaignHeadline] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignCtaText, setCampaignCtaText] = useState("Vásárlás most");
  const [campaignCtaUrl, setCampaignCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState<string | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Active view
  const [activeView, setActiveView] = useState<"subscribers" | "campaign">(
    "subscribers",
  );

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const res = await adminListSubscribers({
      page,
      perPage: 20,
      search: search || undefined,
      status: statusFilter || undefined,
    });
    if (res.success && res.data) {
      setSubscribers(res.data.subscribers);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // ── Tag subscriber ─────────────────────────────────────────────
  async function handleTag() {
    if (!tagEmail || !tagInput.trim()) return;

    setTagging(true);
    setError(null);

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await adminTagSubscriber(tagEmail, tags);

    if (!res.success) {
      setError(res.error ?? "Hiba a címkézéskor.");
    }

    setTagging(false);
    setTagEmail(null);
    setTagInput("");
    fetchSubscribers();
  }

  // ── Send campaign ──────────────────────────────────────────────
  async function handleSendCampaign() {
    if (!campaignSubject.trim() || !campaignHeadline.trim() || !campaignBody.trim()) {
      setError("A tárgy, címsor és szövegtörzs kötelező.");
      return;
    }

    setSending(true);
    setError(null);
    setCampaignResult(null);

    // Get all active subscriber emails
    const allRes = await adminListSubscribers({
      status: "subscribed",
      perPage: 100,
      page: 1,
    });

    if (!allRes.success || !allRes.data) {
      setError("Hiba a feliratkozók lekérésekor.");
      setSending(false);
      return;
    }

    const emails = allRes.data.subscribers.map((s) => s.email);

    if (emails.length === 0) {
      setError("Nincsenek aktív feliratkozók.");
      setSending(false);
      return;
    }

    const content: NewsletterContent = {
      headline: campaignHeadline,
      body: campaignBody,
      ctaText: campaignCtaText || "Vásárlás",
      ctaUrl: campaignCtaUrl || "/",
    };

    const result = await sendNewsletterCampaign(
      emails,
      campaignSubject,
      content,
    );

    setCampaignResult(
      `Sikeresen elküldve: ${result.totalSent}, Sikertelen: ${result.totalFailed}`,
    );
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feliratkozók kezelése és hírlevél küldés
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {campaignResult && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
          {campaignResult}
        </div>
      )}

      {/* View tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === "subscribers" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("subscribers")}
        >
          <Users className="mr-2 size-4" />
          Feliratkozók
        </Button>
        <Button
          variant={activeView === "campaign" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("campaign")}
        >
          <Mail className="mr-2 size-4" />
          Hírlevél küldés
        </Button>
      </div>

      {/* ── Subscribers view ──────────────────────────────────── */}
      {activeView === "subscribers" && (
        <>
          {/* Search + filter */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Keresés e-mail alapján..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              {[
                { value: "", label: "Mind" },
                { value: "subscribed", label: "Aktív" },
                { value: "unsubscribed", label: "Leiratkozott" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Betöltés...
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="size-8 text-muted-foreground/50" />
              <p>Nincsenek feliratkozók.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Címkék</TableHead>
                  <TableHead>Forrás</TableHead>
                  <TableHead className="text-right">Dátum</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>
                      {sub.status === "subscribed" ? (
                        <Badge variant="default" className="text-xs">
                          Aktív
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Leiratkozott
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.tags.length > 0
                          ? sub.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))
                          : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.source ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(sub.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {tagEmail === sub.email ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="címke1, címke2"
                            className="h-7 w-36 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleTag();
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={handleTag}
                            disabled={tagging}
                          >
                            {tagging ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Tag className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            setTagEmail(sub.email);
                            setTagInput("");
                          }}
                        >
                          <Tag className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {page}. / {totalPages}. oldal — {total} feliratkozó
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
        </>
      )}

      {/* ── Campaign view ─────────────────────────────────────── */}
      {activeView === "campaign" && (
        <Card>
          <CardHeader>
            <CardTitle>Hírlevél kampány</CardTitle>
            <CardDescription>
              A hírlevél az összes aktív feliratkozónak kerül kiküldésre.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail tárgy *</Label>
              <Input
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="pl. Nyári akció — 20% kedvezmény!"
              />
            </div>

            <div className="space-y-2">
              <Label>Címsor *</Label>
              <Input
                value={campaignHeadline}
                onChange={(e) => setCampaignHeadline(e.target.value)}
                placeholder="pl. Nagy nyári leárazás"
              />
            </div>

            <div className="space-y-2">
              <Label>Szövegtörzs *</Label>
              <textarea
                value={campaignBody}
                onChange={(e) => setCampaignBody(e.target.value)}
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="A hírlevél szövege (HTML is engedélyezett)..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>CTA gomb szöveg</Label>
                <Input
                  value={campaignCtaText}
                  onChange={(e) => setCampaignCtaText(e.target.value)}
                  placeholder="Vásárlás most"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA gomb URL</Label>
                <Input
                  value={campaignCtaUrl}
                  onChange={(e) => setCampaignCtaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Küldés az összes aktív feliratkozónak ({total} db)
              </p>
              <Button
                onClick={handleSendCampaign}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Kampány küldése
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
