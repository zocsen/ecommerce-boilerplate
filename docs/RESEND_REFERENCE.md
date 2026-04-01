# Resend Integration Reference

## Quick Links

📚 **Documentation:**

- `docs/RESEND_SETUP_CHECKLIST.md` - Start here (5 min setup)
- `docs/RESEND_OVERVIEW.md` - Complete overview
- `docs/RESEND_INTEGRATION.md` - Detailed guide

💻 **Code:**

- `src/lib/integrations/email/` - Core email integration
- `src/app/api/email/webhook/resend/` - Webhook receiver
- `src/emails/` - Email templates

⚙️ **Configuration:**

- `.env.example` - Environment variables template
- `src/lib/config/site.config.ts` - Site configuration

---

## Key Features

### ✅ Transactional Emails (Functional)

- Order receipts (after payment)
- Shipping notifications (with tracking)
- Abandoned cart recovery (after 24h)
- Password resets (optional)

### ✅ Marketing Emails

- Newsletter campaigns (manual send)
- Email segmentation (tags)
- Automatic unsubscribe on complaints/bounces
- Per-recipient unsubscribe tokens

### ✅ Local Development

- Test emails with sandbox address
- Optional redirect to test recipient
- No real emails sent to customers
- Full debugging in console

### ✅ Production Ready

- Domain verification (SPF/DKIM/DMARC)
- Separate transactional & marketing senders
- Webhook handling for bounces/complaints
- Automatic subscriber management
- Analytics in Resend dashboard

---

## Core Modules

### `sender.ts` - Sender Configuration

```typescript
import { getSenderEmail, getRecipient } from "@/lib/integrations/email/sender";

// Get sender based on type
const from = getSenderEmail("transactional"); // orders@yourdomain.com
const from = getSenderEmail("marketing"); // marketing@yourdomain.com

// Apply test redirect in dev
const recipient = getRecipient(order.email); // your-email@example.com
```

### `provider.ts` - API Wrapper

```typescript
import { sendEmail } from "@/lib/integrations/email/provider";

const result = await sendEmail({
  to: email,
  subject: "Order Confirmation",
  html: "<p>...</p>",
  from: "orders@yourdomain.com",
  tags: [{ name: "type", value: "receipt" }],
});
```

### `webhook.ts` - Event Handlers

```typescript
import { handleWebhookEvent } from "@/lib/integrations/email/webhook";

// Called from /api/email/webhook/resend
await handleWebhookEvent({
  type: "email.bounced",
  data: { to: ["user@example.com"], email_id: "..." },
  created_at: new Date().toISOString(),
});
```

### `actions.ts` - Server Actions

```typescript
import {
  sendReceipt,
  sendShippingUpdate,
  sendNewsletterCampaign,
} from "@/lib/integrations/email/actions";

// Send after payment
await sendReceipt(orderId);

// Send when shipped
await sendShippingUpdate(orderId, trackingCode);

// Send newsletter
await sendNewsletterCampaign(["user1@example.com", "user2@example.com"], "Weekly Newsletter", {
  headline: "...",
  body: "...",
  ctaText: "...",
  ctaUrl: "...",
});
```

---

## Usage Examples

### Example 1: Send Order Receipt

```typescript
// In payment callback handler
import { sendReceipt } from "@/lib/integrations/email/actions";

export async function handlePaymentCallback(barionEvent: any) {
  // Verify payment and mark order as paid
  if (barionEvent.Status === "Completed") {
    await markOrderPaid(orderId);

    // Send receipt email
    const result = await sendReceipt(orderId);
    if (result.success) {
      console.log("Receipt sent:", result.messageId);
    } else {
      console.error("Receipt failed:", result.error);
    }
  }
}
```

### Example 2: Send Newsletter

```typescript
// In admin server action
import { sendNewsletterCampaign } from "@/lib/integrations/email/actions";

export async function adminSendNewsletter(input: NewsletterInput) {
  // Fetch subscribers
  const subscribers = await fetchSubscribers({ segment: "engaged" });

  // Send campaign
  const result = await sendNewsletterCampaign(
    subscribers.map((s) => s.email),
    input.subject,
    {
      headline: input.headline,
      body: input.body,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
    },
  );

  console.log(`Sent: ${result.totalSent}, Failed: ${result.totalFailed}`);
}
```

### Example 3: Process Webhook

```typescript
// In /api/email/webhook/resend
import { verifyWebhookSignature, handleWebhookEvent } from "@/lib/integrations/email/webhook";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("X-Resend-Signature");

  // Verify signature
  if (!(await verifyWebhookSignature(body, signature, process.env.RESEND_WEBHOOK_SECRET!))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Handle event
  const event = JSON.parse(body);
  await handleWebhookEvent(event); // Unsubscribe on bounce/complaint

  return new Response("OK");
}
```

---

## Environment Setup

### Local Development (`.env.local`)

```env
# Required
RESEND_API_KEY=re_test_your_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_MARKETING_FROM_EMAIL=onboarding@resend.dev

# Optional: Prevent sending to real users
RESEND_TEST_RECIPIENT=your-email@example.com
```

### Production (`.env`)

```env
# Required
RESEND_API_KEY=re_prod_your_api_key
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com

# Optional: Webhook handling
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
```

---

## Email Templates

### Order Receipt Template

```typescript
// src/emails/order-receipt.tsx
export default function OrderReceiptEmail({ order, items }: OrderReceiptEmailProps) {
  return (
    <Html lang="hu">
      <Body>
        <h1>Rendelés visszaigazolás</h1>
        {/* Line items, totals, addresses */}
      </Body>
    </Html>
  );
}
```

**Used by:** `sendReceipt(orderId)`
**Triggered:** After successful payment
**Content:** Order details, items, totals, shipping address

### Shipping Update Template

```typescript
// src/emails/shipping-update.tsx
export default function ShippingUpdateEmail({ order, trackingCode }: ShippingUpdateEmailProps) {
  return (
    <Html lang="hu">
      <Body>
        <h1>Csomagod úton van!</h1>
        {/* Tracking link, expected delivery date */}
      </Body>
    </Html>
  );
}
```

**Used by:** `sendShippingUpdate(orderId, trackingCode)`
**Triggered:** When admin marks order as "shipped"
**Content:** Tracking code, carrier info, estimated delivery

### Newsletter Template

```typescript
// src/emails/newsletter.tsx
export default function NewsletterEmail({ headline, body, ctaText, ctaUrl, unsubscribeToken }: NewsletterEmailProps) {
  return (
    <Html>
      <Body>
        <h1>{headline}</h1>
        <p>{body}</p>
        <a href={ctaUrl}>{ctaText}</a>
        <a href={`/api/email/unsubscribe?token=${unsubscribeToken}`}>Unsubscribe</a>
      </Body>
    </Html>
  );
}
```

**Used by:** `sendNewsletterCampaign(to, subject, content)`
**Triggered:** Admin sends campaign
**Content:** Custom headline, body, CTA, unsubscribe link

---

## Event Handling

### Bounce Event

```typescript
// When email bounces (invalid address)
// → Automatically unsubscribe from marketing
// → Prevents future sends

// In webhook handler:
await supabase
  .from("subscribers")
  .update({ status: "unsubscribed" })
  .eq("email", "bounced@example.com");
```

### Complaint Event

```typescript
// When user marks email as spam
// → Immediately unsubscribe
// → Prevent future sends
// → Important for sender reputation

// In webhook handler:
await supabase
  .from("subscribers")
  .update({ status: "unsubscribed", unsubscribed_at: now })
  .eq("email", "complained@example.com");
```

### Delivered Event

```typescript
// When email successfully delivered
// → Optional: log for analytics
// → Resend dashboard already tracks this
// → Can update audit logs if needed
```

### Open/Click Events

```typescript
// When user opens email or clicks link
// → Optional: track engagement
// → Use for segmentation (engaged vs inactive)
// → Resend dashboard shows analytics
```

---

## Testing Checklist

### ✅ Local Development

- [ ] Email sends to test recipient
- [ ] Email renders correctly in Resend dashboard
- [ ] All variables are populated
- [ ] Links work
- [ ] Unsubscribe link present in marketing emails

### ✅ Pre-Production

- [ ] Domain verified in Resend
- [ ] DNS records added (CNAME, SPF, DKIM)
- [ ] Custom sender addresses work
- [ ] Webhook endpoint is publicly accessible
- [ ] Webhook events are received

### ✅ Production

- [ ] Emails sent from correct sender
- [ ] Bounces/complaints trigger unsubscribe
- [ ] Bounce rate < 5%
- [ ] Complaint rate < 0.1%
- [ ] Spam filter score good
- [ ] Open rate > 20% (typical)

---

## Common Tasks

### Send Email After Event

```typescript
// In payment callback, order status change, etc.
import { sendReceipt } from "@/lib/integrations/email/actions";

const result = await sendReceipt(orderId);
if (!result.success) {
  console.error("Email failed:", result.error);
  // Handle error - retry, log, alert, etc.
}
```

### Segment Subscribers by Tag

```typescript
// In admin action
const engaged = await supabase.from("subscribers").select("email").contains("tags", ["engaged"]); // PostgreSQL contains operator

const vip = await supabase.from("subscribers").select("email").contains("tags", ["vip"]);

// Send newsletter to segment
await sendNewsletterCampaign(engaged.data?.map((s) => s.email) || [], "Weekly Update", content);
```

### Add Subscriber

```typescript
import { subscribe } from "@/lib/integrations/email/actions"; // If exists

const { error } = await supabase.from("subscribers").insert([
  {
    email: "new@example.com",
    status: "subscribed",
    source: "checkout", // or 'newsletter_signup'
    tags: ["new_customer"],
  },
]);
```

### Unsubscribe via Link

```typescript
// Create unsubscribe endpoint
// GET /api/email/unsubscribe?token=signed_token

import { verifyUnsubscribeToken } from "@/lib/security/unsubscribe-token";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  try {
    const email = await verifyUnsubscribeToken(token);

    await supabase
      .from("subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("email", email);

    return new Response("Unsubscribed successfully");
  } catch (err) {
    return new Response("Invalid token", { status: 401 });
  }
}
```

---

## Troubleshooting

| Issue                        | Cause                   | Solution                            |
| ---------------------------- | ----------------------- | ----------------------------------- |
| Email not sending            | Missing/invalid API key | Check `RESEND_API_KEY` in env       |
| Wrong sender                 | Env vars not loaded     | Verify `.env.local` is created      |
| Emails to real users in dev  | Test redirect not set   | Add `RESEND_TEST_RECIPIENT`         |
| Template not rendering       | Using plain HTML        | Use React Email components          |
| Webhook not receiving        | Endpoint not public     | Verify domain/ngrok tunnel          |
| Signature verification fails | Wrong secret            | Check `RESEND_WEBHOOK_SECRET`       |
| Bounce rate high             | Invalid email list      | Validate before sending, clean list |

---

## Resources

- **Resend Docs:** https://resend.com/docs
- **React Email:** https://react.email
- **Email Standards:** https://www.w3.org/Mail/
- **SPF/DKIM/DMARC:** https://resend.com/docs/features/authentication

---

## File Manifest

```
docs/
├── RESEND_OVERVIEW.md          ← START HERE (this file)
├── RESEND_SETUP_CHECKLIST.md   ← Quick setup guide
└── RESEND_INTEGRATION.md       ← Detailed guide

src/lib/integrations/email/
├── provider.ts                 ← Resend API wrapper
├── sender.ts                   ← Configuration (NEW)
├── webhook.ts                  ← Event handlers (NEW)
├── actions.ts                  ← Server actions
└── templates.tsx               ← Template rendering

src/emails/
├── order-receipt.tsx           ← Order confirmation
├── shipping-update.tsx         ← Shipping notification
├── abandoned-cart.tsx          ← Cart recovery
└── newsletter.tsx              ← Marketing emails

src/app/api/email/
├── webhook/resend/route.ts     ← Webhook receiver (NEW)
└── abandoned-cart/route.ts     ← Cart reminder endpoint

.env.example                    ← Updated with Resend vars
```

---

**Everything is ready to use. Start with the setup checklist, then refer to this guide as needed.**
