/* ------------------------------------------------------------------ */
/*  Email Provider – Resend adapter                                    */
/*                                                                     */
/*  Wraps the Resend HTTP API for transactional and marketing email    */
/*  sending. No SDK dependency — uses plain fetch for portability.      */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";

// ── Types ──────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ResendSuccessResponse {
  id: string;
}

interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

// ── Internal helpers ──────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'Missing RESEND_API_KEY environment variable. Email sending is disabled.',
    );
  }
  return key;
}

function getDefaultFrom(): string {
  const envFrom = process.env.RESEND_FROM_EMAIL;
  if (envFrom) return envFrom;
  return `${siteConfig.store.name} <orders@${new URL(siteConfig.urls.siteUrl).hostname}>`;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Send an email via Resend.
 *
 * Uses the Resend REST API directly (no SDK) so we don't add a
 * runtime dependency. Works in both Node and Edge runtimes.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  let apiKey: string;
  try {
    apiKey = getApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Missing API key";
    console.warn("[email-provider]", message);
    return { success: false, error: message };
  }

  const from = options.from ?? getDefaultFrom();
  const to = Array.isArray(options.to) ? options.to : [options.to];

  const body: Record<string, unknown> = {
    from,
    to,
    subject: options.subject,
    html: options.html,
  };

  if (options.replyTo) {
    body.reply_to = options.replyTo;
  }

  if (options.tags && options.tags.length > 0) {
    body.tags = options.tags;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ResendErrorResponse;
      const errorMessage = `Resend API error (${response.status}): ${errorData.message}`;
      console.error("[email-provider]", errorMessage);
      return { success: false, error: errorMessage };
    }

    const data = (await response.json()) as ResendSuccessResponse;

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email sending error";
    console.error("[email-provider] Send failed:", message);
    return { success: false, error: message };
  }
}

/**
 * Send an email to multiple recipients (batch).
 *
 * Resend supports up to 100 recipients per call. For larger lists
 * this function chunks the recipients automatically.
 */
export async function sendBatchEmail(
  options: Omit<SendEmailOptions, "to"> & { to: string[] },
): Promise<SendEmailResult[]> {
  const CHUNK_SIZE = 50;
  const results: SendEmailResult[] = [];

  for (let i = 0; i < options.to.length; i += CHUNK_SIZE) {
    const chunk = options.to.slice(i, i + CHUNK_SIZE);

    // Send individually for better deliverability and per-recipient tracking
    const chunkResults = await Promise.allSettled(
      chunk.map((recipient) =>
        sendEmail({
          ...options,
          to: recipient,
        }),
      ),
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason instanceof Error
            ? result.reason.message
            : "Unknown batch email error",
        });
      }
    }
  }

  return results;
}
