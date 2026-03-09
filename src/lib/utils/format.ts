/* ------------------------------------------------------------------ */
/*  Hungarian formatting utilities                                     */
/* ------------------------------------------------------------------ */

/**
 * Format an integer amount as Hungarian Forint.
 * Uses non-breaking space as thousands separator and "Ft" suffix.
 * Example: 12345 → "12 345 Ft"
 */
export function formatHUF(amount: number): string {
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const abs = Math.abs(rounded).toString();

  // Insert spaces every 3 digits from the right
  let formatted = "";
  for (let i = 0; i < abs.length; i++) {
    if (i > 0 && (abs.length - i) % 3 === 0) {
      formatted += "\u00A0"; // non-breaking space
    }
    formatted += abs[i];
  }

  return `${isNegative ? "-" : ""}${formatted} Ft`;
}

/**
 * Format a date to Hungarian standard: "2026. 03. 09."
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}. ${month}. ${day}.`;
}

/**
 * Format a date + time to Hungarian standard: "2026. 03. 09. 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  // Remove trailing dot from datePart, then append time
  return `${datePart.slice(0, -1)} ${hours}:${minutes}`;
}

/**
 * Normalize a Hungarian phone number for display.
 * Accepts various formats and outputs "+36 XX XXX XXXX".
 */
export function formatPhone(phone: string): string {
  // Strip all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Handle +36 prefix
  let digits: string;
  if (cleaned.startsWith("+36")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0036")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("06")) {
    digits = cleaned.slice(2);
  } else {
    // Already just the local digits, or unknown format — return as-is
    digits = cleaned.replace(/^\+/, "");
  }

  // Expect 9 digits for Hungarian mobile/landline
  if (digits.length === 9) {
    return `+36 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  // Fallback: return cleaned input if we can't normalize
  return phone.trim();
}

/**
 * Truncate a string to a maximum length, appending "…" if truncated.
 */
export function truncate(str: string, length: number): string {
  if (length < 1) return "";
  if (str.length <= length) return str;
  return str.slice(0, length - 1) + "…";
}
