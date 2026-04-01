# New Client Setup Guide

How to create a new e-commerce store from this boilerplate.

## Step 1: Fork or Clone the Boilerplate

**Option A — Fork** (recommended if you want to pull upstream updates later):

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-org>/<your-fork>.git
cd <your-fork>
```

**Option B — Clean clone** (if you want an independent copy):

```bash
git clone <boilerplate-repo-url> my-store
cd my-store
rm -rf .git
git init
git add .
git commit -m "Initial commit from boilerplate"
```

Install dependencies:

```bash
pnpm install
```

## Step 2: Create a New Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. Choose a region close to your customers (for Hungary: **EU Central** / Frankfurt is a good choice)
3. Set a strong database password and save it securely
4. Wait for the project to finish provisioning

Once ready, note the following from **Project Settings > API**:

- **Project URL** — e.g. `https://abcdefghij.supabase.co`
- **anon/public key** — starts with `eyJ...`
- **service_role key** — starts with `eyJ...` (keep this secret)

## Step 3: Apply the Database Migration

The migration file `supabase/migrations/001_init.sql` creates all tables, enums, RLS policies, indexes, and helper functions.

**Option A — Supabase CLI**:

```bash
# Install Supabase CLI if you haven't
pnpm add -g supabase

# Link to your new project
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

**Option B — SQL Editor**:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/001_init.sql`
4. Paste and click **Run**
5. Verify: go to **Table Editor** and confirm tables like `products`, `orders`, `profiles` exist

## Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your new project's credentials:

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Barion (from Step 6)
BARION_POS_KEY=your-barion-pos-key
BARION_ENVIRONMENT=test

# Resend (from Step 7)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=orders@yourclient.hu
RESEND_MARKETING_FROM_EMAIL=marketing@yourclient.hu

# Invoicing (from Step 8, or leave as "none")
INVOICING_PROVIDER=none

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=generate-a-random-string
```

## Step 5: Customize `site.config.ts`

Open `src/lib/config/site.config.ts` and update:

### Store Info

```ts
store: {
  name: "Client Store Name",
  legalName: "Client Kft.",
  email: "info@clientstore.hu",
  phone: "+36 30 123 4567",
  address: "1011 Budapest, Fő utca 1.",
  currency: "HUF",
},
```

### URLs

```ts
urls: {
  siteUrl,  // reads from NEXT_PUBLIC_SITE_URL env var
  supportEmail: "support@clientstore.hu",
},
```

### Feature Flags

Toggle features based on the client's needs:

```ts
features: {
  enableAccounts: true,           // User registration
  enableGuestCheckout: true,      // Allow guest checkout
  enableCoupons: true,            // Coupon system
  enableReviews: false,           // Product reviews (scaffold only)
  enableMarketingModule: false,   // Newsletter + campaigns
  enableAbandonedCart: false,     // Abandoned cart emails
  enableB2BWholesaleMode: false,  // Wholesale pricing
},
```

### Shipping

Configure which carriers and methods are available:

```ts
shipping: {
  methods: {
    homeDelivery: true,
    pickupPoint: true,
  },
  homeDeliveryCarriers: ["gls", "mpl"],  // remove carriers not needed
  pickupPointCarriers: ["foxpost", "packeta"],  // keep only what's relevant
  rules: {
    baseFee: 1490,       // base shipping fee in HUF
    freeOver: 15000,     // free shipping above this order total
    weightTiers: [],     // optional weight-based tiers
  },
  pickupPointProviders: {
    foxpost: true,
    gls_automata: false,
    packeta: true,
    mpl_automata: false,
    easybox: false,
  },
},
```

### Branding

```ts
branding: {
  logoText: "CLIENT",
  logoUrl: null,  // or "/logo.svg" if placing a file in public/
  theme: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    accent: "#0a0a0a",
    accentForeground: "#ffffff",
    border: "#e5e5e5",
  },
},
```

For deeper theme customization, edit the CSS variables in `src/app/globals.css`.

## Step 6: Set Up Barion

1. Create a Barion account at [barion.com](https://www.barion.com) (or use existing)
2. Go to your Barion shop settings and find your **POS key**
3. For development, use Barion's **test environment**: set `BARION_ENVIRONMENT=test` in `.env.local`
4. Set `BARION_POS_KEY` in `.env.local`
5. Make sure your Barion shop's callback URL matches: `<your-site-url>/api/payments/barion/callback`

The boilerplate handles redirect URLs automatically via `site.config.ts`.

## Step 7: Set Up Resend

1. Create a Resend account at [resend.com](https://resend.com)
2. Add and verify your sending domain (e.g. `yourclient.hu`)
3. Create an API key and add it as `RESEND_API_KEY` in `.env.local`
4. Set `RESEND_FROM_EMAIL` to a verified sender (e.g. `orders@yourclient.hu`)
5. If using the marketing module, set `RESEND_MARKETING_FROM_EMAIL` (e.g. `marketing@yourclient.hu`)

**Recommended:** Use separate subdomains for transactional and marketing email to protect deliverability:

- `orders@mail.yourclient.hu` for receipts and shipping updates
- `marketing@promo.yourclient.hu` for newsletters

## Step 8: Set Up Invoicing (Optional)

If the client needs automatic invoice generation, choose a provider:

### Billingo

1. Get a Billingo API key from [billingo.hu](https://www.billingo.hu)
2. Set in `.env.local`:
   ```env
   INVOICING_PROVIDER=billingo
   BILLINGO_API_KEY=your-billingo-api-key
   ```

### Szamlazz.hu

1. Get an agent key from [szamlazz.hu](https://www.szamlazz.hu)
2. Set in `.env.local`:
   ```env
   INVOICING_PROVIDER=szamlazz
   SZAMLAZZ_AGENT_KEY=your-agent-key
   ```

### None

Leave `INVOICING_PROVIDER=none` (the default). Invoicing buttons in the admin will be disabled.

Set the invoicing mode in `site.config.ts`:

- `"auto_on_paid"` — automatically generate an invoice when payment is confirmed
- `"manual"` — admin clicks a button to generate invoices per order

## Step 9: Create the First Admin User

1. Start the dev server: `pnpm dev`
2. Register a user through the app at `/register`, or create one in the Supabase Auth dashboard
3. Open the Supabase SQL Editor and run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<user-uuid>';
```

Find the user's UUID in **Authentication > Users** in the Supabase dashboard.

4. Log out and log back in — the user now has admin access at `/admin`

To create an `agency_viewer` (read-only admin), use `'agency_viewer'` instead of `'admin'`.

## Step 10: Add Products via Admin Dashboard

1. Log in as the admin user
2. Go to `/admin/products/new`
3. Fill in product details:
   - Title, slug (auto-generated from title, editable), description
   - Base price in HUF
   - Compare-at price (optional, for showing discounts)
   - Upload images (stored in Supabase Storage)
   - Assign categories
   - Add variants (size, color, etc.) with SKU, stock, and optional price override
4. Create categories at `/admin/categories` for organizing products
5. Set up coupons at `/admin/coupons` if the coupon feature is enabled

## Step 11: Test the Checkout Flow

1. Browse the storefront and add products to cart
2. Go to `/cart` and proceed to checkout
3. Fill in contact info, select a shipping method, review the order
4. Submit — the order is created and you are redirected to Barion's test payment page
5. Complete the test payment with Barion's test card details
6. Verify the callback: check that the order status updates to `paid` in `/admin/orders`
7. Check that a receipt email is sent (check Resend dashboard for delivery status)

**Barion test card details** are available in the [Barion developer documentation](https://docs.barion.com/Testing).

## Step 12: Deploy

### Vercel (recommended)

1. Push your repository to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` to the Vercel project settings
4. Update the following for production:
   - `NEXT_PUBLIC_SITE_URL` → your production domain (e.g. `https://clientstore.hu`)
   - `BARION_ENVIRONMENT` → `prod` (when ready for live payments)
5. Deploy

### Post-deployment Checklist

- [ ] Verify Supabase project URL and keys are correct for production
- [ ] Set Barion callback URL to production domain in Barion shop settings
- [ ] Verify Resend domain is properly configured (SPF, DKIM, DMARC)
- [ ] Update legal pages (`/terms`, `/privacy`, `/shipping-and-returns`) with the client's legal text
- [ ] Test a real (small amount) payment in Barion production mode
- [ ] Set up a `CRON_SECRET` and configure cron jobs if using abandoned cart recovery
- [ ] Monitor Supabase dashboard for RLS policy violations and database performance
