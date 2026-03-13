# Resend Integration Guide

This guide covers setting up Resend for **transactional emails** (receipts, shipping updates) and **marketing emails** (newsletters, abandoned cart) in both local development and production environments.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Environment Variables](#environment-variables)
3. [Email Architecture](#email-architecture)
4. [Transactional Emails (Functional)](#transactional-emails-functional)
5. [Marketing Emails](#marketing-emails)
6. [Local Development](#local-development)
7. [Production Deployment](#production-deployment)
8. [Email Rendering Best Practices](#email-rendering-best-practices)
9. [Webhook Integration](#webhook-integration)
10. [Troubleshooting](#troubleshooting)

## Setup & Configuration

### 1. Install Resend SDK

Resend is already installed in your project (`package.json`):

```bash
npm install resend
```

### 2. Get Your Resend API Keys

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Create an API key (keep it secret!)
3. For production, verify your domain in Resend:
   - Add DNS records as shown in the dashboard
   - This allows you to use custom sender domains (e.g., `orders@yourdomain.com`)

### 3. Create Resend Sender Addresses

**Recommended setup** (using DNS-verified domain):

- **Transactional sender**: `orders@yourdomain.com` (e.g., `orders@agency.hu`)
- **Marketing sender**: `marketing@yourdomain.com` (e.g., `marketing@agency.hu`)

Benefits:
- Separate sender reputation for transactional vs. marketing
- Independent bounce/complaint tracking
- Better deliverability alignment

**For development** (using Resend sandbox):

- Use your Resend sandbox email (provided after account creation)
- Example: `onboarding@resend.dev`

## Environment Variables

Add to `.env` (production) and `.env.local` (development):

```env
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here

# Sender addresses (use verified domain for production)
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com

# Optional: For webhooks (production only)
RESEND_WEBHOOK_SECRET=your_webhook_signing_secret
```

### Local Development Setup

For local testing with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`:

1. Use Resend's sandbox address in `.env.local`:

```env
RESEND_API_KEY=re_test_your_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_MARKETING_FROM_EMAIL=onboarding@resend.dev
```

2. **Always test with your own email** to verify rendering:

```env
# For development, redirect all emails to yourself
RESEND_TEST_RECIPIENT=your-email@example.com
```

3. Use environment checks to avoid sending to real users in dev:

```typescript
// In email actions
const recipient = process.env.NODE_ENV === 'development' 
  ? process.env.RESEND_TEST_RECIPIENT 
  : order.email;
```

## Email Architecture

### Folder Structure

```
src/
├── lib/
│   └── integrations/
│       └── email/
│           ├── provider.ts          # Resend API wrapper
│           ├── actions.ts           # Server actions (send receipt, newsletter, etc.)
│           ├── templates.ts         # NEW: Template rendering helpers
│           └── webhook.ts           # NEW: Webhook handlers
├── emails/
│   ├── order-receipt.tsx            # React Email template
│   ├── shipping-update.tsx
│   ├── abandoned-cart.tsx
│   └── newsletter.tsx
└── app/
    └── api/
        └── email/
            ├── send/route.ts        # Optional: manual send endpoint
            └── webhook/
                └── resend/route.ts  # Webhook receiver
```

### Design Principles

1. **Separation of concerns**:
   - Templates (React Email components) contain only UI
   - Actions (Server Actions) contain business logic
   - Provider handles API communication

2. **Rendering pattern**:
   - React Email components must be rendered to HTML strings using `render()` from `react-email`
   - Cannot use `react` prop directly in fetch-based provider (no SDK dependency)

3. **Sender management**:
   - Transactional emails use `RESEND_FROM_EMAIL`
   - Marketing emails use `RESEND_MARKETING_FROM_EMAIL`
   - Override per-email if needed

## Transactional Emails (Functional)

### Supported Flows

1. **Order Receipt** - Sent immediately after payment
2. **Shipping Update** - Sent when order status changes to "shipped"
3. **Abandoned Cart** (optional) - Sent via Edge Function after 24h inactivity

### Implementation

#### 1. Create React Email Template

Example: `src/emails/order-receipt.tsx` (already exists)

```typescript
import { Html, Body, Container, Text } from '@react-email/components';

export default function OrderReceiptEmail({ order, items }) {
  return (
    <Html>
      <Body>
        <Container>
          <h1>Order Confirmation</h1>
          {/* Email content */}
        </Container>
      </Body>
    </Html>
  );
}
```

#### 2. Create Rendering Helper

File: `src/lib/integrations/email/templates.ts`

```typescript
import { render } from 'react-email';
import OrderReceiptEmail from '@/emails/order-receipt';

export async function renderOrderReceiptEmail(order, items) {
  return await render(OrderReceiptEmail({ order, items }));
}
```

#### 3. Call from Server Action

File: `src/lib/integrations/email/actions.ts` (already implemented)

```typescript
export async function sendReceipt(orderId: string) {
  const order = await fetchOrder(orderId);
  const items = await fetchOrderItems(orderId);
  
  const html = await renderOrderReceiptEmail(order, items);
  
  return await sendEmail({
    to: order.email,
    subject: 'Order Confirmation',
    html,
    tags: [{ name: 'type', value: 'receipt' }],
  });
}
```

#### 4. Trigger After Payment

In payment callback handler (`src/lib/integrations/barion/callback.ts`):

```typescript
// After marking order as paid
await sendReceipt(orderId);
```

### Retry Strategy

For reliability, implement exponential backoff:

```typescript
async function sendEmailWithRetry(
  emailFn: () => Promise<SendEmailResult>,
  maxAttempts = 3,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await emailFn();
    if (result.success) return result;
    
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Email send failed after ${maxAttempts} attempts`);
}
```

## Marketing Emails

### Supported Flows

1. **Newsletter Campaign** - Manual send to subscribers
2. **Abandoned Cart** - Automated trigger after 24h (via Edge Function)
3. **Welcome Email** (optional) - On new subscriber signup

### Implementation

#### 1. Newsletter Campaign Builder

Create admin UI in `/admin/marketing`:

```typescript
// Admin action to send campaign
export async function sendNewsletterCampaign(input: {
  subject: string;
  content: NewsletterContent; // Predefined template structure
  tags?: string[];
  segment?: 'all' | 'engaged' | 'inactive';
}) {
  // 1. Fetch subscribers matching segment
  const subscribers = await getSubscribersBySegment(input.segment);
  
  // 2. Generate unsubscribe token for each recipient
  // 3. Send batch emails
  return await sendNewsletterCampaign(
    subscribers.map(s => s.email),
    input.subject,
    input.content,
  );
}
```

#### 2. Unsubscribe Handling

Create unsubscribe token system:

```typescript
// Sign token (one-time, per email)
const token = await signUnsubscribeToken(email);
const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?token=${token}`;

// Render in email template
<a href={unsubscribeUrl}>Unsubscribe</a>

// Webhook to verify signature and update status
app.post('/api/email/unsubscribe', async (req) => {
  const { token } = req.query;
  const email = await verifyUnsubscribeToken(token);
  await updateSubscriberStatus(email, 'unsubscribed');
});
```

#### 3. Abandoned Cart Email

Triggered by Edge Function (in Supabase):

```typescript
// Edge Function (runs on schedule or via cron)
import { sendAbandonedCartEmail } from '@/lib/integrations/email/actions';

// Find draft orders older than 24h
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'draft')
  .lt('created_at', oneDay.toISOString());

for (const order of orders) {
  await sendAbandonedCartEmail(order.id);
}
```

### Subscriber Management

Maintain a `subscribers` table for marketing:

```sql
CREATE TABLE subscribers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  status 'subscribed' | 'unsubscribed',
  tags TEXT[] DEFAULT '{}'
  source TEXT, -- 'newsletter_signup', 'checkout', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Use tags for segmentation:
- `engaged` - opened emails recently
- `inactive` - no opens in 30 days
- `vip` - customers over certain AOV
- `cart_abandoners` - checked out but didn't pay

## Local Development

### Testing Email Rendering

Use React Email dev preview:

```bash
# Install react-email CLI (optional)
npm install -D react-email

# Preview emails at http://localhost:3000/emails
npm run email
```

Or access via the `PreviewProps` in each template:

```typescript
export const OrderReceiptEmail = ({ order, items }) => { /* ... */ };

OrderReceiptEmail.PreviewProps = {
  order: { /* mock data */ },
  items: [ /* mock data */ ],
};
```

### Sending Test Emails

#### Option 1: Server Action from Admin Panel

Create a test endpoint:

```typescript
// src/app/api/dev/send-test-email/route.ts
// Only available in development

import { sendReceipt } from '@/lib/integrations/email/actions';

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not available in production', { status: 403 });
  }
  
  const { orderId } = await req.json();
  const result = await sendReceipt(orderId);
  return Response.json(result);
}
```

#### Option 2: Environment-Based Recipient Override

```typescript
// src/lib/integrations/email/provider.ts

function getRecipient(email: string): string {
  // In development, always send to yourself
  if (process.env.NODE_ENV === 'development' && process.env.RESEND_TEST_RECIPIENT) {
    return process.env.RESEND_TEST_RECIPIENT;
  }
  return email;
}
```

### Debugging Email Rendering

Add logging to track issues:

```typescript
export async function sendEmail(options: SendEmailOptions) {
  console.log('[email-provider]', {
    to: options.to,
    subject: options.subject,
    htmlLength: options.html.length,
    tags: options.tags,
  });
  
  // ... send logic
}
```

## Production Deployment

### 1. DNS Setup (One-Time)

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records as shown:
   - `CNAME` for mail authentication
   - `MX` (optional, for inbound)
   - `SPF` and `DKIM` for deliverability

4. Once verified, use custom sender addresses:

```env
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com
```

### 2. Webhook Verification Setup

Set signing secret in Resend dashboard:

```env
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
```

### 3. Environment Variables

Use your deployment platform's secrets manager:

```
RESEND_API_KEY=re_prod_your_key
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_...
```

Never commit real keys to version control.

### 4. Monitoring & Analytics

Resend provides:
- **Open tracking** (enabled by default)
- **Click tracking** (enabled by default)
- **Bounce/complaint webhooks** (recommended for production)
- **Event logs** in dashboard

View metrics in Resend dashboard for each sender domain.

## Email Rendering Best Practices

### 1. Use `react-email` for Templates

```typescript
import { 
  Html, Body, Container, 
  Heading, Text, Button, Link 
} from '@react-email/components';

export default function EmailTemplate({ name }) {
  return (
    <Html lang="hu">
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px' }}>
          <Heading>Hello {name}</Heading>
          <Button href="https://example.com">
            View Order
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### 2. Render to HTML String

```typescript
import { render } from 'react-email';

const html = await render(EmailTemplate({ name: 'John' }));
console.log(typeof html); // 'string'
```

### 3. Inline Styles Only

Email clients don't support external CSS. Use inline styles:

```typescript
<Text style={{ color: '#666', fontSize: '14px', margin: '0 0 16px' }}>
  This is inlined.
</Text>
```

### 4. Accessibility

- Use semantic HTML (`<h1>`, `<p>`, `<button>`)
- Add `alt` text to images
- Use `role` attributes for complex layouts
- Test in screen readers

### 5. Responsive Design

```typescript
// Use padding/margin instead of grid widths
<Container style={{ maxWidth: '600px' }}>
  <Row>
    <Column style={{ width: '100%' }}>
      Stacks on mobile
    </Column>
  </Row>
</Container>
```

### 6. Variable Interpolation

Pass all data as props:

```typescript
interface OrderReceiptProps {
  customerName: string;
  orderId: string;
  items: LineItem[];
  total: number;
}

export default function OrderReceiptEmail(props: OrderReceiptProps) {
  return (
    <Html>
      <Body>
        <Text>Hi {props.customerName}</Text>
        {props.items.map(item => (
          <Text key={item.id}>{item.title} – {item.price} HUF</Text>
        ))}
      </Body>
    </Html>
  );
}
```

## Webhook Integration

### 1. Set Up Webhook Receiver

File: `src/app/api/email/webhook/resend/route.ts`

```typescript
import { verifySignatureFromContent } from 'resend';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('X-Resend-Signature') || '';
  
  try {
    const isValid = verifySignatureFromContent(
      body,
      signature,
      process.env.RESEND_WEBHOOK_SECRET!,
    );
    
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const event = JSON.parse(body);
    
    // Handle events
    switch (event.type) {
      case 'email.bounced':
        await handleBounce(event);
        break;
      case 'email.complained':
        await handleComplaint(event);
        break;
      case 'email.delivered':
        await logDelivery(event);
        break;
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[webhook]', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleBounce(event: any) {
  const { email } = event.data;
  // Disable future sends to this email
  await supabase
    .from('subscribers')
    .update({ status: 'bounced' })
    .eq('email', email);
}

async function handleComplaint(event: any) {
  const { email } = event.data;
  // Mark as unsubscribed
  await supabase
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email);
}
```

### 2. Configure Webhook in Resend

1. Go to Resend Dashboard → API Tokens
2. Create a new webhook endpoint
3. Point to: `https://yourdomain.com/api/email/webhook/resend`
4. Subscribe to events:
   - `email.bounced`
   - `email.complained`
   - `email.delivered`
   - `email.opened`
   - `email.clicked`

### 3. Add Webhook Secret to Environment

```env
RESEND_WEBHOOK_SECRET=whsec_xxxx
```

## Troubleshooting

### "Missing RESEND_API_KEY"

- Check `.env` or `.env.local` for the key
- Verify key format: `re_...`
- For dev, use a test key

### Emails not sending in development

- Check console for error messages
- Verify `RESEND_FROM_EMAIL` is set
- Ensure email recipient is correct (not yourself if using sandbox)
- Check Resend dashboard for failed sends

### Email template not rendering correctly

- Use React Email components, not plain HTML
- Inline all styles
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Use Resend's email preview feature

### Webhook not receiving events

- Verify endpoint is publicly accessible
- Check webhook secret matches Resend dashboard
- Look for signature verification errors
- Test with Resend CLI: `resend webhook test`

### Bounces and complaints

- Monitor Resend dashboard regularly
- Implement webhook handlers to update subscriber status
- Remove hard bounces from future sends
- Respect unsubscribe requests immediately

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Components](https://react.email/docs/components/intro)
- [Best Practices for Transactional Email](https://resend.com/docs/guides/best-practices)
- [Email Authentication (SPF/DKIM/DMARC)](https://resend.com/docs/features/authentication)

## Next Steps

1. ✅ Set up Resend account and API key
2. ✅ Verify production domain (if using custom sender)
3. ✅ Create email templates with React Email
4. ✅ Implement server actions for sending
5. ✅ Test locally with sandbox address
6. ✅ Set up webhook receivers for bounce handling
7. ✅ Deploy and monitor in production
