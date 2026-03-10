/* ------------------------------------------------------------------ */
/*  Unsubscribe token – HMAC-SHA256 sign / verify                      */
/*                                                                     */
/*  Token format (URL-safe base64, no padding):                        */
/*    <email_b64>.<signature>                                           */
/*                                                                     */
/*  The token is stateless: we embed the email so the route handler    */
/*  can look up the subscriber without a DB round-trip for the email   */
/*  itself.  Verification is the only DB operation needed.             */
/* ------------------------------------------------------------------ */

const ALGORITHM = "SHA-256";
const ENCODING = "base64url" as const;

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET environment variable is not set");
  }
  return secret;
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: ALGORITHM },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  // Convert to base64url
  return Buffer.from(sig).toString(ENCODING);
}

/** Generate a signed unsubscribe token for the given email address. */
export async function signUnsubscribeToken(email: string): Promise<string> {
  const secret = getSecret();
  const emailB64 = Buffer.from(email).toString(ENCODING);
  const signature = await hmac(secret, emailB64);
  return `${emailB64}.${signature}`;
}

/** Verify a token and return the embedded email, or null if invalid. */
export async function verifyUnsubscribeToken(
  token: string,
): Promise<string | null> {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const emailB64 = token.slice(0, dotIndex);
    const providedSig = token.slice(dotIndex + 1);

    const secret = getSecret();
    const expectedSig = await hmac(secret, emailB64);

    // Constant-time comparison to prevent timing attacks
    if (providedSig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < providedSig.length; i++) {
      diff |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const email = Buffer.from(emailB64, ENCODING).toString("utf8");
    return email;
  } catch {
    return null;
  }
}
