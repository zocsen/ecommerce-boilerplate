/* ------------------------------------------------------------------ */
/*  Relaxed UUID validator                                              */
/*  Accepts any 8-4-4-4-12 hex string without RFC 4122 version/variant */
/*  checks. Postgres uuid type accepts these, but Zod's z.uuid() and   */
/*  z.string().uuid() require strict RFC 4122 compliance which rejects  */
/*  UUIDs like a0000001-0000-0000-0000-000000000001.                    */
/* ------------------------------------------------------------------ */

import { z } from "zod";

/**
 * Regex for a hex-format UUID: 8-4-4-4-12 hex characters.
 * Does NOT enforce RFC 4122 version/variant nibbles.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Relaxed UUID schema that validates the format without RFC 4122 version checks.
 * Use this instead of `z.string().uuid()` or `z.uuid()` throughout the project.
 */
export const uuidSchema = z.string().regex(UUID_REGEX, "Ervenytelen UUID formatum");

/**
 * Helper for inline usage: validates a single UUID string.
 * Returns `{ success, data?, error? }` like `z.string().uuid().safeParse()`.
 */
export function parseUuid(value: unknown) {
  return uuidSchema.safeParse(value);
}
