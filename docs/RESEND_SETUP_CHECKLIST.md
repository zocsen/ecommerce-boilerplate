# Resend Setup Checklist

## Quick Start (Local Development)

### Step 1: Create Resend Account

- [ ] Go to https://resend.com
- [ ] Create free account
- [ ] You'll receive a test email address (e.g., `onboarding@resend.dev`)
- [ ] Copy your API key (starts with `re_`)

### Step 2: Configure Environment (.env.local for local development)

```env
# Local development
RESEND_API_KEY=re_your_test_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_MARKETING_FROM_EMAIL=onboarding@resend.dev

# Optional: Redirect emails to yourself for testing
RESEND_TEST_RECIPIENT=your-email@example.com
```

### Step 3: Test Email Sending

#### Option A: Send via Server Action

```typescript
// In your server action or API route
import { sendReceipt } from "@/lib/integrations/email/actions";

const result = await sendReceipt(orderId);
console.log("Email sent:", result);
```

#### Option B: Preview Email Template

```bash
# View email previews at http://localhost:3000/emails (if using React Email dev server)
npm run email
```

#### Option C: Send via Development Endpoint (if created)

```bash
curl -X POST http://localhost:3000/api/dev/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"orderId": "your-order-id"}'
```

### Step 4: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Click "Transactional" tab
3. You should see your test email
4. Click to view rendering, delivery status, etc.

---

## Production Setup

### Step 1: Verify Your Domain

1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records as shown:
   - CNAME for mail authentication
   - SPF and DKIM for deliverability
5. Wait for DNS propagation (up to 24h)
6. Once verified, you can use custom sender addresses

### Step 2: Create Separate Sender Addresses

In your production `.env`:

```env
RESEND_API_KEY=re_your_production_api_key
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com
```

Benefits:

- Separate sender reputation for transactional vs. marketing
- Better email deliverability
- Independent bounce/complaint tracking

### Step 3: Set Up Webhook (Optional but Recommended)

1. In Resend Dashboard, go to API Tokens
2. Create webhook endpoint:
   - URL: `https://yourdomain.com/api/email/webhook/resend`
   - Events: `email.bounced`, `email.complained`, `email.delivered`, `email.opened`
3. Copy the signing secret
4. Add to your production `.env`:

```env
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
```

This allows automatic unsubscribing of bounced emails.

### Step 4: Update Site Configuration

In `src/lib/config/site.config.ts`, update:

```typescript
store: {
  name: "Your Store Name", // Used in email display names
  email: "support@yourdomain.com",
  // ... other config
},
urls: {
  siteUrl: "https://yourdomain.com", // For email links
  supportEmail: "support@yourdomain.com",
},
features: {
  enableMarketingModule: true, // To send newsletters
  enableAbandonedCart: true, // To send cart reminders
  // ... other features
},
```

---

## Architecture Overview

### Email Types

#### Transactional (Functional)

- Order receipts
- Shipping updates
- Password resets
- Welcome emails
- **Sender:** `orders@yourdomain.com`

#### Marketing

- Newsletters
- Abandoned cart reminders
- Promotional offers
- **Sender:** `marketing@yourdomain.com`

### File Structure

```
src/
├── lib/integrations/email/
│   ├── provider.ts          # Resend API wrapper (fetch-based)
│   ├── sender.ts            # NEW: Sender configuration
│   ├── webhook.ts           # NEW: Webhook handlers
│   ├── templates.tsx        # React Email rendering
│   └── actions.ts           # Server Actions (sendReceipt, sendNewsletter, etc.)
├── emails/                  # React Email templates
│   ├── order-receipt.tsx
│   ├── shipping-update.tsx
│   ├── abandoned-cart.tsx
│   └── newsletter.tsx
└── app/api/email/
    └── webhook/resend/route.ts  # NEW: Webhook receiver
```

### Data Flow

```
User Action
    ↓
Server Action (src/lib/integrations/email/actions.ts)
    ↓ (Fetch order/subscriber data)
Supabase
    ↓
Render React Email Template
    ↓
Send HTML via Resend API
    ↓
Resend → Email Provider (Gmail, Outlook, etc.)
    ↓
Recipient
    ↓
Event Webhook (bounce, complaint, open, click)
    ↓
Your /api/email/webhook/resend endpoint
    ↓
Update subscriber status in Supabase
```

---

## Testing Checklist

### Local Development

- [ ] Email sends successfully to `RESEND_TEST_RECIPIENT`
- [ ] Email renders correctly (check Resend dashboard)
- [ ] All template variables are populated
- [ ] Links in email work correctly
- [ ] "Unsubscribe" link is present in marketing emails

### Production

- [ ] Domain is verified in Resend
- [ ] Custom sender addresses work (`orders@yourdomain.com`)
- [ ] SPF/DKIM records are added
- [ ] Webhook is configured and receiving events
- [ ] Bounces/complaints automatically unsubscribe users
- [ ] Email delivery tracking works

---

## Troubleshooting

### Email not sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify `RESEND_FROM_EMAIL` is valid
3. In dev, check `RESEND_TEST_RECIPIENT` if using redirect
4. Check console for error messages
5. View Resend dashboard for failed sends

### Email rendering looks broken

1. Verify React Email components are used (not plain HTML)
2. Inline all styles (no external CSS)
3. Test in multiple email clients
4. Use Resend's email preview feature

### Webhook not receiving events

1. Verify endpoint is publicly accessible: `curl https://yourdomain.com/api/email/webhook/resend`
2. Check `RESEND_WEBHOOK_SECRET` matches Resend dashboard
3. Check server logs for 401 (signature error) or 500 (handler error)
4. Test with Resend CLI: `resend webhook test`

### Low email deliverability

1. Verify domain in Resend (SPF/DKIM)
2. Check bounce rates in Resend dashboard
3. Implement webhook to automatically unsubscribe bounces
4. Remove hard bounces from future sends
5. Monitor complaint rate (should be < 0.1%)

---

## Resources

- **Resend Docs**: https://resend.com/docs
- **React Email**: https://react.email
- **Email Best Practices**: https://resend.com/docs/guides/best-practices
- **Webhook Guide**: https://resend.com/docs/webhooks
- **Email Authentication**: https://resend.com/docs/features/authentication

---

## Common Questions

### Q: Can I test emails locally without Resend?

A: Yes, use environment-based redirect:

```env
RESEND_TEST_RECIPIENT=your-email@example.com
```

All emails will be sent to this address instead.

### Q: What's the difference between transactional and marketing?

A: Transactional emails are triggered by user actions (orders, shipping updates). Marketing emails are sent to your subscriber list (newsletters, promotions). Keeping them separate improves deliverability.

### Q: How do I handle unsubscribes?

A: Resend webhooks automatically detect complaints and bounces. Each marketing email includes an unsubscribe link that updates the `subscribers` table status to `unsubscribed`.

### Q: Do I need the webhook in production?

A: Optional but recommended. It automatically prevents sending to bounced/complaint addresses, improving deliverability.

### Q: Can I use HTML email templates instead of React Email?

A: Yes, but React Email provides better type safety and component reusability. The provider accepts any HTML string via the `html` parameter.

### Q: What if I want to send from multiple domains?

A: Verify each domain in Resend, then use different `RESEND_FROM_EMAIL` values in your config for different campaigns.

---

## Next Steps

1. ✅ Create Resend account and get API key
2. ✅ Configure `.env.local` with test settings
3. ✅ Send your first test email
4. ✅ Verify domain (if using production)
5. ✅ Configure webhook (for production)
6. ✅ Test with multiple email clients
7. ✅ Deploy and monitor

Need help? Check `docs/RESEND_INTEGRATION.md` for detailed documentation.
