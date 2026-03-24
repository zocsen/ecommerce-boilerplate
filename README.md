# Agency E-Commerce Boilerplate

Production-ready, minimalist e-commerce boilerplate for Hungarian webshops. Built with Next.js 16, Supabase, and Barion payments.

## Overview

This boilerplate provides everything needed to launch a Hungarian e-commerce store: full storefront, multi-step checkout with Barion payment integration, admin dashboard with role-based access, email notifications, invoicing adapters, and a marketing module. All prices are in HUF (integer values). The config/feature-flag system allows client-specific customization without modifying core code.

## Tech Stack

| Technology                                     | Version | Purpose                                           |
| ---------------------------------------------- | ------- | ------------------------------------------------- |
| [Next.js](https://nextjs.org)                  | 16.1.x  | App Router, React Server Components               |
| [React](https://react.dev)                     | 19.2.x  | UI framework                                      |
| [TypeScript](https://typescriptlang.org)       | 5.x     | Strict typing                                     |
| [Tailwind CSS](https://tailwindcss.com)        | 4.x     | Utility-first CSS                                 |
| [shadcn/ui](https://ui.shadcn.com)             | 4.x     | UI component library (base-ui-react primitives)   |
| [Supabase](https://supabase.com)               | 2.99.x  | Postgres, Auth, Storage, Row-Level Security       |
| [Zustand](https://zustand.docs.pmnd.rs)        | 5.x     | Client-side cart state (localStorage persistence) |
| [Zod](https://zod.dev)                         | 4.x     | Schema validation (server + client)               |
| [React Hook Form](https://react-hook-form.com) | 7.x     | Form handling                                     |
| [Resend](https://resend.com)                   | 6.x     | Transactional + marketing email                   |
| [React Email](https://react.email)             | 1.x     | Email templates                                   |
| [Framer Motion](https://motion.dev)            | 12.x    | Subtle animations                                 |
| [Recharts](https://recharts.org)               | 2.x     | Admin dashboard charts                            |
| [Vitest](https://vitest.dev)                   | 4.x     | Unit testing                                      |
| [Playwright](https://playwright.dev)           | 1.58.x  | End-to-end testing                                |

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** (package manager)
- **Supabase project** — hosted at [supabase.com](https://supabase.com) or running locally via [Supabase CLI](https://supabase.com/docs/guides/cli)
- **Barion account** — test or production, from [barion.com](https://www.barion.com)
- **Resend account** — from [resend.com](https://resend.com) (for transactional email)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd ecommerce-boilerplate
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your credentials. See [Environment Variables](#environment-variables) below for details.

### 4. Apply the database migration

The migration file at `supabase/migrations/001_init.sql` creates all tables, enums, RLS policies, and helper functions.

**Option A — Supabase CLI** (recommended for local development):

```bash
# Link to your Supabase project (one-time)
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

**Option B — Supabase Dashboard SQL Editor**:

1. Open your project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/001_init.sql`
4. Paste into the editor and click **Run**

### 5. Run the development server

```bash
pnpm dev
```

### 6. Open the app

Visit [http://localhost:3000](http://localhost:3000) to see the storefront.

Visit [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard (requires an admin user — see [Creating an Admin User](#creating-an-admin-user)).

## Environment Variables

| Variable                        | Required | Default                 | Description                                                                      |
| ------------------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | —                       | Supabase project URL                                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | —                       | Supabase anonymous (public) key                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | —                       | Supabase service role key (server-only, never expose to client)                  |
| `BARION_POS_KEY`                | Yes      | —                       | Barion POS key from your Barion shop                                             |
| `BARION_ENVIRONMENT`            | No       | `test`                  | `test` or `prod` — controls Barion API endpoint                                  |
| `RESEND_API_KEY`                | Yes      | —                       | Resend API key for sending email                                                 |
| `RESEND_FROM_EMAIL`             | Yes      | —                       | Sender address for transactional emails (e.g. `orders@yourdomain.com`)           |
| `RESEND_MARKETING_FROM_EMAIL`   | No       | —                       | Sender address for newsletter/marketing emails (e.g. `marketing@yourdomain.com`) |
| `INVOICING_PROVIDER`            | No       | `none`                  | `billingo`, `szamlazz`, or `none`                                                |
| `BILLINGO_API_KEY`              | No       | —                       | Billingo API key (required if `INVOICING_PROVIDER=billingo`)                     |
| `SZAMLAZZ_AGENT_KEY`            | No       | —                       | Számlázz.hu agent key (required if `INVOICING_PROVIDER=szamlazz`)                |
| `NEXT_PUBLIC_SITE_URL`          | No       | `http://localhost:3000` | Public URL of the site (used for Barion redirects, emails, SEO)                  |
| `CRON_SECRET`                   | No       | —                       | Secret token for cron job endpoints (abandoned cart, etc.)                       |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security. Keep it server-side only and never expose it in client code or `NEXT_PUBLIC_` variables.

## Project Structure

```
ecommerce-boilerplate/
├── src/
│   ├── app/
│   │   ├── (shop)/               # Storefront route group
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── products/         # Product catalog + detail pages
│   │   │   ├── cart/             # Shopping cart
│   │   │   ├── checkout/         # Multi-step checkout + success/cancel
│   │   │   ├── account/          # User account + order history
│   │   │   ├── terms/            # Terms & conditions
│   │   │   ├── privacy/          # Privacy policy
│   │   │   └── shipping-and-returns/
│   │   ├── (auth)/               # Login, register, reset password
│   │   ├── (admin)/admin/        # Admin dashboard
│   │   │   ├── orders/           # Order management
│   │   │   ├── products/         # Product CRUD
│   │   │   ├── categories/       # Category management
│   │   │   ├── coupons/          # Coupon management
│   │   │   ├── shipping/         # Shipping configuration
│   │   │   ├── marketing/        # Subscribers + campaigns
│   │   │   ├── settings/         # Integration status
│   │   │   └── audit/            # Audit logs
│   │   ├── api/                  # Route handlers (Barion callback, etc.)
│   │   ├── sitemap.ts            # Dynamic sitemap generation
│   │   └── robots.ts             # robots.txt generation
│   ├── components/
│   │   ├── ui/                   # shadcn/ui base components
│   │   ├── shared/               # Header, footer, breadcrumbs, toasts
│   │   ├── cart/                 # Cart drawer, line items, coupon input
│   │   └── product/              # ProductCard, gallery, variant selector
│   ├── lib/
│   │   ├── actions/              # Server Actions (products, orders, cart, etc.)
│   │   ├── config/               # site.config.ts + client override hooks
│   │   ├── integrations/         # Barion, email (Resend), invoicing adapters
│   │   ├── security/             # Role checks, rate limiting, audit helpers
│   │   ├── store/                # Zustand cart store
│   │   ├── supabase/             # Supabase client factories (client, server, admin)
│   │   ├── types/                # TypeScript types + database types
│   │   ├── utils/                # Formatting, shipping calculations
│   │   └── validators/           # Zod schemas
│   └── middleware.ts             # Supabase auth session refresh
├── supabase/
│   └── migrations/
│       └── 001_init.sql          # Full database schema migration
├── tests/
│   ├── unit/                     # Vitest unit tests
│   ├── e2e/                      # Playwright end-to-end tests
│   └── setup.ts                  # Test setup / global config
├── public/                       # Static assets
├── .env.example                  # Environment variable template
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Configuration

All store-level configuration lives in `src/lib/config/site.config.ts`. This file exports a single typed `siteConfig` object.

### Sections

| Section     | What it controls                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `store`     | Store name, legal name, email, phone, address, currency (always HUF)                                                  |
| `urls`      | Public site URL, support email                                                                                        |
| `features`  | Feature flags — toggle accounts, guest checkout, coupons, reviews, marketing, abandoned cart, B2B wholesale           |
| `payments`  | Barion configuration — environment, POS key, payee email, redirect URLs                                               |
| `shipping`  | Enabled methods (home delivery, pickup point), carrier lists, fee rules (base fee, free-over threshold, weight tiers) |
| `invoicing` | Provider (`billingo`, `szamlazz`, `none`) and mode (`auto_on_paid`, `manual`)                                         |
| `admin`     | Agency viewer toggle, read-only-by-default for agency role                                                            |
| `branding`  | Logo text/URL, neutral theme color tokens                                                                             |

### Feature Flags

```ts
features: {
  enableAccounts: true,        // User registration and login
  enableGuestCheckout: true,   // Allow checkout without an account
  enableCoupons: true,         // Coupon/discount code system
  enableReviews: false,        // Product reviews (scaffold only)
  enableMarketingModule: true, // Newsletter subscribers + campaigns
  enableAbandonedCart: true,   // Abandoned cart email recovery
  enableB2BWholesaleMode: false, // Wholesale pricing via hooks
}
```

### Client Override Hooks

For per-project customization without modifying core code, use `src/lib/config/hooks.ts`:

- **`preCheckoutHook(orderDraft)`** — Modify the order draft before it is saved (e.g. add custom fields, enforce business rules)
- **`postPaidHook(order)`** — Run side-effects after payment (e.g. analytics, webhook calls, loyalty points)
- **`pricingHook(product, variant, user)`** — Override pricing per product/variant/user (e.g. wholesale discounts)

See `hooks.ts` for usage examples with `overrideHooks()`.

## Key Features

- **Product catalog with variants** — Products with multiple option combinations (size, color), per-variant SKU, stock, and price override
- **Cart with localStorage persistence** — Zustand store persisted to localStorage; survives page refreshes and browser restarts
- **Multi-step checkout** — Contact info, shipping method selection, order review, and payment
  - **Home delivery** (Házhozszállítás): GLS, MPL, Express One with full address + phone validation
  - **Pickup point** (Csomagautomata): Foxpost, GLS Automata, Packeta, MPL Automata, Easybox with map/selector integration hooks
- **Barion payment integration** — Test and production modes, idempotent callback handling, stock decrement guards
- **Guest checkout** — Configurable via feature flag; no account required
- **Coupon system** — Percentage and fixed-amount discounts with min order, max uses, and date validity
- **Admin dashboard** — KPI overview, order management with status timeline, product CRUD with variant builder, category management, coupon management, shipping config
- **Role-based access** — `admin` (full CRUD), `agency_viewer` (read-only dashboards), `customer` (storefront + own orders). Enforced via Supabase RLS and server-side checks
- **Email notifications** — Order receipt, shipping update, abandoned cart recovery, newsletter campaigns (via Resend + React Email templates)
- **Invoicing adapters** — Billingo and Szamlazz.hu integrations with adapter pattern; trigger from admin or auto-on-paid
- **Marketing module** — Subscriber management, tag-based segmentation, campaign builder with template selection
- **Hungarian locale** — HUF currency (integer), Hungarian date format, `+36` phone validation
- **SEO** — Per-route metadata, dynamic `sitemap.xml`, `robots.txt`, JSON-LD product schema, OpenGraph tags
- **Audit logging** — All admin actions logged with actor, role, action type, and metadata

## Scripts

| Command            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Start the development server (Next.js with hot reload) |
| `pnpm build`       | Create a production build                              |
| `pnpm start`       | Start the production server                            |
| `pnpm lint`        | Run ESLint                                             |
| `pnpm test`        | Run unit tests with Vitest                             |
| `pnpm test:watch`  | Run Vitest in watch mode                               |
| `pnpm test:e2e`    | Run Playwright end-to-end tests                        |
| `pnpm test:e2e:ui` | Run Playwright tests with interactive UI               |

## Testing

### Unit Tests (Vitest)

Unit tests cover cart math, coupon validation, order total calculations, and utility functions.

```bash
# Run all unit tests
pnpm test

# Run in watch mode during development
pnpm test:watch
```

### End-to-End Tests (Playwright)

Smoke tests cover browsing products, adding to cart, and reaching the checkout page.

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all e2e tests
pnpm test:e2e

# Run with interactive UI for debugging
pnpm test:e2e:ui
```

Playwright configuration is in `playwright.config.ts`.

## Creating an Admin User

1. Create a user via Supabase Auth (Dashboard > Authentication > Users > Add User, or via the sign-up flow in the app)
2. Find the user's `id` in the Supabase Auth dashboard
3. Update their profile role in the SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<user-uuid>';
```

The `profiles` row is created automatically on user signup via the database trigger in the migration.

## Deployment

### Vercel (recommended)

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain
5. Set `BARION_ENVIRONMENT` to `prod` when going live
6. Deploy

Vercel automatically detects Next.js and configures the build. The `pnpm build` command runs during deployment.

### Other Platforms

This is a standard Next.js application. It can be deployed to any platform that supports Node.js:

- Build: `pnpm build`
- Start: `pnpm start`
- Required: Node.js 20+, all environment variables set

## License

MIT
