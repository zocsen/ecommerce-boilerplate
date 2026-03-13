# Resend Integration — Documentation Index

## 📖 Start Here

**New to Resend?** Start with these in order:

1. **[RESEND_REFERENCE.md](./RESEND_REFERENCE.md)** (5 min read)
   - Quick reference guide
   - Feature overview
   - Code examples
   - Common tasks

2. **[RESEND_SETUP_CHECKLIST.md](./RESEND_SETUP_CHECKLIST.md)** (10 min setup)
   - Local development setup (5 min)
   - Production deployment steps
   - Testing checklist
   - Troubleshooting

3. **[RESEND_OVERVIEW.md](./RESEND_OVERVIEW.md)** (20 min read)
   - Complete architecture
   - How everything works together
   - File descriptions
   - Next steps

4. **[RESEND_INTEGRATION.md](./RESEND_INTEGRATION.md)** (Deep dive)
   - Comprehensive technical guide
   - All features explained
   - Best practices
   - Email rendering
   - Webhook integration
   - Production deployment

---

## 🎯 Find What You Need

### Getting Started
- Local development: See **RESEND_SETUP_CHECKLIST.md** → "Quick Start"
- Production setup: See **RESEND_SETUP_CHECKLIST.md** → "Production Setup"
- API key: See **RESEND_INTEGRATION.md** → "Setup & Configuration"

### Usage Examples
- Send order receipt: See **RESEND_REFERENCE.md** → "Usage Examples"
- Send newsletter: See **RESEND_REFERENCE.md** → "Usage Examples"
- Process webhook: See **RESEND_REFERENCE.md** → "Usage Examples"

### Architecture & Design
- Overview: See **RESEND_OVERVIEW.md** → "Architecture"
- Email flow: See **RESEND_REFERENCE.md** → "Email Flow"
- Modules: See **RESEND_OVERVIEW.md** → "Backend Modules"
- File structure: See **RESEND_REFERENCE.md** → "File Manifest"

### Email Types
- Transactional: See **RESEND_INTEGRATION.md** → "Transactional Emails"
- Marketing: See **RESEND_INTEGRATION.md** → "Marketing Emails"
- Templates: See **RESEND_REFERENCE.md** → "Email Templates"

### Troubleshooting
- Quick fixes: See **RESEND_SETUP_CHECKLIST.md** → "Troubleshooting"
- Detailed guide: See **RESEND_INTEGRATION.md** → "Troubleshooting"
- Reference table: See **RESEND_REFERENCE.md** → "Troubleshooting"

### Webhooks
- Setup: See **RESEND_INTEGRATION.md** → "Webhook Integration"
- Handling: See **RESEND_INTEGRATION.md** → "Webhook Integration"
- Code example: See **RESEND_REFERENCE.md** → "Event Handling"

### Email Rendering
- Best practices: See **RESEND_INTEGRATION.md** → "Email Rendering Best Practices"
- React Email: See **RESEND_INTEGRATION.md** → "Email Rendering Best Practices"
- Styling: See **RESEND_INTEGRATION.md** → "Email Rendering Best Practices"

---

## 🏗️ Code Reference

**Core Modules:**
```
src/lib/integrations/email/
├── sender.ts       - Sender configuration (getSenderEmail, getRecipient)
├── webhook.ts      - Webhook handlers (handleBounce, handleComplaint)
├── provider.ts     - Resend API (sendEmail, sendBatchEmail)
├── actions.ts      - Server actions (sendReceipt, sendNewsletterCampaign)
└── templates.tsx   - Rendering (renderOrderReceiptEmail, etc.)
```

**Email Templates:**
```
src/emails/
├── order-receipt.tsx      - Order confirmation
├── shipping-update.tsx    - Shipping notification
├── abandoned-cart.tsx     - Cart recovery
└── newsletter.tsx         - Marketing emails
```

**API Routes:**
```
src/app/api/email/webhook/resend/route.ts  - Webhook receiver
```

**Configuration:**
```
.env.example  - Environment variables
```

---

## 📋 Quick Checklist

### Local Development
- [ ] Create Resend account
- [ ] Get API key
- [ ] Update `.env.local`
- [ ] Send test email
- [ ] Check Resend dashboard

### Production
- [ ] Verify domain in Resend
- [ ] Add DNS records (CNAME, SPF, DKIM)
- [ ] Update `.env` with API key
- [ ] Configure webhook endpoint
- [ ] Test all email flows
- [ ] Monitor bounce rates

---

## 🔧 Environment Variables

**Required:**
```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=orders@yourdomain.com
RESEND_MARKETING_FROM_EMAIL=marketing@yourdomain.com
```

**Optional (Dev):**
```env
RESEND_TEST_RECIPIENT=your-email@example.com
```

**Optional (Prod):**
```env
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
```

See **RESEND_SETUP_CHECKLIST.md** for details.

---

## 📚 Documentation Structure

```
docs/
├── README.md                    (this file)
├── RESEND_REFERENCE.md         (quick reference)
├── RESEND_SETUP_CHECKLIST.md   (setup guide)
├── RESEND_OVERVIEW.md          (architecture)
└── RESEND_INTEGRATION.md       (detailed guide)
```

---

## 🎓 Learning Path

### Path 1: Just Want to Send Emails (30 min)
1. Read: **RESEND_REFERENCE.md** (5 min)
2. Read: **RESEND_SETUP_CHECKLIST.md** → Quick Start (10 min)
3. Implement: Send your first email (15 min)

### Path 2: Understanding the System (1 hour)
1. Read: **RESEND_REFERENCE.md** (5 min)
2. Read: **RESEND_OVERVIEW.md** (20 min)
3. Read: **RESEND_SETUP_CHECKLIST.md** (20 min)
4. Review: Code in `src/lib/integrations/email/` (15 min)

### Path 3: Full Deep Dive (2-3 hours)
1. Read: All documentation in order
2. Review: All code files
3. Test: Send emails through all flows
4. Implement: Webhook handling in production

---

## ✨ Key Features

| Feature | Local Dev | Production |
|---------|-----------|-----------|
| Send order receipts | ✅ | ✅ |
| Send newsletters | ✅ | ✅ |
| Test recipients | ✅ | ❌ |
| Custom domain | ❌ | ✅ |
| Webhook handling | ❌ | ✅ |
| Analytics | ✅ | ✅ |
| Bounce handling | ✅ | ✅ |

---

## 🚀 Quick Commands

```bash
# Create Resend account
open https://resend.com

# Update environment
cp .env.example .env.local
# ... edit .env.local

# Send test email (in your code)
import { sendReceipt } from '@/lib/integrations/email/actions';
await sendReceipt(orderId);

# Check Resend dashboard
open https://resend.com/emails
```

---

## 🆘 Need Help?

1. **Local setup?** → See **RESEND_SETUP_CHECKLIST.md**
2. **How to use?** → See **RESEND_REFERENCE.md** → "Usage Examples"
3. **Something broken?** → See **RESEND_REFERENCE.md** → "Troubleshooting"
4. **Deep question?** → See **RESEND_INTEGRATION.md**
5. **Still stuck?** → Check **RESEND_INTEGRATION.md** → "Troubleshooting"

---

## 📞 Resources

- **Resend Docs:** https://resend.com/docs
- **React Email:** https://react.email
- **Email Standards:** https://www.w3.org/Mail/
- **Email Best Practices:** https://resend.com/docs/guides/best-practices

---

## 📝 Notes

- All guides use Hungarian examples (HU)
- Emails are fully localized to Hungarian
- Production uses separate transactional & marketing senders
- Webhook is optional but recommended for production
- Test recipient redirect is optional in development

---

**Last Updated:** March 2026  
**Status:** ✅ Production Ready
