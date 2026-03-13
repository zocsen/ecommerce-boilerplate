"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  Send,
  Users,
  Loader2,
  Mail,
  Eye,
  Filter,
  AlertTriangle,
} from "lucide-react";
import {
  adminListSubscribers,
  adminTagSubscriber,
  adminGetAllActiveSubscriberEmails,
  adminGetAllTags,
} from "@/lib/actions/subscribers";
import {
  sendNewsletterCampaign,
  renderNewsletterPreview,
} from "@/lib/integrations/email/actions";
import type { NewsletterContent } from "@/lib/integrations/email/templates";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { siteConfig } from "@/lib/config/site.config";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriberRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Status badge helper                                                */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: SubscriberRow["status"] }) {
  switch (status) {
    case "subscribed":
      return (
        <Badge variant="default" className="text-xs">
          Aktív
        </Badge>
      );
    case "unsubscribed":
      return (
        <Badge variant="outline" className="text-xs">
          Leiratkozott
        </Badge>
      );
    case "bounced":
      return (
        <Badge variant="destructive" className="text-xs">
          Visszapattant
        </Badge>
      );
    case "complained":
      return (
        <Badge variant="destructive" className="text-xs">
          Panasz
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          {status}
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Marketing Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminMarketingPage() {
  // ── Feature flag gate ─────────────────────────────────────────
  if (!siteConfig.features.enableMarketingModule) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-10 text-muted-foreground/50" />
        <div>
          <h1 className="text-lg font-semibold">Marketing modul kikapcsolva</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A marketing modul jelenleg nincs engedélyezve a konfigurációban.
            <br />
            Módosítsd az <code className="rounded bg-muted px-1.5 py-0.5 text-xs">enableMarketingModule</code> értéket
            a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">site.config.ts</code> fájlban.
          </p>
        </div>
      </div>
    );
  }

  return <MarketingPageContent />;
}

/* ------------------------------------------------------------------ */
/*  Inner content (only rendered when feature flag is on)              */
/* ------------------------------------------------------------------ */

function MarketingPageContent() {
  // ── Subscribers tab ───────────────────────────────────────────
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // ── Tag management ────────────────────────────────────────────
  const [tagEmail, setTagEmail] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagging, setTagging] = useState(false);

  // ── Campaign state ────────────────────────────────────────────
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignHeadline, setCampaignHeadline] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [campaignCtaText, setCampaignCtaText] = useState("Vásárlás most");
  const [campaignCtaUrl, setCampaignCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState<string | null>(null);

  // ── Tag targeting ─────────────────────────────────────────────
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [targetTag, setTargetTag] = useState<string>("");
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [targetCountLoading, setTargetCountLoading] = useState(false);

  // ── Preview ───────────────────────────────────────────────────
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Error ─────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // ── Active view ───────────────────────────────────────────────
  const [activeView, setActiveView] = useState<"subscribers" | "campaign">(
    "subscribers",
  );

  // ── Fetch subscribers ─────────────────────────────────────────
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

  // ── Fetch available tags on mount ─────────────────────────────
  useEffect(() => {
    async function loadTags() {
      const res = await adminGetAllTags();
      if (res.success && res.data) {
        setAvailableTags(res.data);
      }
    }
    loadTags();
  }, []);

  // ── Fetch target count when tag changes ───────────────────────
  useEffect(() => {
    async function loadTargetCount() {
      setTargetCountLoading(true);
      const res = await adminGetAllActiveSubscriberEmails(
        targetTag || undefined,
      );
      if (res.success && res.data) {
        setTargetCount(res.data.total);
      } else {
        setTargetCount(null);
      }
      setTargetCountLoading(false);
    }
    loadTargetCount();
  }, [targetTag]);

  // ── Tag subscriber ────────────────────────────────────────────
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

    // Refresh available tags
    const tagsRes = await adminGetAllTags();
    if (tagsRes.success && tagsRes.data) {
      setAvailableTags(tagsRes.data);
    }
  }

  // ── Preview campaign ──────────────────────────────────────────
  async function handlePreview() {
    if (!campaignHeadline.trim() || !campaignBody.trim()) {
      setError("A címsor és szövegtörzs szükséges az előnézethez.");
      return;
    }

    setPreviewLoading(true);
    setError(null);

    const content: NewsletterContent = {
      headline: campaignHeadline,
      body: campaignBody,
      ctaText: campaignCtaText || "Vásárlás",
      ctaUrl: campaignCtaUrl || "/",
    };

    const res = await renderNewsletterPreview(content);

    if (res.success && res.html) {
      setPreviewHtml(res.html);
    } else {
      setError(res.error ?? "Hiba az előnézet generálásakor.");
    }

    setPreviewLoading(false);
  }

  // ── Send campaign ─────────────────────────────────────────────
  async function handleSendCampaign() {
    if (
      !campaignSubject.trim() ||
      !campaignHeadline.trim() ||
      !campaignBody.trim()
    ) {
      setError("A tárgy, címsor és szövegtörzs kötelező.");
      return;
    }

    setSending(true);
    setError(null);
    setCampaignResult(null);

    // Fetch all active subscriber emails (with optional tag filter)
    const allRes = await adminGetAllActiveSubscriberEmails(
      targetTag || undefined,
    );

    if (!allRes.success || !allRes.data) {
      setError("Hiba a feliratkozók lekérésekor.");
      setSending(false);
      return;
    }

    const emails = allRes.data.emails;

    if (emails.length === 0) {
      setError(
        targetTag
          ? `Nincsenek aktív feliratkozók a "${targetTag}" címkével.`
          : "Nincsenek aktív feliratkozók.",
      );
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

  // ── Status filter options ─────────────────────────────────────
  const statusOptions = [
    { value: "", label: "Mind" },
    { value: "subscribed", label: "Aktív" },
    { value: "unsubscribed", label: "Leiratkozott" },
    { value: "bounced", label: "Visszapattant" },
    { value: "complained", label: "Panasz" },
  ];

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
          <div className="flex flex-wrap items-center gap-3">
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
              {statusOptions.map((opt) => (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Címkék</TableHead>
                    <TableHead className="text-center">Megnyitás</TableHead>
                    <TableHead className="text-center">Kattintás</TableHead>
                    <TableHead>Utolsó megnyitás</TableHead>
                    <TableHead>Forrás</TableHead>
                    <TableHead className="text-right">Dátum</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.email}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
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
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {sub.open_count ?? 0}
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {sub.click_count ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.last_opened_at
                          ? formatDateTime(sub.last_opened_at)
                          : "—"}
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
            </div>
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hírlevél kampány</CardTitle>
              <CardDescription>
                Készíts és küldj hírlevelet a feliratkozóknak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tag targeting */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Filter className="size-3.5" />
                  Célzás címke alapján
                </Label>
                <Select
                  value={targetTag}
                  onValueChange={(val) => setTargetTag(val ?? "")}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Összes aktív feliratkozó" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      Összes aktív feliratkozó
                    </SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {targetCountLoading ? (
                    "Címzettek száma betöltés alatt..."
                  ) : targetCount !== null ? (
                    <>
                      Címzettek száma:{" "}
                      <span className="font-medium text-foreground">
                        {targetCount}
                      </span>{" "}
                      aktív feliratkozó
                      {targetTag
                        ? ` a "${targetTag}" címkével`
                        : ""}
                    </>
                  ) : (
                    "Nem sikerült a címzettek számát lekérni."
                  )}
                </p>
              </div>

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
                  placeholder="A hírlevél szövege..."
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
                  {targetCountLoading
                    ? "Betöltés..."
                    : targetCount !== null
                      ? `Küldés ${targetCount} aktív feliratkozónak${targetTag ? ` (${targetTag})` : ""}`
                      : "Küldés az aktív feliratkozóknak"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 size-4" />
                    )}
                    Előnézet
                  </Button>
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
              </div>
            </CardContent>
          </Card>

          {/* ── Preview panel ────────────────────────────────── */}
          {previewHtml && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">E-mail előnézet</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewHtml(null)}
                  >
                    Bezárás
                  </Button>
                </div>
                {campaignSubject && (
                  <CardDescription>
                    Tárgy: {campaignSubject}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border bg-white">
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    title="Email előnézet"
                    className="h-[600px] w-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
