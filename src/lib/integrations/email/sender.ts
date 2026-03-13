/* ------------------------------------------------------------------ */
/*  Email Sender Configuration                                        */
/*                                                                     */
/*  Manages sender addresses for transactional vs. marketing emails.   */
/*  Supports environment-based configuration for local dev vs prod.    */
/*                                                                     */
/*  Usage:                                                             */
/*    const from = getSenderEmail('transactional');                    */
/*    const from = getSenderEmail('marketing');                        */
/* ------------------------------------------------------------------ */

/**
 * Email category determines which sender address to use.
 */
export type EmailCategory = 'transactional' | 'marketing';

/**
 * Get the "from" email address based on category and environment.
 * 
 * In production (with verified domain):
 * - transactional → orders@yourdomain.com
 * - marketing → marketing@yourdomain.com
 * 
 * In development (sandbox):
 * - Both → onboarding@resend.dev (or custom test address)
 */
export function getSenderEmail(category: EmailCategory): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: use separate domains for better reputation tracking
    if (category === 'transactional') {
      return process.env.RESEND_FROM_EMAIL || 'orders@yourdomain.com';
    } else {
      return process.env.RESEND_MARKETING_FROM_EMAIL || 'marketing@yourdomain.com';
    }
  }
  
  // Development: use sandbox address
  // Resend provides onboarding@resend.dev by default
  // Or override with RESEND_FROM_EMAIL in .env.local
  const testAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  // Optional: Add [DEV] prefix to subject in development for visibility
  return testAddress;
}

/**
 * Get the reply-to address (optional, typically support email).
 */
export function getReplyToEmail(): string {
  return process.env.RESEND_REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || '';
}

/**
 * Format a display name with email address.
 * 
 * Example:
 *   formatFromAddress('Agency Store', 'orders@agency.hu')
 *   → 'Agency Store <orders@agency.hu>'
 */
export function formatFromAddress(displayName: string, email: string): string {
  return `${displayName} <${email}>`;
}

/**
 * Get the full "from" header value with display name.
 * Respects environment-based sender configuration.
 * 
 * Example in transactional emails:
 *   const from = getFullFromAddress('transactional');
 *   // Production: 'Agency Store <orders@agency.hu>'
 *   // Dev: 'Agency Store <onboarding@resend.dev>'
 */
export function getFullFromAddress(
  category: EmailCategory,
  displayName?: string,
): string {
  const email = getSenderEmail(category);
  const name = displayName || process.env.STORE_NAME || 'Agency Store';
  
  // In development, optionally add [DEV] prefix for visibility
  if (process.env.NODE_ENV !== 'production') {
    return formatFromAddress(`[DEV] ${name}`, email);
  }
  
  return formatFromAddress(name, email);
}

/**
 * Utility to determine if email sending should use test recipient.
 * Useful for preventing accidental sends to real users in development.
 * 
 * Example:
 *   const recipient = shouldRedirectToTestRecipient() 
 *     ? process.env.RESEND_TEST_RECIPIENT
 *     : order.email;
 */
export function shouldRedirectToTestRecipient(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    !!process.env.RESEND_TEST_RECIPIENT
  );
}

/**
 * Get the actual recipient email, applying test redirect if needed.
 * 
 * Example in actions:
 *   const recipient = getRecipient(order.email);
 *   await sendEmail({ to: recipient, ... });
 */
export function getRecipient(email: string): string {
  if (shouldRedirectToTestRecipient()) {
    return process.env.RESEND_TEST_RECIPIENT!;
  }
  return email;
}
