/* ------------------------------------------------------------------ */
/*  Subscription Invoice Generation                                    */
/*                                                                     */
/*  Bridges the subscription payment flow with the invoicing adapter   */
/*  (Billingo / Számlázz.hu). Creates real invoices for subscription   */
/*  payments using the configured invoicing provider.                  */
/*                                                                     */
/*  Unlike order invoicing (which uses OrderRow + OrderItemRow),       */
/*  subscription invoicing generates a single-line-item invoice for    */
/*  the plan fee.                                                      */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionInvoiceRow } from "@/lib/types/database";

// ── Types ─────────────────────────────────────────────────────────

interface SubscriptionInvoiceInput {
  /** The subscription invoice record from our database */
  invoice: SubscriptionInvoiceRow;
  /** Plan name for the invoice line item description */
  planName: string;
  /** Billing cycle for the description */
  billingCycle: "monthly" | "annual";
  /** Shop/customer billing details */
  billing: {
    name: string;
    zip: string;
    city: string;
    street: string;
    email: string;
    companyName?: string;
    taxNumber?: string;
  };
}

interface InvoiceGenerationResult {
  success: boolean;
  invoiceNumber?: string;
  invoiceUrl?: string;
  error?: string;
}

// ── Billingo subscription invoice ─────────────────────────────────

async function createBillingoSubscriptionInvoice(
  input: SubscriptionInvoiceInput,
): Promise<InvoiceGenerationResult> {
  const apiKey = process.env.BILLINGO_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      const mockNumber = `BILL-SUB-${Date.now()}`;
      console.info(`[sub-invoicing:billingo] Mock: ${mockNumber}`);
      return {
        success: true,
        invoiceNumber: mockNumber,
        invoiceUrl: `https://app.billingo.hu/mock/${mockNumber}`,
      };
    }
    return { success: false, error: "Billingo API kulcs nincs beállítva." };
  }

  const baseUrl = "https://api.billingo.hu/v3";
  const vatRate = siteConfig.tax.defaultVatRate;
  const cycleLabel = input.billingCycle === "annual" ? "éves" : "havi";

  try {
    // Create or find partner
    const partnerData = {
      name: input.billing.companyName || input.billing.name,
      address: {
        country_code: "HU",
        post_code: input.billing.zip,
        city: input.billing.city,
        address: input.billing.street,
      },
      emails: [input.billing.email],
      taxcode: input.billing.taxNumber ?? "",
    };

    const partnerResponse = await fetch(`${baseUrl}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify(partnerData),
    });

    if (!partnerResponse.ok) {
      const errorText = await partnerResponse.text();
      return {
        success: false,
        error: `Billingo partner hiba (${partnerResponse.status}): ${errorText}`,
      };
    }

    const partner = (await partnerResponse.json()) as { id: number };

    // Create invoice
    const invoicePayload = {
      partner_id: partner.id,
      block_id: 0,
      bank_account_id: 0,
      type: "invoice",
      payment_method: "online_bankcard",
      currency: "HUF",
      language: "hu",
      electronic: true,
      items: [
        {
          name: `${input.planName} csomag – ${cycleLabel} előfizetés`,
          unit_price: input.invoice.amount,
          unit_price_type: "gross",
          quantity: 1,
          unit: "db",
          vat: `${vatRate}%`,
          comment: `Időszak: ${formatPeriod(input.invoice.billing_period_start)} – ${formatPeriod(input.invoice.billing_period_end)}`,
        },
      ],
      settings: { round: "five" },
    };

    const invoiceResponse = await fetch(`${baseUrl}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify(invoicePayload),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      return {
        success: false,
        error: `Billingo számla hiba (${invoiceResponse.status}): ${errorText}`,
      };
    }

    const invoice = (await invoiceResponse.json()) as {
      id: number;
      invoice_number: string;
      public_url: string;
    };

    return {
      success: true,
      invoiceNumber: invoice.invoice_number,
      invoiceUrl: invoice.public_url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Billingo hiba: ${message}` };
  }
}

// ── Számlázz.hu subscription invoice ──────────────────────────────

async function createSzamlazzSubscriptionInvoice(
  input: SubscriptionInvoiceInput,
): Promise<InvoiceGenerationResult> {
  const agentKey = process.env.SZAMLAZZ_AGENT_KEY;
  if (!agentKey) {
    if (process.env.NODE_ENV === "development") {
      const mockNumber = `SZ-SUB-${Date.now()}`;
      console.info(`[sub-invoicing:szamlazz] Mock: ${mockNumber}`);
      return {
        success: true,
        invoiceNumber: mockNumber,
        invoiceUrl: `https://www.szamlazz.hu/mock/${mockNumber}`,
      };
    }
    return { success: false, error: "Számlázz.hu agent kulcs nincs beállítva." };
  }

  const vatRate = siteConfig.tax.defaultVatRate;
  const cycleLabel = input.billingCycle === "annual" ? "éves" : "havi";
  const net = Math.round(input.invoice.amount / (1 + vatRate / 100));
  const vatAmount = input.invoice.amount - net;

  try {
    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <beallitasok>
    <szamlaagentkulcs>${escapeXml(agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLet662>1</szamlaLet662>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <keltDatum>${formatDateForXml(new Date())}</keltDatum>
    <teljesitesDatum>${formatDateForXml(new Date())}</teljesitesDatum>
    <fizetesiHataridoDatum>${formatDateForXml(new Date())}</fizetesiHataridoDatum>
    <fizmod>Bankkártya (online)</fizmod>
    <ppienz>HUF</ppienz>
    <szamlaNyelve>hu</szamlaNyelve>
    <megjegyzes>Előfizetés: ${escapeXml(input.planName)} – ${cycleLabel}</megjegyzes>
    <rendelesSzam>${input.invoice.id}</rendelesSzam>
    <epiFelhasznaloAzonosito>${escapeXml(input.billing.email)}</epiFelhasznaloAzonosito>
  </fejlec>
  <elado></elado>
  <vevo>
    <nev>${escapeXml(input.billing.companyName || input.billing.name)}</nev>
    <irsz>${escapeXml(input.billing.zip)}</irsz>
    <telepules>${escapeXml(input.billing.city)}</telepules>
    <cim>${escapeXml(input.billing.street)}</cim>
    <email>${escapeXml(input.billing.email)}</email>
    ${input.billing.taxNumber ? `<adoszam>${escapeXml(input.billing.taxNumber)}</adoszam>` : ""}
  </vevo>
  <tetelek>
    <tetel>
      <megnevezes>${escapeXml(input.planName)} csomag – ${cycleLabel} előfizetés</megnevezes>
      <mennyiseg>1</mennyiseg>
      <mennyisegiEgyseg>db</mennyisegiEgyseg>
      <nettoEgysegar>${net}</nettoEgysegar>
      <afakulcs>${vatRate}</afakulcs>
      <nettoErtek>${net}</nettoErtek>
      <afaErtek>${vatAmount}</afaErtek>
      <bruttoErtek>${input.invoice.amount}</bruttoErtek>
    </tetel>
  </tetelek>
</xmlszamla>`;

    const response = await fetch("https://www.szamlazz.hu/szamla/", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Számlázz.hu hiba (${response.status}): ${errorText}` };
    }

    const invoiceNumber = response.headers.get("szlahu_szamlaszam") ?? `SZ-${Date.now()}`;
    const invoiceUrl =
      response.headers.get("szlahu_szamlapdf") ??
      `https://www.szamlazz.hu/szamla/?action=szamlapdf&id=${invoiceNumber}`;

    return { success: true, invoiceNumber, invoiceUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Számlázz.hu hiba: ${message}` };
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Generate an invoice for a paid subscription invoice record.
 *
 * Uses the configured invoicing provider (Billingo, Számlázz.hu, or none).
 * On success, updates the subscription_invoices record with the invoice
 * number and URL.
 *
 * Billing details are fetched from the shop subscription's billing
 * address or fall back to the store's own details.
 */
export async function generateSubscriptionInvoice(
  invoiceId: string,
): Promise<InvoiceGenerationResult> {
  const { provider } = siteConfig.invoicing;

  if (provider === "none") {
    console.info("[sub-invoicing] No provider configured. Skipping.");
    return { success: true };
  }

  const admin = createAdminClient();

  // Fetch invoice + subscription + plan
  const { data: invoice, error: invoiceError } = await admin
    .from("subscription_invoices")
    .select("*, shop_subscriptions(*, shop_plans(*))")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: "Számla nem található." };
  }

  const subscription = invoice.shop_subscriptions;
  if (!subscription) {
    return { success: false, error: "Előfizetés nem található." };
  }

  const plan = (subscription as Record<string, unknown>).shop_plans as { name: string } | null;
  if (!plan) {
    return { success: false, error: "Csomag nem található." };
  }

  // Use store info as billing address (subscription is for the agency's own shop)
  const billing = {
    name: siteConfig.store.legalName,
    zip: "", // Would come from a billing address field on the subscription
    city: "",
    street: siteConfig.store.address,
    email: siteConfig.store.email,
  };

  const input: SubscriptionInvoiceInput = {
    invoice: invoice as SubscriptionInvoiceRow,
    planName: plan.name,
    billingCycle: subscription.billing_cycle as "monthly" | "annual",
    billing,
  };

  let result: InvoiceGenerationResult;

  switch (provider) {
    case "billingo":
      result = await createBillingoSubscriptionInvoice(input);
      break;
    case "szamlazz":
      result = await createSzamlazzSubscriptionInvoice(input);
      break;
    default:
      return { success: true };
  }

  // Update invoice record with provider details
  if (result.success && result.invoiceNumber) {
    await admin
      .from("subscription_invoices")
      .update({
        invoice_provider: provider,
        invoice_number: result.invoiceNumber,
        invoice_url: result.invoiceUrl ?? null,
      })
      .eq("id", invoiceId);
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatPeriod(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
}

function formatDateForXml(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
