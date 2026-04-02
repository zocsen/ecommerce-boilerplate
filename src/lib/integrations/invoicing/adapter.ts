/* ------------------------------------------------------------------ */
/*  Invoicing Adapter – Strategy pattern                               */
/*                                                                     */
/*  Provides a common interface for invoice generation across           */
/*  multiple Hungarian invoicing providers (Billingo, Számlázz.hu).    */
/*  In development or when no provider is configured, the NullAdapter  */
/*  is used as a no-op fallback.                                       */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";
import type {
  OrderRow,
  OrderItemRow,
  AddressJson,
  VariantSnapshotJson,
} from "@/lib/types/database";

// ── Helpers ───────────────────────────────────────────────────────

/** Billingo expects VAT as a string like "27%" */
function billingoVatString(vatRate: number): string {
  return `${vatRate}%`;
}

/** Calculate net price from gross price and VAT rate */
function grossToNet(gross: number, vatRate: number): number {
  return Math.round(gross / (1 + vatRate / 100));
}

/** Calculate VAT amount from gross price and VAT rate */
function grossToVat(gross: number, vatRate: number): number {
  const net = grossToNet(gross, vatRate);
  return gross - net;
}

// ── Interface ─────────────────────────────────────────────────────

export interface InvoiceResult {
  invoiceNumber: string;
  invoiceUrl: string;
}

export interface InvoicingAdapter {
  readonly provider: string;
  createInvoice(order: OrderRow, items: OrderItemRow[]): Promise<InvoiceResult>;
}

// ── Billingo Adapter ──────────────────────────────────────────────

export class BillingoAdapter implements InvoicingAdapter {
  readonly provider = "billingo";

  private getApiKey(): string {
    const key = process.env.BILLINGO_API_KEY;
    if (!key) {
      throw new Error(
        "Missing BILLINGO_API_KEY environment variable. " +
          "Set it to enable Billingo invoice generation.",
      );
    }
    return key;
  }

  async createInvoice(order: OrderRow, items: OrderItemRow[]): Promise<InvoiceResult> {
    let apiKey: string;
    try {
      apiKey = this.getApiKey();
    } catch (error) {
      // In development without API key, return mock data
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[invoicing:billingo] API key not set – returning mock invoice in development mode.",
        );
        return this.createMockInvoice(order);
      }
      throw error;
    }

    // Build Billingo partner (customer) data from billing address
    const billing = order.billing_address as AddressJson | null;
    if (!billing) {
      throw new Error("A rendeléshez nem tartozik számlázási cím.");
    }
    const partnerData = {
      name: billing.name,
      address: {
        country_code: "HU",
        post_code: billing.zip,
        city: billing.city,
        address: billing.street,
      },
      emails: [order.email],
      taxcode: "",
    };

    // Build invoice items
    const invoiceItems = items.map((item) => {
      const variant = item.variant_snapshot as VariantSnapshotJson | null;
      return {
        name: item.title_snapshot,
        unit_price: item.unit_price_snapshot,
        unit_price_type: "gross",
        quantity: item.quantity,
        unit: "db",
        vat: billingoVatString(item.vat_rate),
        comment: variant?.option1Value
          ? `${variant.option1Name ?? "Méret"}: ${variant.option1Value}`
          : "",
      };
    });

    // Add shipping as a line item if applicable (service → general VAT rate)
    if (order.shipping_fee > 0) {
      invoiceItems.push({
        name: "Szállítási költség",
        unit_price: order.shipping_fee,
        unit_price_type: "gross",
        quantity: 1,
        unit: "db",
        vat: billingoVatString(siteConfig.tax.defaultVatRate),
        comment: "",
      });
    }

    // Add discount as negative line item if applicable (use general VAT rate)
    if (order.discount_total > 0) {
      invoiceItems.push({
        name: `Kedvezmény${order.coupon_code ? ` (${order.coupon_code})` : ""}`,
        unit_price: -order.discount_total,
        unit_price_type: "gross",
        quantity: 1,
        unit: "db",
        vat: billingoVatString(siteConfig.tax.defaultVatRate),
        comment: "",
      });
    }

    // Add COD fee as a line item if applicable
    if (order.cod_fee > 0) {
      invoiceItems.push({
        name: "Utánvét kezelési díj",
        unit_price: order.cod_fee,
        unit_price_type: "gross",
        quantity: 1,
        unit: "db",
        vat: billingoVatString(siteConfig.tax.defaultVatRate),
        comment: "",
      });
    }

    const baseUrl = "https://api.billingo.hu/v3";

    // Step 1: Create or find partner
    const partnerResponse = await fetch(`${baseUrl}/partners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(partnerData),
    });

    if (!partnerResponse.ok) {
      const errorText = await partnerResponse.text();
      throw new Error(`Billingo partner creation failed (${partnerResponse.status}): ${errorText}`);
    }

    const partner = (await partnerResponse.json()) as { id: number };

    // Step 2: Create draft invoice
    const invoicePayload = {
      partner_id: partner.id,
      block_id: 0, // Default block
      bank_account_id: 0,
      type: "invoice",
      payment_method: order.payment_method === "cod" ? "cash_on_delivery" : "online_bankcard",
      currency: "HUF",
      language: "hu",
      electronic: true,
      items: invoiceItems,
      settings: {
        round: "five",
      },
    };

    const invoiceResponse = await fetch(`${baseUrl}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      throw new Error(`Billingo invoice creation failed (${invoiceResponse.status}): ${errorText}`);
    }

    const invoice = (await invoiceResponse.json()) as {
      id: number;
      invoice_number: string;
      public_url: string;
    };

    return {
      invoiceNumber: invoice.invoice_number,
      invoiceUrl: invoice.public_url,
    };
  }

  private createMockInvoice(order: OrderRow): InvoiceResult {
    const mockNumber = `BILL-${Date.now()}-${order.id.slice(0, 4).toUpperCase()}`;
    console.info(`[invoicing:billingo] Mock invoice created: ${mockNumber} for order ${order.id}`);
    return {
      invoiceNumber: mockNumber,
      invoiceUrl: `https://app.billingo.hu/mock/${mockNumber}`,
    };
  }
}

// ── Számlázz.hu Adapter ──────────────────────────────────────────

export class SzamlazzAdapter implements InvoicingAdapter {
  readonly provider = "szamlazz";

  private getAgentKey(): string {
    const key = process.env.SZAMLAZZ_AGENT_KEY;
    if (!key) {
      throw new Error(
        "Missing SZAMLAZZ_AGENT_KEY environment variable. " +
          "Set it to enable Számlázz.hu invoice generation.",
      );
    }
    return key;
  }

  async createInvoice(order: OrderRow, items: OrderItemRow[]): Promise<InvoiceResult> {
    let agentKey: string;
    try {
      agentKey = this.getAgentKey();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[invoicing:szamlazz] Agent key not set – returning mock invoice in development mode.",
        );
        return this.createMockInvoice(order);
      }
      throw error;
    }

    const billing = order.billing_address as AddressJson | null;
    if (!billing) {
      throw new Error("A rendeléshez nem tartozik számlázási cím.");
    }

    // Build XML payload for Számlázz.hu Agent API
    const xmlItems = items
      .map(
        (item) => `
      <tetel>
        <megnevezes>${escapeXml(item.title_snapshot)}</megnevezes>
        <mennyiseg>${item.quantity}</mennyiseg>
        <mennyisegiEgyseg>db</mennyisegiEgyseg>
        <nettoEgysegar>${grossToNet(item.unit_price_snapshot, item.vat_rate)}</nettoEgysegar>
        <afakulcs>${item.vat_rate}</afakulcs>
        <nettoErtek>${grossToNet(item.line_total, item.vat_rate)}</nettoErtek>
        <afaErtek>${grossToVat(item.line_total, item.vat_rate)}</afaErtek>
        <bruttoErtek>${item.line_total}</bruttoErtek>
      </tetel>`,
      )
      .join("");

    // Add shipping line item (service → general VAT rate)
    const shippingVat = siteConfig.tax.defaultVatRate;
    const shippingXml =
      order.shipping_fee > 0
        ? `
      <tetel>
        <megnevezes>Szállítási költség</megnevezes>
        <mennyiseg>1</mennyiseg>
        <mennyisegiEgyseg>db</mennyisegiEgyseg>
        <nettoEgysegar>${grossToNet(order.shipping_fee, shippingVat)}</nettoEgysegar>
        <afakulcs>${shippingVat}</afakulcs>
        <nettoErtek>${grossToNet(order.shipping_fee, shippingVat)}</nettoErtek>
        <afaErtek>${grossToVat(order.shipping_fee, shippingVat)}</afaErtek>
        <bruttoErtek>${order.shipping_fee}</bruttoErtek>
      </tetel>`
        : "";

    // Add COD fee line item if applicable
    const codVat = siteConfig.tax.defaultVatRate;
    const codFeeXml =
      order.cod_fee > 0
        ? `
      <tetel>
        <megnevezes>Utánvét kezelési díj</megnevezes>
        <mennyiseg>1</mennyiseg>
        <mennyisegiEgyseg>db</mennyisegiEgyseg>
        <nettoEgysegar>${grossToNet(order.cod_fee, codVat)}</nettoEgysegar>
        <afakulcs>${codVat}</afakulcs>
        <nettoErtek>${grossToNet(order.cod_fee, codVat)}</nettoErtek>
        <afaErtek>${grossToVat(order.cod_fee, codVat)}</afaErtek>
        <bruttoErtek>${order.cod_fee}</bruttoErtek>
      </tetel>`
        : "";

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
    <fizmod>${order.payment_method === "cod" ? "Utánvét" : "Bankkártya (online)"}</fizmod>
    <ppienz>HUF</ppienz>
    <szamlaNyelve>hu</szamlaNyelve>
    <megjegyzes>Rendelés: ${order.id.slice(0, 8).toUpperCase()}</megjegyzes>
    <rendelesSzam>${order.id}</rendelesSzam>
    <epiFelhasznaloAzonosito>${order.email}</epiFelhasznaloAzonosito>
  </fejlec>
  <elado></elado>
  <vevo>
    <nev>${escapeXml(billing.name)}</nev>
    <irsz>${escapeXml(billing.zip)}</irsz>
    <telepules>${escapeXml(billing.city)}</telepules>
    <cim>${escapeXml(billing.street)}</cim>
    <email>${escapeXml(order.email)}</email>
  </vevo>
  <tetelek>
    ${xmlItems}
    ${shippingXml}
    ${codFeeXml}
  </tetelek>
</xmlszamla>`;

    const response = await fetch("https://www.szamlazz.hu/szamla/", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Számlázz.hu invoice creation failed (${response.status}): ${errorText}`);
    }

    // Parse response headers for invoice number and PDF URL
    const invoiceNumber = response.headers.get("szlahu_szamlaszam") ?? `SZ-${Date.now()}`;
    const invoiceUrl =
      response.headers.get("szlahu_szamlapdf") ??
      `https://www.szamlazz.hu/szamla/?action=szamlapdf&id=${invoiceNumber}`;

    return { invoiceNumber, invoiceUrl };
  }

  private createMockInvoice(order: OrderRow): InvoiceResult {
    const mockNumber = `SZ-${Date.now()}-${order.id.slice(0, 4).toUpperCase()}`;
    console.info(`[invoicing:szamlazz] Mock invoice created: ${mockNumber} for order ${order.id}`);
    return {
      invoiceNumber: mockNumber,
      invoiceUrl: `https://www.szamlazz.hu/mock/${mockNumber}`,
    };
  }
}

// ── Null Adapter (no-op) ──────────────────────────────────────────

export class NullAdapter implements InvoicingAdapter {
  readonly provider = "none";

  async createInvoice(_order: OrderRow, _items: OrderItemRow[]): Promise<InvoiceResult> {
    console.info("[invoicing:none] No invoicing provider configured. Skipping invoice generation.");
    return {
      invoiceNumber: "",
      invoiceUrl: "",
    };
  }
}

// ── Factory ───────────────────────────────────────────────────────

let cachedAdapter: InvoicingAdapter | null = null;

/**
 * Returns the correct invoicing adapter based on `siteConfig.invoicing.provider`.
 *
 * The adapter is cached for the lifetime of the server process.
 */
export function getInvoicingAdapter(): InvoicingAdapter {
  if (cachedAdapter) return cachedAdapter;

  const { provider } = siteConfig.invoicing;

  switch (provider) {
    case "billingo":
      cachedAdapter = new BillingoAdapter();
      break;
    case "szamlazz":
      cachedAdapter = new SzamlazzAdapter();
      break;
    case "none":
    default:
      cachedAdapter = new NullAdapter();
      break;
  }

  console.info(`[invoicing] Initialized adapter: ${cachedAdapter.provider}`);

  return cachedAdapter;
}

// ── XML helpers ───────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateForXml(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
