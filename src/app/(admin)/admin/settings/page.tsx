import { siteConfig } from "@/lib/config/site.config";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  CreditCard,
  Mail,
  FileText,
  Shield,
  ToggleLeft,
  Store,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Admin Settings Page — integration status overview                  */
/* ------------------------------------------------------------------ */

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge variant="default" className="text-xs">
      Aktív
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs">
      Inaktív
    </Badge>
  );
}

function ConfigItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { store, features, payments, invoicing, admin, branding } = siteConfig;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Beállítások</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Integrációk és funkciók állapota. A beállítások a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            site.config.ts
          </code>{" "}
          és a környezeti változókban módosíthatók.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Store className="size-5" />
              </div>
              <div>
                <CardTitle>Bolt adatok</CardTitle>
                <CardDescription>Alapvető üzleti információk</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <ConfigItem label="Név" value={store.name} />
            <ConfigItem label="Jogi név" value={store.legalName} />
            <ConfigItem label="E-mail" value={store.email} />
            <ConfigItem label="Telefon" value={store.phone} />
            <ConfigItem label="Cím" value={store.address} />
            <ConfigItem label="Pénznem" value={store.currency} />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="size-5" />
              </div>
              <div>
                <CardTitle>Fizetés — Barion</CardTitle>
                <CardDescription>Online fizetési integráció</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <ConfigItem label="Szolgáltató" value={payments.provider} />
            <ConfigItem
              label="Környezet"
              value={payments.barion.environment}
            />
            <ConfigItem
              label="POS kulcs env var"
              value={payments.barion.posKeyEnvVar}
            />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                POS kulcs beállítva
              </span>
              <StatusBadge
                enabled={!!process.env[payments.barion.posKeyEnvVar]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoicing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-5" />
              </div>
              <div>
                <CardTitle>Számlázás</CardTitle>
                <CardDescription>Automatikus számla generálás</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Szolgáltató</span>
              <span className="text-sm font-medium">
                {invoicing.provider === "none"
                  ? "Nincs konfigurálva"
                  : invoicing.provider === "billingo"
                    ? "Billingo"
                    : "Számlázz.hu"}
              </span>
            </div>
            <ConfigItem label="Mód" value={invoicing.mode === "auto_on_paid" ? "Automatikus (fizetéskor)" : "Kézi"} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Státusz</span>
              <StatusBadge enabled={invoicing.provider !== "none"} />
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-5" />
              </div>
              <div>
                <CardTitle>E-mail — Resend</CardTitle>
                <CardDescription>Tranzakciós és marketing e-mailek</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                API kulcs beállítva
              </span>
              <StatusBadge enabled={!!process.env.RESEND_API_KEY} />
            </div>
            <ConfigItem
              label="Feladó"
              value={process.env.RESEND_FROM_EMAIL ?? "Nincs beállítva"}
            />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                Marketing modul
              </span>
              <StatusBadge enabled={features.enableMarketingModule} />
            </div>
          </CardContent>
        </Card>

        {/* Feature flags */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <ToggleLeft className="size-5" />
              </div>
              <div>
                <CardTitle>Funkciók</CardTitle>
                <CardDescription>Funkció kapcsolók állapota</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Felhasználói fiókok</span>
              <StatusBadge enabled={features.enableAccounts} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Vendég checkout</span>
              <StatusBadge enabled={features.enableGuestCheckout} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Kuponok</span>
              <StatusBadge enabled={features.enableCoupons} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Értékelések</span>
              <StatusBadge enabled={features.enableReviews} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Marketing modul</span>
              <StatusBadge enabled={features.enableMarketingModule} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Elhagyott kosár</span>
              <StatusBadge enabled={features.enableAbandonedCart} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">B2B nagykereskedés</span>
              <StatusBadge enabled={features.enableB2BWholesaleMode} />
            </div>
          </CardContent>
        </Card>

        {/* Admin */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Shield className="size-5" />
              </div>
              <div>
                <CardTitle>Admin beállítások</CardTitle>
                <CardDescription>Jogosultságok és branding</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Agency viewer</span>
              <StatusBadge enabled={admin.agencyViewerEnabled} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                Csak olvasás (agency)
              </span>
              <StatusBadge enabled={admin.readonlyByDefaultForAgency} />
            </div>
            <ConfigItem label="Logó szöveg" value={branding.logoText} />
            <ConfigItem
              label="Logó URL"
              value={branding.logoUrl ?? "Nincs"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
