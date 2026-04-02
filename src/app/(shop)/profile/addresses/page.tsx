"use client";

import { useState, useEffect, useCallback } from "react";
import { getProfile, updateAddresses } from "@/lib/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, MapPin, FileText, Package } from "lucide-react";
import type { AddressJson, BillingAddressJson, PickupPointJson } from "@/lib/types/database";
import type { Json } from "@/lib/types/database.generated";

/* ------------------------------------------------------------------ */
/*  Profile Addresses Page                                             */
/* ------------------------------------------------------------------ */

const emptyAddress: AddressJson = {
  name: "",
  street: "",
  city: "",
  zip: "",
  country: "HU",
};

const emptyBilling: BillingAddressJson = {
  ...emptyAddress,
  company_name: "",
  tax_number: "",
};

const emptyPickup: PickupPointJson = {
  provider: "",
  point_id: "",
  point_label: "",
};

function isAddressEmpty(addr: Json | null | undefined): boolean {
  if (!addr || typeof addr !== "object" || Array.isArray(addr)) return true;
  const a = addr as AddressJson;
  return !a.name && !a.street && !a.city && !a.zip;
}

function isPickupEmpty(p: Json | null | undefined): boolean {
  if (!p) return true;
  const pp = p as PickupPointJson;
  return !pp.provider && !pp.point_id && !pp.point_label;
}

export default function ProfileAddressesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"shipping" | "billing" | "pickup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [shipping, setShipping] = useState<AddressJson>({ ...emptyAddress });
  const [billing, setBilling] = useState<BillingAddressJson>({ ...emptyBilling });
  const [pickup, setPickup] = useState<PickupPointJson>({ ...emptyPickup });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const result = await getProfile();
    if (result.success && result.data) {
      const p = result.data;
      if (!isAddressEmpty(p.default_shipping_address)) {
        setShipping(p.default_shipping_address as AddressJson);
      }
      if (!isAddressEmpty(p.default_billing_address)) {
        setBilling(p.default_billing_address as BillingAddressJson);
      }
      if (!isPickupEmpty(p.default_pickup_point)) {
        setPickup(p.default_pickup_point as PickupPointJson);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function handleSaveShipping(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setSaving("shipping");

    const result = await updateAddresses({ shippingAddress: shipping });
    if (result.success) {
      setSuccess("Szállítási cím sikeresen mentve.");
    } else {
      setError(result.error ?? "Hiba történt.");
    }
    setSaving(null);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleSaveBilling(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setSaving("billing");

    const result = await updateAddresses({ billingAddress: billing });
    if (result.success) {
      setSuccess("Számlázási cím sikeresen mentve.");
    } else {
      setError(result.error ?? "Hiba történt.");
    }
    setSaving(null);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleSavePickup(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setSaving("pickup");

    const result = await updateAddresses({ pickupPoint: pickup });
    if (result.success) {
      setSuccess("Átvételi pont sikeresen mentve.");
    } else {
      setError(result.error ?? "Hiba történt.");
    }
    setSaving(null);
    setTimeout(() => setSuccess(null), 3000);
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-60 items-center justify-center text-sm">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Betöltés...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Címek</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Alapértelmezett szállítási, számlázási és átvételi pont címek kezelése.
        </p>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-5" />
            <div>
              <CardTitle>Szállítási cím</CardTitle>
              <CardDescription>
                Alapértelmezett házhozszállítási cím a megrendelésekhez.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveShipping} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ship-name">Név *</Label>
                <Input
                  id="ship-name"
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  placeholder="Teljes név"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ship-street">Utca, házszám *</Label>
                <Input
                  id="ship-street"
                  value={shipping.street}
                  onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                  placeholder="Fő utca 1."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ship-city">Város *</Label>
                <Input
                  id="ship-city"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  placeholder="Budapest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ship-zip">Irányítószám *</Label>
                <Input
                  id="ship-zip"
                  value={shipping.zip}
                  onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving === "shipping"}>
                {saving === "shipping" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Szállítási cím mentése
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground size-5" />
            <div>
              <CardTitle>Számlázási cím</CardTitle>
              <CardDescription>
                Alapértelmezett számlázási cím. Céges számlázáshoz adja meg a cégnevet és adószámot.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBilling} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bill-name">Név *</Label>
                <Input
                  id="bill-name"
                  value={billing.name}
                  onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                  placeholder="Teljes név"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bill-street">Utca, házszám *</Label>
                <Input
                  id="bill-street"
                  value={billing.street}
                  onChange={(e) => setBilling({ ...billing, street: e.target.value })}
                  placeholder="Fő utca 1."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-city">Város *</Label>
                <Input
                  id="bill-city"
                  value={billing.city}
                  onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  placeholder="Budapest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-zip">Irányítószám *</Label>
                <Input
                  id="bill-zip"
                  value={billing.zip}
                  onChange={(e) => setBilling({ ...billing, zip: e.target.value })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              {/* B2B fields */}
              <div className="space-y-2">
                <Label htmlFor="bill-company">Cégnév</Label>
                <Input
                  id="bill-company"
                  value={billing.company_name ?? ""}
                  onChange={(e) => setBilling({ ...billing, company_name: e.target.value })}
                  placeholder="Példa Kft."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-tax">Adószám</Label>
                <Input
                  id="bill-tax"
                  value={billing.tax_number ?? ""}
                  onChange={(e) => setBilling({ ...billing, tax_number: e.target.value })}
                  placeholder="12345678-1-23"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving === "billing"}>
                {saving === "billing" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Számlázási cím mentése
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pickup Point */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground size-5" />
            <div>
              <CardTitle>Átvételi pont</CardTitle>
              <CardDescription>Alapértelmezett csomagautomata / átvételi pont.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePickup} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-provider">Szolgáltató</Label>
                <select
                  id="pickup-provider"
                  value={pickup.provider ?? ""}
                  onChange={(e) => setPickup({ ...pickup, provider: e.target.value })}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <option value="">Válasszon...</option>
                  <option value="foxpost">Foxpost</option>
                  <option value="gls_automata">GLS Automata</option>
                  <option value="packeta">Packeta</option>
                  <option value="mpl_automata">MPL Automata</option>
                  <option value="easybox">Easybox</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-id">Pont azonosító</Label>
                <Input
                  id="pickup-id"
                  value={pickup.point_id ?? ""}
                  onChange={(e) => setPickup({ ...pickup, point_id: e.target.value })}
                  placeholder="pl. FP-BP-001"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pickup-label">Megnevezés</Label>
                <Input
                  id="pickup-label"
                  value={pickup.point_label ?? ""}
                  onChange={(e) => setPickup({ ...pickup, point_label: e.target.value })}
                  placeholder="pl. Foxpost - Budapest, Westend"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving === "pickup"}>
                {saving === "pickup" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Átvételi pont mentése
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
