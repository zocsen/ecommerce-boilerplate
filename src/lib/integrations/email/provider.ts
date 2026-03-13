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

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an HTTP status code is retryable.
 * 429 (rate limit) and 5xx (server errors) are retryable.
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// ── Retry configuration ──────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500; // 500ms, 1s, 2s
const DEFAULT_MAX_DELAY_MS = 10_000;

// ── Public API ────────────────────────────────────────────────────

/**
 * Send an email via Resend with automatic retry on transient failures.
 *
 * Uses the Resend REST API directly (no SDK) so we don't add a
 * runtime dependency. Works in both Node and Edge runtimes.
 *
 * Retries with exponential backoff on 429 (rate limit) and 5xx errors.
 * Non-retryable errors (4xx except 429) fail immediately.
 */
export async function sendEmail(
  options: SendEmailOptions & {
    maxRetries?: number;
    baseDelayMs?: number;
  },
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
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

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

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = (await response.json()) as ResendSuccessResponse;
        return { success: true, messageId: data.id };
      }

      const errorData = (await response.json()) as ResendErrorResponse;
      lastError = `Resend API error (${response.status}): ${errorData.message}`;

      // Only retry on transient errors
      if (!isRetryableStatus(response.status)) {
        console.error("[email-provider]", lastError);
        return { success: false, error: lastError };
      }

      // If we have retries left, wait with exponential backoff
      if (attempt < maxRetries) {
        const delayMs = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          DEFAULT_MAX_DELAY_MS,
        );
        console.warn(
          `[email-provider] Retryable error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms:`,
          lastError,
        );
        await sleep(delayMs);
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unknown email sending error";

      // Network errors are retryable
      if (attempt < maxRetries) {
        const delayMs = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          DEFAULT_MAX_DELAY_MS,
        );
        console.warn(
          `[email-provider] Network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms:`,
          lastError,
        );
        await sleep(delayMs);
      }
    }
  }

  console.error(
    `[email-provider] All ${maxRetries + 1} attempts failed:`,
    lastError,
  );
  return { success: false, error: lastError };
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
