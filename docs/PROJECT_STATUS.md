# Agency E-Commerce Boilerplate — Project Status & Roadmap

> **Last updated:** 2026-03-24
> **Codebase:** 11 commits, ~187 files, ~42,000 lines of code
> **Status:** Core boilerplate ~95% complete against original spec. All major flows functional end-to-end. **45 features** planned across 4 priority tiers (P0-P3) — see Feature Roadmap.

---

## Table of Contents

0. [Maintenance Guidelines](#maintenance-guidelines)
1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema (Complete)](#database-schema)
4. [Authentication & Security (Complete)](#authentication--security)
5. [Storefront Pages (Complete)](#storefront-pages)
6. [Customer Profile Section (Complete)](#customer-profile-section)
7. [Admin Panel (Complete)](#admin-panel)
8. [Server Actions (Complete)](#server-actions)
9. [Integrations (Complete)](#integrations)
10. [API Route Handlers (Complete)](#api-route-handlers)
11. [Components Inventory (Complete)](#components-inventory)
12. [Email Templates (Complete)](#email-templates)
13. [Configuration System (Complete)](#configuration-system)
14. [SEO & Performance (Complete)](#seo--performance)
15. [Testing (Complete)](#testing)
16. [Documentation (Complete)](#documentation)
17. [Seed Data (Complete)](#seed-data)
18. [Known Issues & Minor Gaps](#known-issues--minor-gaps)
19. [Plan Tiers & Pricing](#plan-tiers--pricing)

---

## Maintenance Guidelines

> **This document is the single source of truth for the entire project.** It supersedes all previous spec files (including the now-removed `00_OPENCODE_SPEC.md`). If there is a conflict between the codebase and this document, investigate and reconcile both sides — do not silently update only one.

### When to Update

Update this document **immediately** after any of the following:

- A new feature is built or an existing feature is significantly changed
- Database schema changes (new tables, columns, indexes, RLS policies)
- New pages or routes are added or removed
- New server actions or API route handlers are created
- New components are added to the inventory
- New integrations or third-party services are connected
- Roadmap items are completed, reprioritized, or cancelled
- Plan tiers, pricing, or feature limits change
- Configuration or environment variables change
- Known issues are discovered or resolved

### What to Update

A single change often affects **multiple sections**. Always update all relevant sections, not just one. For example:

| Change Type        | Sections to Update                                                                 |
| ------------------ | ---------------------------------------------------------------------------------- |
| New database table | Database Schema, Server Actions, Components Inventory, Feature Roadmap             |
| New page/route     | Storefront Pages or Admin Panel, Components Inventory, Server Actions (if new)     |
| New integration    | Integrations, API Route Handlers, Configuration System, Documentation              |
| Bug fix            | Known Issues & Minor Gaps (remove or update the entry)                             |
| Roadmap completion | Feature Roadmap (move from planned to done), plus all sections the feature touches |
| Plan tier change   | Plan Tiers & Pricing, Feature Roadmap (if limits changed)                          |

### How to Mark Status

- **Section headers**: Use `(Complete)`, `(Partial)`, or `(Planned)` in section titles — e.g., `## Database Schema (Complete)`
- **Individual items**: Use `**(PLANNED)**` inline for future work within otherwise-complete sections
- **Status lines**: Each major section has a `**Status:**` line — keep it accurate (e.g., `**Status: COMPLETE** — 10 tables.`)
- **Roadmap items**: Move from the planned features list to a "Done" note or integrate into the relevant section when implemented
- **Last updated date**: Always update the `> **Last updated:**` line at the top of this document

### General Rules

1. **Be specific.** Include file paths, line counts, function names, and column types — not vague summaries.
2. **Keep counts accurate.** If a section says "47 server actions" and you add one, update it to "48 server actions."
3. **No stale entries.** If something is removed from the codebase, remove it from this document too.
4. **Planned features go in Feature Roadmap first**, then get distributed across sections with `(PLANNED)` tags when the design is concrete enough.

---

## Tech Stack

| Layer             | Technology                            | Version               |
| ----------------- | ------------------------------------- | --------------------- |
| Framework         | Next.js (App Router)                  | 16.1.6                |
| Language          | TypeScript (strict mode)              | 5.x                   |
| UI                | React                                 | 19.2                  |
| Styling           | Tailwind CSS                          | v4                    |
| Component Library | shadcn/ui (base-ui/react)             | 4.0.2                 |
| Database          | Supabase (Postgres 17)                | Latest                |
| Auth              | Supabase Auth                         | via @supabase/ssr     |
| Storage           | Supabase Storage                      | Product images bucket |
| State Management  | Zustand + persist                     | Latest                |
| Forms             | react-hook-form + @hookform/resolvers | Latest                |
| Validation        | Zod                                   | v4                    |
| Payments          | Barion Smart Gateway v2               | Custom client         |
| Email             | Resend + React Email                  | Latest                |
| Invoicing         | Billingo / Szamlazz.hu adapters       | Custom                |
| Charts            | Recharts                              | Latest                |
| Testing           | Vitest + Playwright                   | Latest                |
| Linting           | ESLint (next/core-web-vitals)         | Latest                |
| Package Manager   | pnpm                                  | Latest                |

**React Compiler:** Enabled in `next.config.ts`.

---

## Architecture Overview

```
src/
  app/
    (shop)/          # Storefront route group (public + customer)
    (auth)/          # Login, register, reset-password
    (admin)/admin/   # Admin panel (role-protected)
    api/             # Route handlers (Barion callback, email webhooks, etc.)
  components/
    shared/          # Header, Footer, AdminSidebar, Breadcrumbs, etc.
    product/         # ProductCard, ProductGrid, Gallery, VariantSelector, etc.
    cart/            # CartLineItem, CouponInput, OrderSummary, etc.
    admin/           # DashboardCharts
    auth/            # DevProfileSelector
    ui/              # 23 shadcn/ui primitives
  lib/
    actions/         # 10 server action files (47 exported functions)
    config/          # site.config.ts, hooks.ts
    integrations/    # barion/, email/, invoicing/
    security/        # roles.ts, rate-limit.ts, logger.ts, unsubscribe-token.ts
    supabase/        # server.ts, client.ts, admin.ts, middleware.ts
    store/           # Zustand cart store
    types/           # database.ts (642 lines), index.ts
    utils/           # format.ts, shipping.ts
    validators/      # checkout.ts, coupon.ts, product.ts, subscriber.ts, uuid.ts
  proxy.ts           # Middleware (role-based route protection)
supabase/
  migrations/        # 4 SQL migration files
  functions/         # Edge function (abandoned-cart)
  seed.sql           # 895 lines of test data
  config.toml        # Local dev configuration
```

**Key architectural principles enforced:**

- Server Components by default; `"use client"` only for interactivity (forms, Zustand, motion)
- All DB mutations via Server Actions in `/lib/actions/`
- Zod validation on every Server Action and Route Handler
- RLS as primary authorization; app-level role checks as defense-in-depth
- Admin client (service-role) only for admin actions; user-scoped client for everything else

---

## Database Schema

**Status: COMPLETE** — 4 migrations applied, 10 tables, 3 enums, 20 indexes, 34 RLS policies, 4 storage policies. **3 additional tables planned** (shop_plans, shop_subscriptions, subscription_invoices) + 1 new enum (subscription_status) + cost_price columns on products/variants.

### Enums

| Enum                  | Values                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| `app_role`            | `customer`, `admin`, `agency_viewer`                                                  |
| `order_status`        | `draft`, `awaiting_payment`, `paid`, `processing`, `shipped`, `cancelled`, `refunded` |
| `subscriber_status`   | `subscribed`, `unsubscribed`, `bounced`, `complained`                                 |
| `subscription_status` | `active`, `past_due`, `cancelled`, `trialing` **(PLANNED)**                           |

### Tables

#### 1. `profiles`

| Column                     | Type        | Constraints                                                      |
| -------------------------- | ----------- | ---------------------------------------------------------------- |
| `id`                       | uuid PK     | References `auth.users(id) ON DELETE CASCADE`                    |
| `role`                     | app_role    | NOT NULL, DEFAULT `'customer'`                                   |
| `full_name`                | text        | Nullable                                                         |
| `phone`                    | text        | Nullable                                                         |
| `default_shipping_address` | jsonb       | `{name, street, city, zip, country}`                             |
| `default_billing_address`  | jsonb       | `{name, street, city, zip, country, company_name?, tax_number?}` |
| `default_pickup_point`     | jsonb       | `{provider, point_id, point_label}`                              |
| `created_at`               | timestamptz | DEFAULT now()                                                    |

RLS: Users read/update own. Admin full CRUD. Agency viewer read-only.

#### 2. `categories`

| Column       | Type    | Constraints                             |
| ------------ | ------- | --------------------------------------- |
| `id`         | uuid PK | DEFAULT gen_random_uuid()               |
| `slug`       | text    | UNIQUE, NOT NULL                        |
| `name`       | text    | NOT NULL                                |
| `parent_id`  | uuid    | FK to categories(id) ON DELETE SET NULL |
| `sort_order` | int     | DEFAULT 0                               |
| `is_active`  | boolean | DEFAULT true                            |

Indexes: `idx_categories_parent`, `idx_categories_slug`
RLS: Public read (active only). Admin full. Agency viewer read.

#### 3. `products`

| Column             | Type        | Constraints                                                                                                                                  |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | uuid PK     | DEFAULT gen_random_uuid()                                                                                                                    |
| `slug`             | text        | UNIQUE, NOT NULL                                                                                                                             |
| `title`            | text        | NOT NULL                                                                                                                                     |
| `description`      | text        | Nullable                                                                                                                                     |
| `base_price`       | int         | NOT NULL (HUF, no decimals)                                                                                                                  |
| `cost_price`       | int         | Nullable **(PLANNED)** — Purchasing/material cost per unit. Admin-only, never shown to customers. Used for profit calculations on dashboard. |
| `compare_at_price` | int         | Nullable (strikethrough price)                                                                                                               |
| `main_image_url`   | text        | Nullable                                                                                                                                     |
| `image_urls`       | text[]      | DEFAULT '{}'                                                                                                                                 |
| `is_active`        | boolean     | DEFAULT true                                                                                                                                 |
| `created_at`       | timestamptz | DEFAULT now()                                                                                                                                |
| `updated_at`       | timestamptz | DEFAULT now() (auto-trigger)                                                                                                                 |

Indexes: `idx_products_slug`, `idx_products_active` (partial WHERE true), `idx_products_price`
RLS: Public read (active only). Admin full. Agency viewer read.

#### 4. `product_variants`

| Column           | Type        | Constraints                                                                                                                           |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | uuid PK     | DEFAULT gen_random_uuid()                                                                                                             |
| `product_id`     | uuid        | FK to products(id) ON DELETE CASCADE                                                                                                  |
| `sku`            | text        | UNIQUE (nullable)                                                                                                                     |
| `option1_name`   | text        | DEFAULT 'Meret'                                                                                                                       |
| `option1_value`  | text        | Nullable                                                                                                                              |
| `option2_name`   | text        | Nullable                                                                                                                              |
| `option2_value`  | text        | Nullable                                                                                                                              |
| `price_override` | int         | Nullable (replaces base_price)                                                                                                        |
| `cost_price`     | int         | Nullable **(PLANNED)** — Variant-level cost override. If set, takes precedence over product-level cost_price for profit calculations. |
| `stock_quantity` | int         | DEFAULT 0                                                                                                                             |
| `is_active`      | boolean     | DEFAULT true                                                                                                                          |
| `created_at`     | timestamptz | DEFAULT now()                                                                                                                         |
| `updated_at`     | timestamptz | DEFAULT now() (auto-trigger)                                                                                                          |

Indexes: `idx_variants_product`, `idx_variants_unique_options` (unique partial per product for option combos)
RLS: Public read (active only). Admin full. Agency viewer read.

#### 5. `product_categories` (join table)

| Column                          | Type | Constraints                            |
| ------------------------------- | ---- | -------------------------------------- |
| `product_id`                    | uuid | FK to products(id) ON DELETE CASCADE   |
| `category_id`                   | uuid | FK to categories(id) ON DELETE CASCADE |
| PK: `(product_id, category_id)` |      |                                        |

RLS: Public read (unconditional). Admin full. Agency viewer read.

#### 6. `coupons`

| Column             | Type        | Constraints                      |
| ------------------ | ----------- | -------------------------------- |
| `id`               | uuid PK     | DEFAULT gen_random_uuid()        |
| `code`             | text        | UNIQUE, NOT NULL                 |
| `discount_type`    | text        | CHECK IN ('percentage', 'fixed') |
| `value`            | int         | NOT NULL                         |
| `min_order_amount` | int         | Nullable                         |
| `max_uses`         | int         | Nullable                         |
| `used_count`       | int         | DEFAULT 0                        |
| `valid_from`       | timestamptz | Nullable                         |
| `valid_until`      | timestamptz | Nullable                         |
| `is_active`        | boolean     | DEFAULT true                     |

Indexes: `idx_coupons_code`
RLS: NOT publicly readable (validated server-side only). Admin full. Agency viewer read.

#### 7. `orders`

| Column                      | Type         | Constraints                                     |
| --------------------------- | ------------ | ----------------------------------------------- |
| `id`                        | uuid PK      | DEFAULT gen_random_uuid()                       |
| `user_id`                   | uuid         | FK to auth.users(id), nullable (guest checkout) |
| `email`                     | text         | NOT NULL                                        |
| `status`                    | order_status | DEFAULT 'draft'                                 |
| `currency`                  | text         | DEFAULT 'HUF'                                   |
| `subtotal_amount`           | int          | DEFAULT 0                                       |
| `shipping_fee`              | int          | DEFAULT 0                                       |
| `discount_total`            | int          | DEFAULT 0                                       |
| `total_amount`              | int          | DEFAULT 0                                       |
| `coupon_code`               | text         | Nullable                                        |
| `shipping_method`           | text         | DEFAULT 'home'                                  |
| `shipping_address`          | jsonb        | DEFAULT '{}'                                    |
| `shipping_phone`            | text         | Nullable                                        |
| `pickup_point_provider`     | text         | Nullable                                        |
| `pickup_point_id`           | text         | Nullable                                        |
| `pickup_point_label`        | text         | Nullable                                        |
| `billing_address`           | jsonb        | DEFAULT '{}'                                    |
| `notes`                     | text         | Nullable                                        |
| `barion_payment_id`         | text         | Nullable                                        |
| `barion_payment_request_id` | text         | Nullable                                        |
| `barion_status`             | text         | Nullable                                        |
| `invoice_provider`          | text         | Nullable                                        |
| `invoice_number`            | text         | Nullable                                        |
| `invoice_url`               | text         | Nullable                                        |
| `created_at`                | timestamptz  | DEFAULT now()                                   |
| `updated_at`                | timestamptz  | DEFAULT now() (auto-trigger)                    |
| `paid_at`                   | timestamptz  | Nullable                                        |
| `shipped_at`                | timestamptz  | Nullable                                        |
| `idempotency_key`           | text         | UNIQUE, nullable                                |
| `abandoned_cart_sent_at`    | timestamptz  | Nullable                                        |

Indexes: `idx_orders_user`, `idx_orders_email`, `idx_orders_status`, `idx_orders_created` (DESC), `idx_orders_barion` (partial WHERE NOT NULL)
RLS: Users read own (uid = user_id), insert own. Admin full. Agency viewer read.

#### 8. `order_items`

| Column                | Type    | Constraints                          |
| --------------------- | ------- | ------------------------------------ |
| `id`                  | uuid PK | DEFAULT gen_random_uuid()            |
| `order_id`            | uuid    | FK to orders(id) ON DELETE CASCADE   |
| `product_id`          | uuid    | FK to products(id)                   |
| `variant_id`          | uuid    | FK to product_variants(id), nullable |
| `title_snapshot`      | text    | NOT NULL                             |
| `variant_snapshot`    | jsonb   | DEFAULT '{}'                         |
| `unit_price_snapshot` | int     | NOT NULL                             |
| `quantity`            | int     | NOT NULL                             |
| `line_total`          | int     | NOT NULL                             |

Indexes: `idx_order_items_order`
RLS: Users read/insert own (via parent order join). Admin full. Agency viewer read.

#### 9. `subscribers`

| Column            | Type              | Constraints               |
| ----------------- | ----------------- | ------------------------- |
| `id`              | uuid PK           | DEFAULT gen_random_uuid() |
| `email`           | text              | UNIQUE, NOT NULL          |
| `status`          | subscriber_status | DEFAULT 'subscribed'      |
| `tags`            | text[]            | DEFAULT '{}'              |
| `source`          | text              | Nullable                  |
| `open_count`      | int               | DEFAULT 0                 |
| `click_count`     | int               | DEFAULT 0                 |
| `bounce_count`    | int               | DEFAULT 0                 |
| `last_opened_at`  | timestamptz       | Nullable                  |
| `last_clicked_at` | timestamptz       | Nullable                  |
| `created_at`      | timestamptz       | DEFAULT now()             |
| `unsubscribed_at` | timestamptz       | Nullable                  |

Indexes: `idx_subscribers_email`, `idx_subscribers_status`, `idx_subscribers_engaged` (partial WHERE subscribed)
RLS: NOT publicly accessible (managed via service role). Admin full. Agency viewer read.

#### 10. `audit_logs`

| Column        | Type        | Constraints                             |
| ------------- | ----------- | --------------------------------------- |
| `id`          | uuid PK     | DEFAULT gen_random_uuid()               |
| `actor_id`    | uuid        | FK to auth.users(id) ON DELETE SET NULL |
| `actor_role`  | app_role    | Nullable                                |
| `action`      | text        | NOT NULL                                |
| `entity_type` | text        | NOT NULL                                |
| `entity_id`   | uuid        | Nullable                                |
| `metadata`    | jsonb       | DEFAULT '{}'                            |
| `created_at`  | timestamptz | DEFAULT now()                           |

Indexes: `idx_audit_logs_actor`, `idx_audit_logs_entity` (type + id), `idx_audit_logs_created` (DESC)
RLS: Admin full. Agency viewer read.

#### 11. `shop_plans` **(PLANNED)**

Defines available subscription plan tiers. Each row is a plan template that can be customized per client at project setup.

| Column               | Type        | Constraints                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | uuid PK     | DEFAULT gen_random_uuid()                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `slug`               | text        | UNIQUE, NOT NULL (e.g., `basic`, `premium`)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `name`               | text        | NOT NULL (display name, e.g., "Basic", "Premium")                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `description`        | text        | Nullable — short tagline for the plan                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `base_monthly_price` | int         | NOT NULL (HUF) — default monthly price, can be overridden per client in `shop_subscriptions`                                                                                                                                                                                                                                                                                                                                                                        |
| `base_annual_price`  | int         | Nullable (HUF) — default annual price (discounted). If NULL, annual billing not offered for this plan.                                                                                                                                                                                                                                                                                                                                                              |
| `features`           | jsonb       | NOT NULL DEFAULT '{}' — structured feature flags: `{max_products, max_admins, enableMarketing, enableFlashSales, enableBundles, enableGiftCards, enableWebhooks, enableB2B, enableAdvancedAnalytics, enableBulkActions, max_emails_per_month, delivery_options_limit, enableCsvImport, csv_import_limit, enableMetaPixel, enableScheduledPublishing, enableLoyalty, enableWishlistAnalytics, enableCustomerSegmentation, enableAutoReviewRequest, enableRefundApi}` |
| `sort_order`         | int         | DEFAULT 0 — display order on comparison page                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `is_active`          | boolean     | DEFAULT true                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `created_at`         | timestamptz | DEFAULT now()                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Notes:

- `features` jsonb allows flexible feature gating without schema changes for each new feature.
- `base_monthly_price` and `base_annual_price` are defaults; actual client pricing is stored on `shop_subscriptions`.
- Agency admin can create custom plans or modify existing ones per client.

RLS: Admin read. Agency admin full CRUD. Agency viewer read.

#### 12. `shop_subscriptions` **(PLANNED)**

One active subscription per shop (client). Tracks the client's current plan, billing cycle, and custom pricing.

| Column                 | Type                | Constraints                                                                                          |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                   | uuid PK             | DEFAULT gen_random_uuid()                                                                            |
| `plan_id`              | uuid                | FK to shop_plans(id), NOT NULL                                                                       |
| `shop_identifier`      | text                | UNIQUE, NOT NULL — identifies which client shop this subscription belongs to (e.g., domain or slug)  |
| `status`               | subscription_status | NOT NULL DEFAULT 'active'                                                                            |
| `billing_cycle`        | text                | NOT NULL, CHECK IN ('monthly', 'annual') — determines which price applies                            |
| `custom_monthly_price` | int                 | Nullable (HUF) — if set, overrides plan's `base_monthly_price` for this client                       |
| `custom_annual_price`  | int                 | Nullable (HUF) — if set, overrides plan's `base_annual_price` for this client                        |
| `current_period_start` | timestamptz         | NOT NULL — start of current billing period                                                           |
| `current_period_end`   | timestamptz         | NOT NULL — end of current billing period (auto-renew date)                                           |
| `trial_ends_at`        | timestamptz         | Nullable — if trialing, when the trial expires                                                       |
| `cancelled_at`         | timestamptz         | Nullable — when the subscription was cancelled (may still be active until period end)                |
| `feature_overrides`    | jsonb               | DEFAULT '{}' — per-client feature overrides that extend or restrict the base plan's `features` jsonb |
| `notes`                | text                | Nullable — internal agency notes about this client's deal                                            |
| `created_at`           | timestamptz         | DEFAULT now()                                                                                        |
| `updated_at`           | timestamptz         | DEFAULT now() (auto-trigger)                                                                         |

Notes:

- `custom_monthly_price` / `custom_annual_price` allow the agency to negotiate different prices per client without creating a new plan tier.
- `feature_overrides` merges with the plan's `features` jsonb at runtime, allowing per-client exceptions (e.g., a Basic client who paid extra for marketing).
- Effective price resolution: `custom_*_price ?? plan.base_*_price` depending on `billing_cycle`.
- Only one active subscription per `shop_identifier` at a time.

RLS: Admin read (own shop only, via shop_identifier match). Agency admin full CRUD.

#### 13. `subscription_invoices` **(PLANNED)**

Billing records for plan subscriptions. Reuses the existing Billingo/Szamlazz invoicing adapters for invoice generation.

| Column                 | Type        | Constraints                                                                    |
| ---------------------- | ----------- | ------------------------------------------------------------------------------ |
| `id`                   | uuid PK     | DEFAULT gen_random_uuid()                                                      |
| `subscription_id`      | uuid        | FK to shop_subscriptions(id) ON DELETE CASCADE                                 |
| `amount`               | int         | NOT NULL (HUF) — the amount charged for this billing period                    |
| `currency`             | text        | DEFAULT 'HUF'                                                                  |
| `billing_period_start` | timestamptz | NOT NULL                                                                       |
| `billing_period_end`   | timestamptz | NOT NULL                                                                       |
| `status`               | text        | NOT NULL, CHECK IN ('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' |
| `paid_at`              | timestamptz | Nullable                                                                       |
| `invoice_provider`     | text        | Nullable — 'billingo', 'szamlazz', or null if not yet generated                |
| `invoice_number`       | text        | Nullable — external invoice number from provider                               |
| `invoice_url`          | text        | Nullable — downloadable invoice PDF link                                       |
| `payment_method`       | text        | Nullable — 'bank_transfer', 'card', 'barion', etc.                             |
| `notes`                | text        | Nullable — internal notes (e.g., "first month free", "custom deal")            |
| `created_at`           | timestamptz | DEFAULT now()                                                                  |

Notes:

- Invoice generation reuses the existing `InvoicingAdapter` strategy pattern (Billingo/Szamlazz/Null).
- Agency admin generates invoices after payment is confirmed, same UX pattern as order invoicing.
- `amount` reflects the actual charged price (after any custom pricing or annual discount).
- Records are created automatically at each billing cycle renewal or manually by agency admin.

RLS: Admin read (own shop's invoices only, via subscription join). Agency admin full CRUD. Agency viewer read.

### Database Functions & Triggers

| Function             | Type                      | Purpose                                                              |
| -------------------- | ------------------------- | -------------------------------------------------------------------- |
| `current_app_role()` | STABLE, SECURITY DEFINER  | Returns app_role for auth.uid() from profiles. Fallback: 'customer'. |
| `handle_new_user()`  | Trigger, SECURITY DEFINER | Auto-creates profiles row on auth.users INSERT with role='customer'. |
| `set_updated_at()`   | Trigger                   | Sets updated_at = now() on UPDATE.                                   |

| Trigger                           | Table            | Event         |
| --------------------------------- | ---------------- | ------------- |
| `on_auth_user_created`            | auth.users       | AFTER INSERT  |
| `trg_products_updated_at`         | products         | BEFORE UPDATE |
| `trg_product_variants_updated_at` | product_variants | BEFORE UPDATE |
| `trg_orders_updated_at`           | orders           | BEFORE UPDATE |

### Storage

- Bucket: `product-images` (public read, 5MB limit, JPEG/PNG/WebP/AVIF)
- 4 storage policies: public read, admin upload/update/delete

---

## Authentication & Security

**Status: COMPLETE** — Full role-based auth with middleware, Supabase Auth, and app-level guards.

### Planned: `agency_admin` Super-Role

**Status: NOT YET IMPLEMENTED**

The subscription management system requires an elevated `agency_admin` role (or a boolean `is_agency_admin` flag on the profiles table) to distinguish the agency owner from regular shop admins. This role would:

- See all agency-level pages (`/admin/agency/*`) including client management, subscription management, and cross-shop overview
- Manage `shop_plans`, `shop_subscriptions`, and `subscription_invoices` (full CRUD)
- Override per-client feature flags and pricing
- Generate subscription invoices for clients via the existing invoicing adapters
- Regular `admin` users would NOT see agency-level pages — they only manage their own shop

**Implementation options:**

1. **New enum value:** Add `agency_admin` to the `app_role` enum. Cleanest separation, but requires migration.

### Middleware (`src/proxy.ts`)

Single middleware intercepts every request. Uses `updateSession()` which refreshes the Supabase session and fetches user role from profiles.

### Route Protection Rules

| User State                 | Can Access                                                                                          | Cannot Access                                          | Redirects To              |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------- |
| Guest (no session)         | `/`, `/products/**`, `/cart`, `/checkout/**`, `/login`, `/register`, `/reset-password`, legal pages | `/profile/*`, `/admin/*`                               | `/login?redirectTo=[url]` |
| Customer                   | All public routes, `/profile/*`                                                                     | `/login`, `/register`, `/reset-password`, `/admin/*`   | `/profile`                |
| Admin / Agency Viewer      | All public routes, `/admin/*` (except `/admin/agency/*`)                                            | `/login`, `/register`, `/reset-password`, `/profile/*` | `/admin`                  |
| Agency Admin **(PLANNED)** | All public routes, `/admin/*` including `/admin/agency/*`                                           | `/login`, `/register`, `/reset-password`, `/profile/*` | `/admin`                  |

### Supabase Clients

| Client                  | File        | Purpose                                                                                                      |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `createClient()`        | `server.ts` | User-scoped SSR client. Respects RLS. For Server Components and customer-facing Server Actions.              |
| `createAdminClient()`   | `admin.ts`  | Service-role client. Bypasses RLS. Singleton with env-var invalidation guard. For admin Server Actions only. |
| `createBrowserClient()` | `client.ts` | Browser-side Supabase client. For client components.                                                         |

### Security Helpers (`src/lib/security/`)

| Function                   | File                 | Purpose                                                   |
| -------------------------- | -------------------- | --------------------------------------------------------- |
| `requireAuth()`            | roles.ts             | Returns authenticated user or throws (redirects to login) |
| `requireAdmin()`           | roles.ts             | Returns admin user or throws (blocks agency_viewer)       |
| `requireAdminOrViewer()`   | roles.ts             | Returns admin or agency_viewer user                       |
| `getCurrentProfile()`      | roles.ts             | Returns profile or null (non-throwing, for layouts)       |
| `isAgencyViewer()`         | roles.ts             | Boolean check                                             |
| `RateLimiter` class        | rate-limit.ts        | In-memory rate limiter (subscribe: 5/60s, auth: 10/60s)   |
| `logAudit()`               | logger.ts            | Writes to audit_logs via admin client                     |
| `signUnsubscribeToken()`   | unsubscribe-token.ts | HMAC-SHA256 signed token generation                       |
| `verifyUnsubscribeToken()` | unsubscribe-token.ts | Token verification, returns email or null                 |

### Auth Pages

| Route             | Status | Details                                                                                                       |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `/login`          | DONE   | Email/password sign-in, OAuth buttons (Google, Apple, Facebook), `?redirectTo=` support, dev profile selector |
| `/register`       | DONE   | Email/password + name, OAuth buttons, auto-creates profile, email verification state                          |
| `/reset-password` | DONE   | Email form with success confirmation via Supabase Auth                                                        |
| `/logout`         | DONE   | Calls signOut() server action, redirects to `/`                                                               |
| `/auth/callback`  | DONE   | OAuth redirect handler                                                                                        |

---

## Storefront Pages

**Status: COMPLETE** — All 10 storefront routes fully implemented.

### `/` (Home Page)

- **File:** `src/app/(shop)/page.tsx`
- **Type:** Server Component
- **Sections:** Hero (large type + CTA to /products), Featured categories (text + image blocks, no icons), Featured products grid (up to 8 items), Value props (01/02/03 numbered pattern, no icons), Footer newsletter signup
- **Data:** Fetches active products and categories server-side

### `/products` (Product Catalog)

- **File:** `src/app/(shop)/products/page.tsx`
- **Type:** Server Component with client filter controls
- **Features:** Server-side filtered/sorted/paginated product listing. URL search params for: category slug, minPrice, maxPrice, inStock boolean, sort (price_asc, price_desc, newest). Pagination with page param. Loading skeleton (`loading.tsx`). Empty state.
- **Components used:** ProductGrid, ProductCard, ProductFilters, Pagination

### `/products/[slug]` (Product Detail)

- **File:** `src/app/(shop)/products/[slug]/page.tsx`
- **Type:** Server Component with client interactivity
- **Features:** Server fetch product + variants + categories. Variant selector (buttons/chips, updates price and stock). Add to cart (client). Gallery with main image + thumbnails. Breadcrumbs. SEO metadata per product. JSON-LD Product schema. Loading skeleton.
- **Components used:** ProductDetailClient, VariantSelector, Gallery, AddToCartButton, PriceDisplay, StockBadge, Breadcrumbs

### `/cart` (Shopping Cart)

- **File:** `src/app/(shop)/cart/page.tsx`
- **Type:** Client Component (Zustand store)
- **Features:** Cart persisted in localStorage. Quantity controls (increment/decrement). Remove item. Line item subtotals. Coupon input with server-side validation. Order summary (subtotal, shipping estimate, discount, total). CTA to /checkout. Empty cart state.
- **Components used:** CartLineItem, CouponInput, OrderSummary

### `/checkout` (Multi-Step Checkout)

- **File:** `src/app/(shop)/checkout/page.tsx` (~1,051 lines)
- **Type:** Client Component (multi-step form)
- **Step 1 — Contact & Addresses:** Email, phone (+36 Hungarian validation), billing address (defaults to "same as delivery" via checked checkbox, can be overridden). If home delivery: full shipping address (street, city, zip). If pickup: billing address still required for invoicing.
- **Step 2 — Shipping Method:** Two distinct UX paths:
  - "Hazhozsz&aacute;ll&iacute;t&aacute;s" (Home Delivery): GLS, MPL, Express One. Requires street + city + zip + phone.
  - "Csomagautomata / &Aacute;tv&eacute;teli pont" (Pickup Point): Foxpost, GLS Automata, Packeta, MPL Automata, Easybox. Dropdown selector (hardcoded mock points). No home address needed; only locker ID + phone.
- **Step 3 — Review & Pay:** Order summary, confirm, submit.
- **On submit:** Server action validates cart against DB (prices, stock, active status). Creates order + order_items snapshots. Applies coupon if present. Decrements stock. Calculates shipping fee. Starts Barion payment. Redirects user to Barion.
- **Guest checkout:** Supported when `enableGuestCheckout` is true in config.

### `/checkout/success` (Order Confirmation)

- **File:** `src/app/(shop)/checkout/success/page.tsx`
- **Features:** Reads order ID from query params. Fetches order summary. Shows paid/processing status. CTA to `/profile/orders` (logged in) or `/products` (guest).

### `/checkout/cancel` (Payment Cancelled)

- **File:** `src/app/(shop)/checkout/cancel/page.tsx`
- **Features:** Cancellation message. Return to cart button.

### `/terms`, `/privacy`, `/shipping-and-returns` (Legal Pages)

- **Files:** `src/app/(shop)/terms/page.tsx`, `privacy/page.tsx`, `shipping-and-returns/page.tsx`
- **Features:** Static Hungarian-language legal content. Terms references Ptk. and 45/2014 Korm. rendelet. Privacy is GDPR/NAIH compliant. Shipping page dynamically references carriers from siteConfig. Narrower max-width (`max-w-3xl`) for reading comfort.

---

## Customer Profile Section

**Status: COMPLETE** — All 6 profile routes implemented with RLS-filtered data access.

| Route                  | Status | Details                                                                                                                                 |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/profile`             | DONE   | Dashboard: name, email, recent orders summary. Server component, fetches profile.                                                       |
| `/profile/orders`      | DONE   | Paginated order list (excludes drafts). Uses `listUserOrders()` with RLS filtering by user_id.                                          |
| `/profile/orders/[id]` | DONE   | Full order detail: line items, shipping info, billing info, payment status, invoice link. Filtered by order ID + authenticated user ID. |
| `/profile/addresses`   | DONE   | Manage default shipping address, billing/invoice address (with B2B fields: company name, tax number), default pickup point.             |
| `/profile/settings`    | DONE   | Update name, phone (Hungarian +36 validation), change password via Supabase Auth.                                                       |
| `/profile/logout`      | DONE   | Client component that calls signOut() server action, redirects to `/`.                                                                  |

**Layout:** `src/app/(shop)/profile/layout.tsx` — Server component with sidebar navigation + content area. Protected by middleware.

---

## Admin Panel

**Status: COMPLETE** — All 12 admin pages fully implemented with agency_viewer read-only enforcement. **3 additional pages planned** (subscription, agency/clients, subscription/plans).

### `/admin` (Dashboard)

- **KPI Cards (4):** Revenue 30d, Orders 30d, Average Order Value, Low Stock Variants count
- **Planned KPI additions:** Gross Profit 30d (revenue minus cost, only when `cost_price` data is available on products/variants), Profit Margin % (gross profit / revenue). These cards appear conditionally — if no products have `cost_price` set, they are hidden to avoid misleading zeros.
- **Charts:** Daily revenue + daily order count bar charts (Recharts). **Planned:** Daily profit overlay line on the revenue chart when cost data is available.
- **Recent Orders:** Last 5 paid orders with quick links
- **Data:** All fetched server-side via admin client

### `/admin/orders` (Order List)

- Paginated table with status filter buttons (all statuses)
- Search by email or order ID
- Columns: order number, customer email, status (color-coded badge), total, date
- Click row navigates to order detail

### `/admin/orders/[id]` (Order Detail)

- **Sections:** Customer contact info, shipping address/method, billing address, line items table, Barion payment details
- **Status timeline:** Visual state machine showing order progression
- **Actions (admin only):** Change status dropdown, add tracking code (when marking shipped), send receipt email, send shipping update email, generate invoice (if invoicing provider enabled)
- **Agency viewer:** All action buttons hidden. Read-only view.

### `/admin/products` (Product List)

- Paginated table with search, active/inactive filter
- Columns: thumbnail, title, base price, variant count, category badges, active badge
- Sort controls
- "New product" button links to `/admin/products/new`

### `/admin/products/new` (Product Create)

- **Two-column layout:** Left column (main fields), right column (metadata)
- **Fields:** Title, auto-generated slug (editable), description (textarea), base price (HUF), compare-at price
- **Planned field:** Cost price (HUF) — optional purchasing/material cost. Labeled "Beszerzesi ar" in Hungarian. Admin-only, never visible to customers. Shown in a collapsible "Koltseginformaciok" (Cost Information) section to keep the form clean.
- **Images:** Main image URL + gallery image URLs (text inputs, not file upload)
- **Categories:** Checkbox multi-select from all categories
- **Variant builder:** Dynamic rows. Each row: SKU, option1 name/value, option2 name/value, price override, stock quantity. Add/remove rows. **Planned:** Per-variant cost price override field in each row.
- **Save:** Server action with full Zod validation, creates product + variants + category associations + audit log

### `/admin/products/[id]` (Product Edit)

- Same form as create, pre-populated
- Additional actions: Toggle active/inactive, hard delete with confirmation dialog
- Meta info display: created at, updated at, product ID

### `/admin/categories` (Category Management)

- Hierarchical tree display with indentation for children
- Inline create: name, slug (auto-generated), parent select, sort order
- Inline edit: same fields
- Actions: Toggle active, soft delete, hard delete, restore
- Sort order controls

### `/admin/coupons` (Coupon Management)

- Paginated table with search
- Inline create/edit form: code, discount type (percentage/fixed), value, min order amount, max uses, valid from/until dates
- Usage tracking: used_count / max_uses display
- Actions: Toggle active, delete

### `/admin/shipping` (Shipping Configuration)

- **Read-only display** of current shipping config from `site.config.ts`
- Shows: base fee, free shipping threshold, enabled carriers (home delivery + pickup point), weight tiers
- No DB override mechanism yet (see Known Issues)

### `/admin/marketing` (Marketing & Subscribers)

- **Tab 1 — Subscribers:** Paginated list with search, tag filter, status filter. Columns: email, status, tags, source, engagement metrics. Actions: add/remove tags, export.
- **Tab 2 — Campaign Builder:** Subject line, headline, body text, CTA text + URL, tag-based targeting with subscriber count preview, HTML preview in iframe, batch send via Resend.

### `/admin/settings` (Integration Status)

- Read-only dashboard showing status of all integrations:
  - Store info (name, email, phone, address)
  - Barion: environment (test/prod), POS key configured?
  - Invoicing: provider, mode, API key configured?
  - Email: Resend API key configured?, sender addresses
  - Feature flags: all toggles with current state
  - Admin settings: agency viewer enabled, read-only default

### `/admin/audit` (Audit Logs)

- Paginated table with entity type filter
- Columns: timestamp, actor (name or ID), role, action (color-coded), entity type, entity ID
- Expandable metadata (JSON view)

### `/admin/subscription` (Shop Owner Subscription View) **(PLANNED)**

**Purpose:** Shop owners (the agency's clients) can view their own plan details, understand what's included, and see billing history. This is NOT an agency management tool — it's the client-facing subscription dashboard within their admin panel.

- **Plan overview card:** Current plan name + badge (e.g., "Basic" / "Premium"), billing cycle (monthly/annual), next renewal date, current price
- **Feature usage summary:** Visual indicators for plan-limited features:
  - Product count: "142 / 500 termek" (with progress bar if limited)
  - Admin users: "1 / 1 admin felhasznalo"
  - Email sends this month: "340 / 1,000 email" (if marketing module is in plan)
  - Delivery options: "2 / 2 szallitasi mod"
- **Feature list:** All features with checkmarks (included) or lock icons + "Premium" badge (not in current plan). Locked features link to the comparison page (`/admin/subscription/plans`).
- **Billing history table:** Past invoices from `subscription_invoices` table. Columns: billing period, amount (HUF), status, invoice number, download link. Paginated.
- **Upgrade CTA:** Prominent button linking to `/admin/subscription/plans` if not on the highest plan.
- **Access:** All admin roles can view. No mutation actions — upgrades/downgrades are handled by the agency.

### `/admin/subscription/plans` (Plan Comparison Page) **(PLANNED)**

**Purpose:** A comprehensive, detailed plan comparison page inside the admin panel for existing shop owners to evaluate what their current plan includes vs. what they'd get by upgrading. NOT a public marketing page.

- **Layout:** Full-width comparison table with plans as columns. Current plan column highlighted with distinct border/background color and "Jelenlegi csomag" (Current Plan) badge.
- **Section categories** (rows grouped by domain):
  - **Termekek & Katalogus** (Products & Catalog): max products, CSV import/export, scheduled publishing, product bundles, flash sales, gift cards, related products / cross-sell
  - **Rendelesek & Fizetes** (Orders & Payments): guest checkout, guest order tracking, packing slips, refund management (manual vs Barion API + partial), bulk order actions
  - **Szallitas** (Shipping): delivery option count, weight tiers, all carriers vs limited
  - **Marketing & Kommunikacio** (Marketing & Communication): subscriber management, email marketing (send limits), abandoned cart automation, customer segmentation, review request emails, Meta Pixel, newsletter campaigns
  - **SEO & Megjelenes** (SEO & Appearance): basic SEO, advanced SEO (AI metadata), blog, about page builder
  - **Analitika & Riportok** (Analytics & Reports): basic dashboard, profit tracking (requires cost_price data), advanced analytics (conversion funnels, CLV, product performance), wishlist analytics, search analytics
  - **Integraciok** (Integrations): Barion, invoicing (Billingo/Szamlazz), GA4, Meta Pixel, webhooks
  - **Felhasznalokezeles** (User Management): admin count, customer accounts, B2B wholesale mode, loyalty points
  - **Jogi Megfelelosseg** (Compliance): cookie consent, 30-day price history, legal page templates
- **Cell content:** Checkmark (included), X (not included), or specific value/limit (e.g., "500 termek", "1,000 email/ho")
- **Sticky header** with plan names and prices that stays visible while scrolling the feature rows
- **Mobile:** Tabs or accordion per plan (table is too wide for mobile; switch to stacked card view)
- **Annual discount callout:** If annual billing is available, show the monthly-equivalent price with "X% kedvezmeny" (X% discount) badge
- **CTA per plan:** "Kérd ajánlatunkat" (Request a quote) button for each plan that is not the current one. Links to a contact form or sends a request to the agency.
- **Access:** All admin roles can view.

### `/admin/agency/clients` (Agency Client Management) **(PLANNED)**

**Purpose:** Super-admin view for the agency to manage all client shops, their subscriptions, billing, and feature overrides. Only visible to users with the `agency_admin` flag. NOT visible to regular shop admins or agency viewers. Should never be included in the agency's webshop. It should only be added to the template itself.

- **Client list table:** All shops managed by the agency.
  - Columns: shop name/identifier, current plan, billing cycle, status (active/past_due/cancelled/trialing), monthly revenue (from subscription_invoices), next renewal date, actions
  - Search by shop name/identifier
  - Filter by plan, status, billing cycle
  - Sort by revenue, renewal date, name
- **Click row => Client detail panel** (or side drawer):
  - **Subscription management56:** Change plan, switch billing cycle (monthly/annual), set custom pricing (override base plan price for this specific client), toggle annual discount
  - **Feature overrides:** Per-client feature flag toggles that extend or restrict the base plan. E.g., give a Basic client access to marketing for an extra fee. Stored in `shop_subscriptions.feature_overrides` jsonb.
  - **Pricing controls:** Custom monthly price, custom annual price. Clearly shows: "Csomag alapar: 9,900 Ft | Egyedi ar: 7,900 Ft" (Plan base price vs Custom price).
  - **Billing history:** All `subscription_invoices` for this client. Status, amounts, invoice links.
  - **Invoice actions:** "Számla Készítése" (Generate invoice) button — creates an invoice for the current billing period using the existing Billingo/Szamlazz adapter. Same UX pattern as order invoicing on `/admin/orders/[id]`.
  - **Subscription actions:** Pause, cancel, resume, extend trial.
  - **Internal notes:** Free-text notes about the client's deal, special arrangements, etc.
- **New client setup:** Button to onboard a new client shop — create subscription record, assign plan, set custom pricing if applicable.
- **Aggregate KPIs at the top:** Total active clients, total MRR (Monthly Recurring Revenue), average revenue per client, clients by plan breakdown.
- **Access:** `agency_admin` only. Regular admins and agency viewers cannot see this page. Middleware and server action guards enforce this.
- **Audit:** All subscription changes (plan change, price override, status change) are logged to `audit_logs`.

### Admin Layout & Sidebar

- **Desktop:** Fixed 260px collapsible sidebar + top bar with toggle
- **Mobile:** Sheet-based slide-out sidebar
- **Navigation items:** Feature-flag-driven (marketing only shows if `enableMarketingModule` is true, coupons only if `enableCoupons` is true)
- **Planned nav items:** "Elofizetes" (Subscription) link to `/admin/subscription` for all admin roles. "Ugyfelek" (Clients) link to `/admin/agency/clients` visible only to `agency_admin` users.
- **Agency viewer:** Yellow "Csak olvasas" (Read-only) badge in sidebar
- **Footer links:** "Vissza a boltba" (Back to shop) + "Kijelentkezes" (Sign out)

---

## Server Actions

**Status: COMPLETE** — 10 action files, 47 exported functions, all with Zod validation.

### `src/lib/actions/products.ts` (876 lines)

| Function                       | Guard                | What it does                                                                                                                                           |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listProducts(filters)`        | Public               | Server-side filtered/sorted/paginated product listing. Filters: category, price range, stock, sort. Joins variants and categories.                     |
| `getProductBySlug(slug)`       | Public               | Fetches single product with all variants and categories. Active products only.                                                                         |
| `adminListProducts(filters)`   | requireAdminOrViewer | Lists ALL products (including inactive). Search, filter, paginate.                                                                                     |
| `adminGetProduct(id)`          | requireAdminOrViewer | Single product with variants and categories (any status).                                                                                              |
| `adminCreateProduct(formData)` | requireAdmin         | Creates product + variants + category associations. FormData-based (for potential file upload). Auto-generates slug. Validates with Zod. Audit logged. |
| `adminUpdateProduct(formData)` | requireAdmin         | Updates product fields, syncs variants (upsert/delete), syncs categories. Audit logged.                                                                |
| `adminDeleteProduct(id)`       | requireAdmin         | Soft delete (is_active = false). Audit logged.                                                                                                         |
| `adminToggleProductActive(id)` | requireAdmin         | Toggle active state. Audit logged.                                                                                                                     |
| `adminHardDeleteProduct(id)`   | requireAdmin         | Permanent delete with cascade. Audit logged.                                                                                                           |

### `src/lib/actions/orders.ts` (719 lines)

| Function                                             | Guard                             | What it does                                                                                                                                                                                                                               |
| ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createOrderFromCart(input)`                         | requireAuth (or guest if enabled) | Full checkout flow: validates cart items against DB (prices, stock, active status), applies coupon, calculates shipping fee, decrements stock, creates order + order_items snapshots, runs preCheckoutHook/postPaidHook. Returns order ID. |
| `getOrderForUser(orderId)`                           | requireAuth                       | Fetches order with items, filtered by both order ID and authenticated user ID.                                                                                                                                                             |
| `adminListOrders(filters)`                           | requireAdminOrViewer              | All orders with filters (status, date range, search by email/order ID). Paginated.                                                                                                                                                         |
| `adminGetOrder(id)`                                  | requireAdminOrViewer              | Single order with items.                                                                                                                                                                                                                   |
| `adminUpdateOrderStatus(orderId, status, tracking?)` | requireAdmin                      | Status state machine with validation. Sets paid_at/shipped_at timestamps. Stores tracking code. Audit logged.                                                                                                                              |

### `src/lib/actions/cart.ts` (300 lines)

| Function                      | Guard                  | What it does                                                                                                                                                          |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateCart(items)`         | Public (server action) | Validates cart items against DB: checks product exists, is active, variant exists, price matches, stock available. Returns normalized line items with correct totals. |
| `applyCoupon(code, subtotal)` | Public (server action) | Validates coupon: exists, active, within date range, not exhausted, meets minimum order. Returns discount amount.                                                     |

### `src/lib/actions/payments.ts` (122 lines)

| Function                      | Guard       | What it does                                                                                                                     |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `startPaymentAction(orderId)` | requireAuth | Fetches order, calls Barion startPayment, stores barion_payment_id and barion_payment_request_id on order, returns redirect URL. |

### `src/lib/actions/coupons.ts` (352 lines)

| Function                       | Guard                | What it does                                     |
| ------------------------------ | -------------------- | ------------------------------------------------ |
| `adminListCoupons(filters)`    | requireAdminOrViewer | Paginated coupon list with search.               |
| `adminCreateCoupon(input)`     | requireAdmin         | Create coupon with Zod validation. Audit logged. |
| `adminUpdateCoupon(id, input)` | requireAdmin         | Update coupon fields. Audit logged.              |
| `adminToggleCoupon(id)`        | requireAdmin         | Toggle active state. Audit logged.               |
| `adminDeleteCoupon(id)`        | requireAdmin         | Hard delete. Audit logged.                       |

### `src/lib/actions/categories.ts` (446 lines)

| Function                         | Guard                | What it does                             |
| -------------------------------- | -------------------- | ---------------------------------------- |
| `listCategories()`               | Public               | Active categories with parent hierarchy. |
| `adminListCategories()`          | requireAdminOrViewer | All categories (including inactive).     |
| `adminCreateCategory(input)`     | requireAdmin         | Create with slug auto-gen. Audit logged. |
| `adminUpdateCategory(id, input)` | requireAdmin         | Update fields. Audit logged.             |
| `adminDeleteCategory(id)`        | requireAdmin         | Soft delete. Audit logged.               |
| `adminToggleCategory(id)`        | requireAdmin         | Toggle active. Audit logged.             |
| `adminHardDeleteCategory(id)`    | requireAdmin         | Permanent delete. Audit logged.          |
| `adminRestoreCategory(id)`       | requireAdmin         | Restore soft-deleted. Audit logged.      |

### `src/lib/actions/profile.ts` (343 lines)

| Function                                          | Guard       | What it does                                                          |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| `getProfile()`                                    | requireAuth | Fetch authenticated user's profile.                                   |
| `updateProfile({fullName, phone})`                | requireAuth | Update name and phone with Zod validation. +36 phone format enforced. |
| `updateAddresses({shipping?, billing?, pickup?})` | requireAuth | Update default addresses.                                             |
| `changePassword({newPassword})`                   | requireAuth | Change password via Supabase Auth.                                    |
| `listUserOrders({page, perPage})`                 | requireAuth | Paginated order list for current user. Excludes drafts.               |
| `getUserOrder(orderId)`                           | requireAuth | Single order with items, filtered by user ownership.                  |
| `signOut()`                                       | None        | Sign out via Supabase Auth.                                           |

### `src/lib/actions/subscribers.ts` (411 lines)

| Function                              | Guard                 | What it does                                                      |
| ------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| `subscribe(email, source?, tags?)`    | Public (rate-limited) | Subscribe email. Creates or reactivates. Rate limited: 5 per 60s. |
| `unsubscribe(token)`                  | Public                | Unsubscribe via signed token. Updates status + unsubscribed_at.   |
| `adminListSubscribers(filters)`       | requireAdminOrViewer  | Paginated list with search, tag filter, status filter.            |
| `adminTagSubscriber(email, tags)`     | requireAdmin          | Add/replace tags on subscriber. Audit logged.                     |
| `adminGetAllActiveSubscriberEmails()` | requireAdmin          | Fetch all active subscriber emails (for campaign sending).        |
| `adminGetAllTags()`                   | requireAdminOrViewer  | Distinct tags across all subscribers.                             |

### `src/lib/actions/audit.ts` (103 lines)

| Function                      | Guard                | What it does                                  |
| ----------------------------- | -------------------- | --------------------------------------------- |
| `adminListAuditLogs(filters)` | requireAdminOrViewer | Paginated audit logs with entity type filter. |

### `src/lib/actions/dev-auth.ts` (37 lines)

| Function                     | Guard    | What it does                           |
| ---------------------------- | -------- | -------------------------------------- |
| `devSignIn(email, password)` | Dev only | Quick sign-in for development testing. |

---

## Integrations

**Status: COMPLETE** — All 3 integrations fully implemented with production-ready patterns.

### Barion (Payments)

| File                 | Lines | Purpose                                                                                                                                                                                                                                                                               |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `barion/client.ts`   | 239   | API client: `startPayment()`, `getPaymentState()`, `verifyPayment()`. Test/prod URL switching. Full type definitions for Barion API request/response.                                                                                                                                 |
| `barion/callback.ts` | 298   | Idempotent callback handler: verifies payment with Barion API, finds order by payment ID, skips if already in terminal state, decrements stock on success (with negative-stock guard, clamps to 0), updates order status + timestamps. Race condition protected via status IN clause. |

**Flow:** Checkout -> createOrderFromCart -> startPaymentAction (calls Barion API, gets redirect URL) -> User pays on Barion -> Barion calls `/api/payments/barion/callback` -> handleBarionCallback (idempotent, updates order status, decrements stock).

### Resend (Email)

| File                  | Lines  | Purpose                                                                                                                                                                                                                              |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `email/provider.ts`   | ~150   | `sendEmail()` with retry + exponential backoff. `sendBatchEmail()` (50/chunk). Sender address config (transactional vs marketing). Test recipient redirect for dev.                                                                  |
| `email/sender.ts`     | ~100   | High-level sending functions: `sendTransactionalEmail()`, `sendMarketingEmail()`. Handles sender identity separation.                                                                                                                |
| `email/actions.ts`    | ~250   | `sendReceipt(orderId)`, `sendShippingUpdate(orderId)`, `sendAbandonedCartEmail(orderId)`, `renderNewsletterPreview(data)`, `sendNewsletterCampaign(data)` (batch with tag targeting).                                                |
| `email/templates.tsx` | ~1,216 | React Email templates: order-receipt (442 lines), shipping-update (285 lines), abandoned-cart (274 lines), newsletter (215 lines). All styled with inline CSS, responsive, include unsubscribe links.                                |
| `email/webhook.ts`    | ~150   | `handleWebhookEvent()`: processes bounce (marks subscriber bounced), complaint (marks complained), delivered (updates stats), opened (increments open_count), clicked (increments click_count). `verifyWebhookSignature()` via HMAC. |

### Invoicing (Billingo / Szamlazz)

| File                   | Lines | Purpose                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoicing/adapter.ts` | 401   | Strategy pattern interface: `InvoicingAdapter` with `createInvoice()`, `getInvoice()`, `cancelInvoice()`. Three implementations: `BillingoAdapter` (REST API calls), `SzamlazzAdapter` (XML API calls), `NullAdapter` (no-op fallback). Factory: `getInvoicingAdapter()` reads `INVOICING_PROVIDER` env var. Dev mode mock fallbacks. |

**Planned: Subscription invoicing reuse.** The existing `InvoicingAdapter` strategy pattern will be reused for generating subscription/plan invoices for agency clients. When the agency admin clicks "Szamla keszitese" on `/admin/agency/clients`, it calls the same `getInvoicingAdapter().createInvoice()` with subscription billing data instead of order data. This requires a thin wrapper function (e.g., `createSubscriptionInvoice(subscriptionId, billingPeriod)`) that maps `subscription_invoices` data to the adapter's `InvoiceInput` format. No changes to the adapter interface itself — only a new caller.

---

## API Route Handlers

**Status: COMPLETE** — 4 endpoints.

| Route                           | Method     | Auth               | Purpose                                                                                                           |
| ------------------------------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/api/payments/barion/callback` | GET        | None (Barion S2S)  | Barion payment callback. Always returns 200. Idempotent via order status check.                                   |
| `/api/email/webhook/resend`     | POST + GET | HMAC signature     | Resend webhook receiver. Processes bounce/complaint/delivered/opened/clicked. GET returns debug info in dev only. |
| `/api/email/abandoned-cart`     | POST       | CRON_SECRET header | Triggered by Edge Function. Sends abandoned cart email for a specific order.                                      |
| `/api/newsletter/unsubscribe`   | GET        | Signed token       | One-click unsubscribe. Renders Hungarian HTML confirmation page. Idempotent.                                      |

### Edge Function

| Function         | Location                                                 | Purpose                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abandoned-cart` | `supabase/functions/abandoned-cart/index.ts` (132 lines) | Scheduled cron (30 min). Finds draft/awaiting_payment orders older than 2 hours with no abandoned_cart_sent_at. Posts to Next.js API for each (max 50/run). Stamps sent_at after success. |

---

## Components Inventory

**Status: COMPLETE** — 44 component files total.

### Shared Components (7)

| Component       | File                          | Type   | Purpose                                                                                                                                      |
| --------------- | ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Header          | `shared/header.tsx`           | Server | Auth-aware. Shows role-appropriate account link: Login (guest), Fiokom (customer), Admin (admin/viewer). Mobile sheet nav. Cart count badge. |
| Footer          | `shared/footer.tsx`           | Server | Site links, legal links, newsletter signup, copyright.                                                                                       |
| AdminSidebar    | `shared/admin-sidebar.tsx`    | Client | 260px collapsible sidebar. Feature-flag-driven nav items. Agency viewer badge. Back to shop + sign out links. Mobile sheet.                  |
| Breadcrumbs     | `shared/breadcrumbs.tsx`      | Client | Configurable breadcrumb trail.                                                                                                               |
| CartCount       | `shared/cart-count.tsx`       | Client | Cart item count badge in header.                                                                                                             |
| LoadingSkeleton | `shared/loading-skeleton.tsx` | Server | Reusable skeleton placeholders.                                                                                                              |
| NewsletterForm  | `shared/newsletter-form.tsx`  | Client | Email input + subscribe button. Calls subscribe server action. Toast feedback.                                                               |

### Product Components (9)

| Component           | File                                | Type   | Purpose                                                                                   |
| ------------------- | ----------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| ProductCard         | `product/product-card.tsx`          | Server | Card with image, title, price, compare-at price, category badges. Link to product detail. |
| ProductGrid         | `product/product-grid.tsx`          | Server | Responsive grid of ProductCards.                                                          |
| ProductDetailClient | `product/product-detail-client.tsx` | Client | Full product detail with variant state, price updates, add to cart.                       |
| ProductFilters      | `product/product-filters.tsx`       | Client | Category select, price range, in-stock toggle, sort select. Updates URL params.           |
| VariantSelector     | `product/variant-selector.tsx`      | Client | Button/chip-based variant selection. Updates parent state.                                |
| Gallery             | `product/gallery.tsx`               | Client | Main image + thumbnail strip. Click to switch.                                            |
| AddToCartButton     | `product/add-to-cart-button.tsx`    | Client | Button with loading state. Calls Zustand addItem. Toast confirmation.                     |
| PriceDisplay        | `product/price-display.tsx`         | Server | Formats HUF price. Shows strikethrough for compare-at.                                    |
| StockBadge          | `product/stock-badge.tsx`           | Server | Green/yellow/red badge based on stock level.                                              |

### Cart/Checkout Components (4)

| Component           | File                             | Type   | Purpose                                                                                                                    |
| ------------------- | -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| CartLineItem        | `cart/cart-line-item.tsx`        | Client | Thumbnail, title, variant info, unit price, quantity controls, remove button, line total.                                  |
| CouponInput         | `cart/coupon-input.tsx`          | Client | Input + apply button. Calls applyCoupon server action. Shows discount amount or error.                                     |
| OrderSummary        | `cart/order-summary.tsx`         | Client | Subtotal, shipping fee, discount, total.                                                                                   |
| PickupPointSelector | `cart/pickup-point-selector.tsx` | Client | Dropdown selector for pickup points. Currently uses hardcoded mock data. Interface ready for real carrier API integration. |

### Admin Components (1)

| Component       | File                         | Type   | Purpose                                                    |
| --------------- | ---------------------------- | ------ | ---------------------------------------------------------- |
| DashboardCharts | `admin/dashboard-charts.tsx` | Client | Recharts bar charts for daily revenue + daily order count. |

### Auth Components (1)

| Component          | File                            | Type   | Purpose                                                                           |
| ------------------ | ------------------------------- | ------ | --------------------------------------------------------------------------------- |
| DevProfileSelector | `auth/dev-profile-selector.tsx` | Client | Dev-only role switcher. Buttons for admin, viewer, customer roles. Quick sign-in. |

### UI Primitives (shadcn/ui) — 23 components

badge, breadcrumb, button, card, chart, checkbox, command, dialog, dropdown-menu, input, input-group, label, pagination, popover, radio-group, select, separator, sheet, skeleton, sonner, table, tabs, textarea

---

## Email Templates

**Status: COMPLETE** — 4 React Email templates, all styled, responsive, Hungarian language.

| Template        | File                  | Lines | Content                                                                                                                  |
| --------------- | --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| Order Receipt   | `order-receipt.tsx`   | 442   | Order confirmation with line items table, shipping/billing addresses, payment info, totals breakdown, shop contact info. |
| Shipping Update | `shipping-update.tsx` | 285   | Shipping notification with tracking code, carrier name, estimated delivery, order summary.                               |
| Abandoned Cart  | `abandoned-cart.tsx`  | 274   | Cart recovery prompt with product list, subtotal, CTA button to resume checkout.                                         |
| Newsletter      | `newsletter.tsx`      | 215   | Marketing template with headline, body, CTA button, unsubscribe link (HMAC-signed).                                      |

All templates use inline CSS for email client compatibility, are mobile-responsive, and include the shop's branding from siteConfig.

---

## Configuration System

**Status: COMPLETE** (base config). **Planned: Plan-based feature gating layer.**

### `src/lib/config/site.config.ts` (234 lines)

Fully typed `SiteConfig` with these sections:

| Section                   | Key Settings                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **store**                 | name: "Agency Store", legalName: "Agency Kft.", currency: HUF, Budapest address, phone, email                                                                                                     |
| **urls**                  | siteUrl (from env), supportEmail                                                                                                                                                                  |
| **features**              | enableAccounts: true, enableGuestCheckout: true, enableCoupons: true, enableReviews: false (scaffold only), enableMarketingModule: true, enableAbandonedCart: true, enableB2BWholesaleMode: false |
| **payments**              | provider: "barion", environment from env (test/prod), posKey env var name, redirectUrls                                                                                                           |
| **shipping.homeDelivery** | enabled: true, carriers: GLS, MPL, Express One                                                                                                                                                    |
| **shipping.pickupPoint**  | enabled: true, carriers: Foxpost, GLS Automata, Packeta, MPL Automata, Easybox                                                                                                                    |
| **shipping.rules**        | baseFee: 1490, freeOver: 15000, weightTiers: []                                                                                                                                                   |
| **invoicing**             | provider from env (default "none"), mode: "manual"                                                                                                                                                |
| **admin**                 | agencyViewerEnabled: true, readonlyByDefaultForAgency: true                                                                                                                                       |
| **branding**              | logoText: "AGENCY", neutral black/white theme tokens                                                                                                                                              |

### Planned: Plan-Based Feature Gating

**Status: NOT YET IMPLEMENTED**

Currently, all feature flags in `site.config.ts` are static booleans set at deploy time. The subscription management system introduces a dynamic layer on top:

**Architecture:**

1. `site.config.ts` remains the base config — it defines what the boilerplate supports.
2. At runtime, a `getPlanFeatures()` helper fetches the active `shop_subscriptions` record and merges the plan's `features` jsonb with any `feature_overrides` jsonb.
3. The effective feature flags are: `siteConfig.features` AND `planFeatures` — a feature must be enabled in BOTH the static config and the active plan to be available.
4. This allows the agency to deploy a single codebase with all features enabled in `site.config.ts`, and let the plan tier control what each client can actually use.

**Per-client pricing model:**

- Plan prices are NOT hardcoded in the codebase. They are stored in the `shop_plans` table as `base_monthly_price` and `base_annual_price`.
- The agency can override pricing per client via `shop_subscriptions.custom_monthly_price` / `custom_annual_price`.
- Annual billing offers a discount (configurable per plan). The discount percentage is not fixed — the agency sets the annual price directly, so it can be any amount less than 12x the monthly price.
- Effective price resolution: `subscription.custom_*_price ?? plan.base_*_price`

**Feature gating UI pattern:**

- Features limited by the current plan show a visual indicator in the admin sidebar and on feature pages:
  - **Locked features:** Greyed-out nav item with a small lock icon + "Premium" badge. Clicking shows a tasteful upsell modal: "Ez a funkció a Premium csomagban elérhető el" (This feature is available in the Premium plan) with a CTA to `/admin/subscription/plans`.
  - **Near-limit features:** Warning indicator when approaching limits (e.g., product count at 90% of max). Subtle yellow badge, not blocking.
  - **Over-limit features:** Hard block on creation actions (e.g., cannot create 501st product on a 500-product plan). Server action validates plan limits before writes.
- The comparison page (`/admin/subscription/plans`) is the canonical reference for what each plan includes.

### `src/lib/config/hooks.ts` (118 lines)

| Hook              | Signature                           | Default                                              | Purpose                              |
| ----------------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `preCheckoutHook` | `(orderDraft) => orderDraft`        | Pass-through                                         | Mutate order before DB insert        |
| `postPaidHook`    | `(order) => void`                   | No-op                                                | Side effects after payment confirmed |
| `pricingHook`     | `(product, variant, user) => price` | Returns variant.price_override or product.base_price | Override pricing (e.g., wholesale)   |

API: `getHooks()`, `overrideHooks(partial)`, `resetHooks()`

### Zod Validators (5 files)

| File                       | Schemas                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `validators/checkout.ts`   | addressSchema, contactSchema, homeDeliverySchema, pickupPointSchema, checkoutSchema |
| `validators/coupon.ts`     | couponCreateSchema, couponApplySchema                                               |
| `validators/product.ts`    | variantSchema, productCreateSchema, productUpdateSchema                             |
| `validators/subscriber.ts` | subscribeSchema, unsubscribeSchema, tagSchema                                       |
| `validators/uuid.ts`       | uuidSchema                                                                          |

Plus 15+ inline Zod schemas in individual action files.

---

## SEO & Performance

**Status: COMPLETE**

| Feature           | Status | Details                                                                                                                                                                                                       |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic sitemap   | DONE   | `src/app/sitemap.ts` — includes all active products (limit 5000), categories (limit 500), and 5 static pages. Priority weighting: home 1.0, products 0.9, individual products 0.8, categories 0.7, legal 0.3. |
| robots.txt        | DONE   | `src/app/robots.ts` — allows all crawlers on `/`. Disallows `/admin/`, `/api/`, `/checkout/`, `/account/`. Points to sitemap.                                                                                 |
| Per-page metadata | DONE   | Custom title/description on every route. Product pages have dynamic metadata from DB.                                                                                                                         |
| JSON-LD           | DONE   | Product structured data on `/products/[slug]` (Product schema with name, description, price, availability, image).                                                                                            |
| OpenGraph         | DONE   | Product pages include og:title, og:description, og:image.                                                                                                                                                     |
| next/image        | DONE   | Used for product images with placeholder blur.                                                                                                                                                                |
| Loading skeletons | DONE   | `loading.tsx` files for products list and product detail pages.                                                                                                                                               |

---

## Testing

**Status: COMPLETE** — Unit, integration, and E2E tests.

### Unit Tests (Vitest) — 8 test files

| Test File                      | Location       | What it tests                                                            |
| ------------------------------ | -------------- | ------------------------------------------------------------------------ |
| `cart-math.test.ts`            | tests/unit/    | Cart subtotal calculation, quantity updates, item removal                |
| `coupon-validation.test.ts`    | tests/unit/    | Coupon validity checks (dates, usage limits, min order, active status)   |
| `order-totals.test.ts`         | tests/unit/    | Order total calculation with discounts and shipping                      |
| `shipping.test.ts`             | tests/unit/    | Shipping fee calculation, free shipping threshold, weight tiers          |
| `cart-store.test.ts`           | src/**tests**/ | Zustand cart store integration (add, remove, update, clear, persistence) |
| `coupon-schemas.test.ts`       | src/**tests**/ | Zod coupon schema validation                                             |
| `order-shipping-utils.test.ts` | src/**tests**/ | Order and shipping utility functions                                     |
| `checkout-validation.test.ts`  | src/**tests**/ | Checkout form Zod schema validation                                      |

### Integration Tests (Vitest) — 1 test file

| Test File              | Location                       | What it tests                                                                                                                                                     |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-order.test.ts` | tests/integration/ (421 lines) | Full `createOrderFromCart` flow against mocked Supabase. Tests: valid order creation, stock decrement, coupon application, guest checkout, invalid cart handling. |

### E2E Tests (Playwright) — 1 test file

| Test File       | Location               | What it tests                                                                                                 |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `smoke.spec.ts` | tests/e2e/ (200 lines) | Browse products page, click product, add to cart, verify cart, navigate to checkout. Runs against dev server. |

### Test Configuration

- **Vitest:** jsdom environment, globals enabled, setup file at `tests/setup.ts`, path alias `@` -> `./src`
- **Playwright:** Chromium only, fully parallel, 2 retries on CI, dev server on port 3000

---

## Documentation

**Status: COMPLETE** — 10 documentation files.

| Document                         | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `README.md` (313 lines)          | Setup guide, env vars, project structure, scripts, deployment |
| `.env.example` (56 lines)        | 18 env vars (3 public, 15 server) with descriptions           |
| `PROJECT_STATUS.md`              | Single source of truth: full project status, schema, roadmap  |
| `AGENTS.md`                      | AI agent instructions and conventions                         |
| `docs/new-client-setup.md`       | How to create a new client shop from the boilerplate          |
| `docs/updating-from-upstream.md` | How to update a client shop from upstream boilerplate changes |
| `docs/README_RESEND.md`          | Resend integration quickstart                                 |
| `docs/RESEND_OVERVIEW.md`        | Resend architecture overview                                  |
| `docs/RESEND_INTEGRATION.md`     | Detailed Resend integration guide                             |
| `docs/RESEND_REFERENCE.md`       | Resend API reference                                          |
| `docs/RESEND_SETUP_CHECKLIST.md` | Resend setup checklist                                        |

### Environment Variables (18 total)

| Variable                        | Scope  | Purpose                                       |
| ------------------------------- | ------ | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public | Supabase project URL                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key                        |
| `NEXT_PUBLIC_SITE_URL`          | Public | Site URL for client-side                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server | Supabase service role (bypasses RLS)          |
| `BARION_POS_KEY`                | Server | Barion payment POS key                        |
| `BARION_ENVIRONMENT`            | Server | `test` or `prod`                              |
| `RESEND_API_KEY`                | Server | Resend email API key                          |
| `RESEND_FROM_EMAIL`             | Server | Transactional sender address                  |
| `RESEND_MARKETING_FROM_EMAIL`   | Server | Marketing sender address                      |
| `RESEND_TEST_RECIPIENT`         | Server | Dev-only: redirect all emails to this address |
| `RESEND_WEBHOOK_SECRET`         | Server | Resend webhook HMAC signing secret            |
| `INVOICING_PROVIDER`            | Server | `billingo`, `szamlazz`, or `none`             |
| `BILLINGO_API_KEY`              | Server | Billingo API key                              |
| `SZAMLAZZ_AGENT_KEY`            | Server | Szamlazz.hu agent key                         |
| `CRON_SECRET`                   | Server | Shared secret for cron-triggered API calls    |
| `UNSUBSCRIBE_SECRET`            | Server | HMAC key for newsletter unsubscribe tokens    |
| `ENABLE_ABANDONED_CART`         | Server | Edge Function toggle                          |
| `SITE_URL`                      | Server | Edge Function callback URL                    |

---

## Seed Data

**Status: COMPLETE** — 895 lines of realistic Hungarian test data.

### Test Users (8)

| Email                | Role          | Name         |
| -------------------- | ------------- | ------------ |
| `admin@agency.test`  | admin         | Nagy Istvan  |
| `admin2@agency.test` | admin         | Szabo Anna   |
| `viewer@agency.test` | agency_viewer | Toth Peter   |
| `customer1@test.hu`  | customer      | Kovacs Maria |
| `customer2@test.hu`  | customer      | Kiss Janos   |
| `customer3@test.hu`  | customer      | Horvath Eva  |
| `customer4@test.hu`  | customer      | Varga Balazs |
| `customer5@test.hu`  | customer      | Molnar Kata  |

All passwords: `password123`

### Test Data Volume

| Entity                 | Count | Notes                                                                               |
| ---------------------- | ----- | ----------------------------------------------------------------------------------- |
| Categories             | 18    | 7 top-level + 11 subcategories, 1 inactive                                          |
| Products               | 15    | 14 active + 1 inactive, 5,990 — 99,990 HUF range                                    |
| Variants               | 62    | Multi-dimensional (Size + Color), single-dimension, single-variant. 1 out-of-stock. |
| Product-Category links | 28    | Multi-category assignments                                                          |
| Coupons                | 8     | Active, expired, exhausted, inactive, future, unrestricted                          |
| Orders                 | 12    | All statuses represented, both shipping methods, 3 coupons used, 1 guest order      |
| Order Items            | 15    | Multi-item orders included                                                          |
| Subscribers            | 10    | 9 subscribed + 1 unsubscribed, varied sources and tags                              |
| Audit Logs             | 12    | Various actions by different actors                                                 |

---

## Known Issues & Minor Gaps

These are small issues or architectural notes. All former "spec gaps" and "planned features" have been moved to the **Feature Roadmap** below with full enterprise-level specifications (see FE-000 through FE-044).

### Bugs

1. **Broken link in `/checkout/success`:** Links to `/account/orders` but the actual route is `/profile/orders`. ? Fixed in **FE-000**.
2. **robots.ts disallows wrong path:** Disallows `/account/` which doesn't exist. Should be `/profile/`. ? Fixed in **FE-000**.

### Architecture Notes

3. **Checkout/admin components are inline:** CheckoutStepper, AddressForm, ShippingMethodSelector, DataTable, StatusBadge, ConfirmDialog, ProductForm, OrderDetailPanel are all built inline within their respective pages rather than extracted as reusable standalone components. Functionally complete but not DRY. ? Addressed in **FE-005**.

### Documentation Inaccuracies

4. **Test file count mismatch:** PROJECT_STATUS.md claims 8 unit test files, but only 5 unique test files exist. Three claimed files (`cart-store.test.ts`, `coupon-schemas.test.ts`, `order-shipping-utils.test.ts`) do not exist in the codebase. Needs correction or the missing tests need to be written.

---

## Plan Tiers & Pricing

> **Key change:** Plan pricing is **NOT hardcoded** in the codebase. Prices are stored in the `shop_plans` table and can be overridden per client in `shop_subscriptions`. The values listed below are **recommended defaults** — the agency sets actual prices during client onboarding. Annual billing is supported with configurable discounts.

### Pricing Model

| Aspect                   | How it works                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base prices**          | Stored in `shop_plans.base_monthly_price` and `shop_plans.base_annual_price`. Set by agency admin.                                                                           |
| **Per-client overrides** | `shop_subscriptions.custom_monthly_price` / `custom_annual_price` override the base plan price for a specific client.                                                        |
| **Annual discount**      | Annual price is set directly (not a percentage). Discount is implicit: savings = (12 \* monthly) - annual. Typical range: 10-20% off.                                        |
| **Billing cycle**        | Monthly or annual. Stored on `shop_subscriptions.billing_cycle`. Can be switched by agency admin.                                                                            |
| **Effective price**      | `subscription.custom_*_price ?? plan.base_*_price` depending on billing cycle.                                                                                               |
| **Invoicing**            | Agency generates invoices for clients via the existing Billingo/Szamlazz adapter. Recorded in `subscription_invoices`.                                                       |
| **Feature gating**       | Plan features are defined in `shop_plans.features` jsonb. Per-client overrides in `shop_subscriptions.feature_overrides`. Runtime resolution via `getPlanFeatures()` helper. |
| **UI enforcement**       | Locked features show a lock icon + "Premium" badge in sidebar/UI. Server actions validate plan limits before writes.                                                         |

### Basic Plan — Recommended default: ~9,900 HUF/month (~99,900 HUF/year)

For shop owners who need a solid, legally compliant webshop with essential features.

**Core:**

- Unlimited registered customers
- 1 admin user
- Landing page with all sections
- About us page (structured builder)
- Blog (public + admin CRUD)
- Product catalog with admin CRUD (up to 500 products)
- Category management with nesting
- Product search with autocomplete
- Basic dashboard (revenue, orders, AOV, low stock)
- Profit tracking on dashboard (when cost_price data is available)
- Coupons
- Reviews
- Wishlist / Favorites

**Checkout & Shipping:**

- Guest checkout
- 2 delivery options besides MPL (one home delivery, one pickup point)
- Guest order tracking page

**Compliance & SEO:**

- Cookie consent banner (GDPR)
- 30-day price history (EU Omnibus Directive)
- Basic SEO (meta titles, descriptions, sitemap, robots.txt, JSON-LD, OG tags)
- Legal page templates (terms, privacy, cookie policy, shipping & returns)

**Payments & Invoicing:**

- Barion payment gateway
- Automatic invoicing via szamlazz.hu or Billingo

**Marketing & Communication:**

- Subscriber collection with tags + CSV export
- Admin order notification (single email address)
- Google Analytics 4 integration

**Operations:**

- Packing slip printing
- Product CSV export (import limited to 100 products)
- Manual refund tracking
- Back in stock notifications
- Basic related products (same-category fallback)

**Subscription management:**

- `/admin/subscription` page: view current plan, usage summary, billing history
- `/admin/subscription/plans` page: full plan comparison table with upgrade CTA

### Premium Plan — Recommended default: ~14,990 HUF/month (~149,900 HUF/year)

For shop owners who want marketing tools, advanced operations, and growth features.

**Everything in Basic, plus:**

**Marketing & Emails:**

- Email marketing with editor (1,000 emails/month, daily/weekly limits, pay-as-you-go overage)
- Automated email flows (abandoned cart, review request)
- Customer segmentation & tags (auto-tags: first_purchase, repeat_buyer, high_value, inactive_90d)
- Meta Pixel integration + custom analytics events

**Products & Sales:**

- Unlimited products
- Product CSV import (unlimited) + export
- Flash sales with countdown timers
- Product bundles / package deals
- Manual related products & cross-sell in cart
- Gift cards / digital vouchers
- Scheduled product publishing

**Operations:**

- Barion API refund + partial refunds
- Bulk admin actions (orders + products)
- Multiple admin notification recipients + daily digest
- Webhook system for external integrations

**Advanced:**

- B2B wholesale mode (custom pricing per customer)
- Advanced analytics (conversion funnels, product performance, CLV)
- Unlimited delivery options + weight tiers
- Advanced SEO (AI-generated metadata, editable by owner)
- Advanced user management (multiple admin accounts, granular permissions)
- Multi-currency support
- Loyalty points system
- Wishlist analytics (most-wishlisted products)
- Search analytics dashboard (top terms, zero-result queries)

### Features Included in All Plans (not gated)

These ship with every instance regardless of plan tier:

- Cookie consent & GDPR compliance
- 30-day price history (EU Omnibus Directive compliance)
- Guest order tracking
- Packing slip printing
- Legal page templates
- Barion payment gateway
- Invoicing (Billingo/Szamlazz)
- Basic SEO (sitemap, robots, meta, JSON-LD, OG)
- Profit tracking on dashboard (when cost data available)
- Subscription management pages (`/admin/subscription`, `/admin/subscription/plans`)

### Feature Gating UI Behavior

| Scenario                       | UI Treatment                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature not in current plan    | Nav item greyed out with lock icon + "Premium" badge. Clicking opens upsell modal: "Ez a funkció a Premium csomagban elérhető el" with CTA to comparison page. |
| Feature in plan but near limit | Subtle yellow warning badge (e.g., "450/500 termék"). Non-blocking.                                                                                            |
| Feature in plan but over limit | Hard block on creation. Server action returns error. UI shows: "Elérted a csomagod limitét. Frissíts a Premium csomagra!"                                      |
| Feature in plan and available  | Normal display, no badges or indicators.                                                                                                                       |

### Future: Enterprise / Agency Tier

Not for launch. Evaluate after 10+ active clients.

- Multi-store management from single agency dashboard
- White-label admin panel
- Multi-language support (HU + EN)
- Custom domain mapping & SSL provisioning
- Priority support SLA
- API access for headless storefront usage
- Dedicated Supabase project per client (vs shared)
- Custom integration development hours
