# Agency E-Commerce Boilerplate — Project Status & Roadmap

> **Last updated:** 2026-04-01
> **Codebase:** 11 commits, ~210 files, ~46,000 lines of code
> **Status:** Core boilerplate ~95% complete against original spec. All major flows functional end-to-end. **46 features** planned across 4 priority tiers (P0-P3) — 13 completed (FE-000, FE-002, FE-006, FE-007, FE-013, FE-018, FE-023, FE-025, FE-026, FE-029, FE-037, FE-044, FE-045). See Feature Roadmap.

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
    admin/           # DashboardCharts, OrderNotes
    auth/            # DevProfileSelector
    ui/              # 23 shadcn/ui primitives
  lib/
    actions/         # 10 server action files (51 exported functions)
    config/          # site.config.ts, hooks.ts
    integrations/    # barion/, email/, invoicing/
    security/        # roles.ts, rate-limit.ts, logger.ts, unsubscribe-token.ts
    supabase/        # server.ts, client.ts, admin.ts, middleware.ts
    store/           # Zustand cart store
    types/           # database.ts (842 lines), index.ts
    utils/           # format.ts, shipping.ts, price-history.ts, price-history-shared.ts
    validators/      # checkout.ts, coupon.ts, product.ts, subscriber.ts, uuid.ts
  proxy.ts           # Middleware (role-based route protection)
  supabase/
  migrations/        # 12 SQL migration files
  functions/         # Edge function (abandoned-cart)
  seed.sql           # 960 lines of test data
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

**Status: COMPLETE** — 12 migrations applied, 14 tables, 3 enums, 27 indexes, 45 RLS policies, 4 storage policies. **3 additional tables planned** (shop_plans, shop_subscriptions, subscription_invoices) + 1 new enum (subscription_status) + cost_price columns on products/variants.

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

| Column             | Type        | Constraints                                                                                                                                    |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | uuid PK     | DEFAULT gen_random_uuid()                                                                                                                      |
| `slug`             | text        | UNIQUE, NOT NULL                                                                                                                               |
| `title`            | text        | NOT NULL                                                                                                                                       |
| `description`      | text        | Nullable                                                                                                                                       |
| `base_price`       | int         | NOT NULL (HUF, no decimals)                                                                                                                    |
| `cost_price`       | int         | Nullable **(PLANNED)** — Purchasing/material cost per unit. Admin-only, never shown to customers. Used for profit calculations on dashboard.   |
| `compare_at_price` | int         | Nullable (strikethrough price)                                                                                                                 |
| `vat_rate`         | int         | NOT NULL, DEFAULT 27, CHECK (vat_rate IN (5, 18, 27)). Hungarian VAT rate used for invoicing.                                                  |
| `weight_grams`     | int         | Nullable. Product weight in grams for weight-based shipping. NULL = use defaultProductWeightGrams from config. Variant-level weight overrides. |
| `main_image_url`   | text        | Nullable                                                                                                                                       |
| `image_urls`       | text[]      | DEFAULT '{}'                                                                                                                                   |
| `is_active`        | boolean     | DEFAULT true                                                                                                                                   |
| `published_at`     | timestamptz | Nullable. NULL = immediately published (respects is_active). Future date = hidden from storefront until that time.                             |
| `created_at`       | timestamptz | DEFAULT now()                                                                                                                                  |
| `updated_at`       | timestamptz | DEFAULT now() (auto-trigger)                                                                                                                   |

Indexes: `idx_products_slug`, `idx_products_active` (partial WHERE true), `idx_products_price`, `idx_products_published_at` (partial WHERE published_at IS NOT NULL)
RLS: Public read (active only, AND published_at IS NULL OR published_at <= now()). Admin full. Agency viewer read.

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
| `weight_grams`   | int         | Nullable. Variant weight in grams. If set, overrides the product-level weight_grams for shipping calculations.                        |
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
| `payment_method`            | text         | DEFAULT 'barion', CHECK IN ('barion', 'cod')    |
| `cod_fee`                   | int          | DEFAULT 0. Utánvét kezelési díj.                |
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

Indexes: `idx_orders_user`, `idx_orders_email`, `idx_orders_status`, `idx_orders_created` (DESC), `idx_orders_barion` (partial WHERE NOT NULL), `idx_orders_payment_method`
RLS: Users read own (uid = user_id), insert own. Admin full. Agency viewer read.

#### 8. `order_items`

| Column                | Type    | Constraints                                                                                                      |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                  | uuid PK | DEFAULT gen_random_uuid()                                                                                        |
| `order_id`            | uuid    | FK to orders(id) ON DELETE CASCADE                                                                               |
| `product_id`          | uuid    | FK to products(id)                                                                                               |
| `variant_id`          | uuid    | FK to product_variants(id), nullable                                                                             |
| `title_snapshot`      | text    | NOT NULL                                                                                                         |
| `variant_snapshot`    | jsonb   | DEFAULT '{}'                                                                                                     |
| `unit_price_snapshot` | int     | NOT NULL                                                                                                         |
| `quantity`            | int     | NOT NULL                                                                                                         |
| `line_total`          | int     | NOT NULL                                                                                                         |
| `vat_rate`            | int     | NOT NULL, DEFAULT 27, CHECK (vat_rate IN (5, 18, 27)). Historical snapshot of product VAT rate at time of order. |

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

#### 11. `order_notes`

| Column       | Type        | Constraints                                     |
| ------------ | ----------- | ----------------------------------------------- |
| `id`         | uuid PK     | DEFAULT gen_random_uuid()                       |
| `order_id`   | uuid        | FK to orders(id) ON DELETE CASCADE, NOT NULL    |
| `author_id`  | uuid        | FK to profiles(id) ON DELETE SET NULL, NOT NULL |
| `content`    | text        | NOT NULL, CHECK char_length 1–2000              |
| `created_at` | timestamptz | NOT NULL, DEFAULT now()                         |

Indexes: `idx_order_notes_order` (order_id, created_at DESC), `idx_order_notes_author` (author_id)
RLS: Admin and agency_viewer read. Admin insert (author_id = auth.uid()). Admin delete own notes only.

#### 12. `shop_pages`

| Column         | Type        | Constraints               |
| -------------- | ----------- | ------------------------- |
| `id`           | uuid PK     | DEFAULT gen_random_uuid() |
| `page_key`     | text        | UNIQUE, NOT NULL          |
| `content`      | jsonb       | NOT NULL, DEFAULT '{}'    |
| `is_published` | boolean     | NOT NULL, DEFAULT false   |
| `created_at`   | timestamptz | NOT NULL, DEFAULT now()   |
| `updated_at`   | timestamptz | NOT NULL, DEFAULT now()   |

Indexes: `idx_shop_pages_key` (page_key)
RLS: Public SELECT (published only). Admin and agency_viewer SELECT (all). Admin INSERT/UPDATE/DELETE.
Trigger: `trg_shop_pages_updated_at` — auto-sets `updated_at` on UPDATE via `set_updated_at()`.

#### 13. `product_extras`

| Column               | Type        | Constraints                                            |
| -------------------- | ----------- | ------------------------------------------------------ |
| `id`                 | uuid PK     | DEFAULT gen_random_uuid()                              |
| `product_id`         | uuid        | FK to products(id) ON DELETE CASCADE, NOT NULL         |
| `extra_product_id`   | uuid        | FK to products(id) ON DELETE CASCADE, NOT NULL         |
| `extra_variant_id`   | uuid        | FK to product_variants(id) ON DELETE CASCADE, nullable |
| `label`              | text        | NOT NULL                                               |
| `is_default_checked` | boolean     | NOT NULL, DEFAULT false                                |
| `sort_order`         | int         | NOT NULL, DEFAULT 0                                    |
| `created_at`         | timestamptz | NOT NULL, DEFAULT now()                                |

Constraints: UNIQUE(product_id, extra_product_id), CHECK(product_id != extra_product_id)
Indexes: `idx_product_extras_product` (product_id, sort_order)
RLS: Public SELECT. Admin INSERT/UPDATE/DELETE.

#### 14. `price_history`

| Column             | Type        | Constraints                                            |
| ------------------ | ----------- | ------------------------------------------------------ |
| `id`               | uuid PK     | DEFAULT gen_random_uuid()                              |
| `product_id`       | uuid        | FK to products(id) ON DELETE CASCADE, NOT NULL         |
| `variant_id`       | uuid        | FK to product_variants(id) ON DELETE CASCADE, nullable |
| `price`            | int         | NOT NULL                                               |
| `compare_at_price` | int         | Nullable                                               |
| `recorded_at`      | timestamptz | NOT NULL, DEFAULT now()                                |

Indexes: `idx_price_history_product_recorded` (product_id, recorded_at DESC), `idx_price_history_variant_recorded` (variant_id, recorded_at DESC WHERE variant_id IS NOT NULL)
RLS: Public SELECT. Admin UPDATE/DELETE. No direct INSERT (populated by triggers only).
Trigger-populated: Rows are created automatically by `record_price_change` (on products) and `record_variant_price_change` (on product_variants) triggers when base_price/compare_at_price/price_override changes. A daily cleanup deletes records older than 90 days.

#### 15. `shop_plans` **(PLANNED)**

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

#### 16. `shop_subscriptions` **(PLANNED)**

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

#### 17. `subscription_invoices` **(PLANNED)**

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

| Function                        | Type                      | Purpose                                                                                                         |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `current_app_role()`            | STABLE, SECURITY DEFINER  | Returns app_role for auth.uid() from profiles. Fallback: 'customer'.                                            |
| `handle_new_user()`             | Trigger, SECURITY DEFINER | Auto-creates profiles row on auth.users INSERT with role='customer'.                                            |
| `set_updated_at()`              | Trigger                   | Sets updated_at = now() on UPDATE.                                                                              |
| `record_price_change()`         | Trigger, SECURITY DEFINER | Records product-level price changes to `price_history` when base_price or compare_at_price changes on products. |
| `record_variant_price_change()` | Trigger, SECURITY DEFINER | Records variant-level price changes to `price_history` when price_override changes on product_variants.         |
| `cleanup_old_price_history()`   | Scheduled (daily)         | Deletes `price_history` records older than 90 days.                                                             |

| Trigger                           | Table            | Event         |
| --------------------------------- | ---------------- | ------------- |
| `on_auth_user_created`            | auth.users       | AFTER INSERT  |
| `trg_products_updated_at`         | products         | BEFORE UPDATE |
| `trg_product_variants_updated_at` | product_variants | BEFORE UPDATE |
| `trg_orders_updated_at`           | orders           | BEFORE UPDATE |
| `trg_shop_pages_updated_at`       | shop_pages       | BEFORE UPDATE |
| `trg_record_price_change`         | products         | AFTER UPDATE  |
| `trg_record_variant_price_change` | product_variants | AFTER UPDATE  |

### Storage

- Bucket: `product-images` (public read, 5MB limit, JPEG/PNG/WebP/AVIF)
- 4 storage policies: public read, admin upload/update/delete
- **Upload server action:** `uploadProductImage(formData)` in `src/lib/actions/images.ts` — validates file type/size, uploads via service-role client to `products/{uuid}.{ext}`, returns public URL
- **Delete server action:** `deleteProductImage(url)` in `src/lib/actions/images.ts` — extracts file path from Supabase Storage URL, deletes from bucket. No-op for external URLs (safe to call on any URL).
- **Admin UI:** Drag-and-drop + click-to-browse image upload in product create/edit forms AND About Us page editor (hero image + team member photos). Storage deletion on remove/replace. Gallery drag-and-drop reordering with position badges.
- **next/image:** Supabase Storage hostname dynamically added to `images.remotePatterns` in `next.config.ts`

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

| Function                   | File                 | Purpose                                                                         |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `requireAuth()`            | roles.ts             | Returns authenticated user or throws (redirects to login)                       |
| `requireAdmin()`           | roles.ts             | Returns admin user or throws (blocks agency_viewer)                             |
| `requireAdminOrViewer()`   | roles.ts             | Returns admin or agency_viewer user                                             |
| `getCurrentProfile()`      | roles.ts             | Returns profile or null (non-throwing, for layouts)                             |
| `isAgencyViewer()`         | roles.ts             | Boolean check                                                                   |
| `RateLimiter` class        | rate-limit.ts        | In-memory rate limiter (subscribe: 5/60s, auth: 10/60s, orderTracking: 5/3600s) |
| `logAudit()`               | logger.ts            | Writes to audit_logs via admin client                                           |
| `signUnsubscribeToken()`   | unsubscribe-token.ts | HMAC-SHA256 signed token generation                                             |
| `verifyUnsubscribeToken()` | unsubscribe-token.ts | Token verification, returns email or null                                       |

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

**Status: COMPLETE** — All 12 storefront routes fully implemented.

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
- **Features:** Server fetch product + variants + categories + extras. Variant selector (buttons/chips, updates price and stock). Extra product checkboxes (FE-025, default-checked, out-of-stock handling). 30-day lowest price display for discounted products (FE-006, EU Omnibus Directive). Add to cart (client, includes checked extras as separate items). Gallery with main image + thumbnails. Breadcrumbs. SEO metadata per product. JSON-LD Product schema. Loading skeleton.
- **Components used:** ProductDetailClient, VariantSelector, Gallery, AddToCartButton, PriceDisplay, StockBadge, Breadcrumbs

### `/cart` (Shopping Cart)

- **File:** `src/app/(shop)/cart/page.tsx`
- **Type:** Client Component (Zustand store)
- **Features:** Cart persisted in localStorage. Quantity controls (increment/decrement). Remove item. Line item subtotals. Coupon input with server-side validation. Order summary (subtotal, shipping estimate with weight-based tiers, total weight display, discount, total). CTA to /checkout. Empty cart state.
- **Components used:** CartLineItem, CouponInput, OrderSummary

### `/checkout` (Multi-Step Checkout)

- **File:** `src/app/(shop)/checkout/page.tsx` (~1,130 lines)
- **Type:** Client Component (multi-step form)
- **Step 1 — Contact & Addresses:** Email, phone (+36 Hungarian validation), billing address (defaults to "same as delivery" via checked checkbox, can be overridden). If home delivery: full shipping address (street, city, zip). If pickup: billing address still required for invoicing.
- **Step 2 — Shipping Method:** Two distinct UX paths:
  - "Hazhozsz&aacute;ll&iacute;t&aacute;s" (Home Delivery): GLS, MPL, Express One. Requires street + city + zip + phone.
  - "Csomagautomata / &Aacute;tv&eacute;teli pont" (Pickup Point): Foxpost, GLS Automata, Packeta, MPL Automata, Easybox. Dropdown selector (hardcoded mock points). No home address needed; only locker ID + phone.
- **Step 3 — Review & Pay:** Payment method selector (Barion online card vs Utánvét / COD), order summary with COD fee if applicable, confirm, submit. COD availability governed by `siteConfig.payments.cod` (enabled, fee, maxOrderAmount, allowedShippingMethods). COD disabled if cart total exceeds `maxOrderAmount`.
- **On submit:** Server action validates cart against DB (prices, stock, active status). Creates order + order_items snapshots. Applies coupon if present. Decrements stock. Calculates shipping fee. If Barion: starts Barion payment, redirects to Barion. If COD: adds COD fee to total, sets order status to `processing`, sends receipt + admin notification emails immediately, redirects to success page with `?method=cod`.
- **Guest checkout:** Supported when `enableGuestCheckout` is true in config.

### `/checkout/success` (Order Confirmation)

- **File:** `src/app/(shop)/checkout/success/page.tsx`
- **Features:** Reads order ID and `method` from query params. Fetches order summary. Barion orders: shows "Sikeres fizetés!" with paid/processing status. COD orders: shows "Rendelés visszaigazolva!" with note about payment at delivery. CTA to `/profile/orders` (logged in) or `/products` (guest).

### `/checkout/cancel` (Payment Cancelled)

- **File:** `src/app/(shop)/checkout/cancel/page.tsx`
- **Features:** Cancellation message. Return to cart button.

### `/order-tracking` (Guest Order Tracking)

- **File:** `src/app/(shop)/order-tracking/page.tsx` (~362 lines)
- **Type:** Client Component (`useReducer` + `useSearchParams`, wrapped in `<Suspense>`)
- **Features:** Public order tracking for guest customers. Form with order number (8-char short ID or full UUID) + email. Server-side validation via `trackGuestOrder` action. Rate limited (5 per hour per IP). Displays order status card with: status badge, timeline visualization (COD-aware: processing → shipped → paid for COD, awaiting_payment → paid → processing → shipped for Barion), payment method, order details (items, totals, shipping method, tracking code). Pre-fillable via URL params (`?order=XXX&email=XXX`). Error handling for not-found, rate-limited, and validation errors.
- **Components used:** Input, Button, Badge, Card
- **Links to this page:** Footer "Rendeléskövetés" link, checkout success page (guest CTA), order receipt email CTA button

### `/cookie-policy` (Cookie Policy)

- **File:** `src/app/(shop)/cookie-policy/page.tsx`
- **Type:** Server Component
- **Features:** Static Hungarian-language cookie policy page. Details cookie types (necessary, analytics, marketing), data retention, user rights. Cookie settings button to reopen consent banner.

### `/about` (About Us)

- **File:** `src/app/(shop)/about/page.tsx` (~288 lines)
- **Type:** Server Component
- **Features:** Structured About Us page with 5 sections: Hero (title, subtitle, image), Story (title, body text), Team (grid of members with photo, name, role, bio), Values (numbered cards with title and description), Contact (address, phone, email, Google Maps embed). Sections with empty content are hidden. Content loaded from `shop_pages` table via `getPageContent("about")` action. Fallback state for unpublished/no content.
- **Components used:** Image, Link (lucide icons for contact)

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

**Status: COMPLETE** — All 13 admin pages fully implemented with agency_viewer read-only enforcement. **3 additional pages planned** (subscription, agency/clients, subscription/plans).

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
- **Export (FE-026):** "Exportálás" button opens dialog with date range picker, status filter select, and "Tételek részletezése" checkbox. Generates CSV with UTF-8 BOM (Excel-compatible). Includes: order number, date, status, customer name/email, shipping method/fee, subtotal, discount, total, payment method, COD fee, payment status, item count, shipping address, tracking number. Optional line-items section with product title, variant, SKU, quantity, unit price, line total, ÁFA kulcs (VAT rate).

### `/admin/orders/[id]` (Order Detail)

- **Sections:** Customer contact info, shipping address/method, billing address, line items table, payment details (payment method, COD fee if applicable, Barion details for online payments), internal notes
- **Status timeline:** Visual state machine showing order progression. COD-aware status transitions: shipped → paid allowed for COD orders (courier collects payment). Barion orders: shipped is terminal.
- **Actions (admin only):** Change status dropdown (context-aware: COD vs Barion transitions), add tracking code (when marking shipped), send receipt email, send shipping update email, generate invoice (if invoicing provider enabled)
- **Internal notes:** Admin-only note system for internal communication. Add/delete notes with 2000-char limit. Author name resolution from profiles. Reverse chronological display. Agency viewers see notes read-only.
- **Agency viewer:** All action buttons hidden. Read-only view.

### `/admin/products` (Product List)

- Paginated table with search, active/inactive filter
- Columns: thumbnail, title, base price, variant count, category badges, status badge (Aktív/Inaktív/Ütemezett with date — 3-state badge logic)
- Sort controls
- "New product" button links to `/admin/products/new`

### `/admin/products/new` (Product Create)

- **Two-column layout:** Left column (main fields), right column (metadata)
- **Fields:** Title, auto-generated slug (editable), description (textarea), base price (HUF), compare-at price, ÁFA kulcs (VAT rate) dropdown (27%/18%/5%)
- **Planned field:** Cost price (HUF) — optional purchasing/material cost. Labeled "Beszerzesi ar" in Hungarian. Admin-only, never visible to customers. Shown in a collapsible "Koltseginformaciok" (Cost Information) section to keep the form clean.
- **Images:** Drag-and-drop / click-to-browse image upload for main image + gallery images. Uploads to Supabase Storage `product-images` bucket. Storage deletion on remove/replace. Gallery drag-and-drop reordering with position badges. Also supports manual URL entry as fallback.
- **Categories:** Checkbox multi-select from all categories
- **Variant builder:** Dynamic rows. Each row: SKU, option1 name/value, option2 name/value, price override, stock quantity. Add/remove rows. **Planned:** Per-variant cost price override field in each row.
- **Extras builder (FE-025):** "Kiegészítő termékek" Card section. Search existing products, attach as extras with custom label, sort order, and default-checked toggle. Delete-and-recreate pattern on save.
- **Scheduled publishing (FE-037):** datetime-local input in Státusz card. Empty = published immediately. Future date = product hidden from storefront until that time.
- **Save:** Server action with full Zod validation, creates product + variants + category associations + extras + audit log

### `/admin/products/[id]` (Product Edit)

- Same form as create, pre-populated (including extras and scheduled publishing state)
- Additional actions: Toggle active/inactive, hard delete with confirmation dialog
- **Price history sparkline (FE-006):** Read-only SVG sparkline (~120px × 32px) rendered next to base price input. Shows 30-day price trend with color-coded direction (green/red/neutral). Hover tooltip with price + date. Fetched via `getProductPriceHistory` server action.
- Meta info display: created at, updated at, product ID
- "Ütemezett" badge shown when product has a future `published_at` date

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

### `/admin/pages/about` (About Us Page Editor)

- **File:** `src/app/(admin)/admin/pages/about/page.tsx` (~520 lines)
- **Type:** Client Component (`useReducer` state management)
- **Features:** Structured editor for the About Us page content. 5 collapsible sections (hero, story, team, values, contact). Team member add/remove (max 20). Values add/remove (max 12). Image upload via `SingleImageUpload` component for hero image and team member photos (drag-and-drop, click-to-browse, manual URL fallback, storage deletion). Character counters. Dirty state tracking with unsaved changes warning. Save button (calls `adminUpdatePageContent`). Publish/unpublish toggle (calls `adminTogglePagePublished`). External preview link to `/about`. Loading state with spinner. Error/success toast feedback via Sonner.
- **Nav:** "Oldalak" link in admin sidebar (`BookOpen` icon)

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
- **Navigation items:** Feature-flag-driven (marketing only shows if `enableMarketingModule` is true, coupons only if `enableCoupons` is true). "Oldalak" link to `/admin/pages/about` (always visible).
- **Planned nav items:** "Előfizetés" (Subscription) link to `/admin/subscription` for all admin roles. "Ügyfelek" (Clients) link to `/admin/agency/clients` visible only to `agency_admin` users.
- **Agency viewer:** Yellow "Csak olvasas" (Read-only) badge in sidebar
- **Footer links:** "Vissza a boltba" (Back to shop) + "Kijelentkezes" (Sign out)

---

## Server Actions

**Status: COMPLETE** — 12 action files, 61 exported functions, all with Zod validation.

### `src/lib/actions/products.ts` (1150 lines)

| Function                            | Guard                | What it does                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listProducts(filters)`             | Public               | Server-side filtered/sorted/paginated product listing. Filters: category, price range, stock, sort. Joins variants and categories. Filters by `published_at IS NULL OR published_at <= now()` (defense-in-depth on top of RLS). |
| `getProductBySlug(slug)`            | Public               | Fetches single product with all variants, categories, and extras. Active products only. Filters by `published_at` (defense-in-depth). Enriches extras with live product data.                                                   |
| `adminListProducts(filters)`        | requireAdminOrViewer | Lists ALL products (including inactive and scheduled). Search, filter, paginate.                                                                                                                                                |
| `adminGetProduct(id)`               | requireAdminOrViewer | Single product with variants, categories, and extras (any status). Enriches extras with live product data.                                                                                                                      |
| `adminCreateProduct(formData)`      | requireAdmin         | Creates product + variants + category associations + extras. FormData-based. Parses `vatRate` (default 27) and `publishedAt` (nullable datetime). Auto-generates slug. Validates with Zod. Audit logged.                        |
| `adminUpdateProduct(formData)`      | requireAdmin         | Updates product fields (including `vat_rate`, `published_at`), syncs variants (upsert/delete), syncs categories, syncs extras (delete-and-recreate). Audit logged.                                                              |
| `adminDeleteProduct(id)`            | requireAdmin         | Soft delete (is_active = false). Audit logged.                                                                                                                                                                                  |
| `adminToggleProductActive(id)`      | requireAdmin         | Toggle active state. Audit logged.                                                                                                                                                                                              |
| `adminHardDeleteProduct(id)`        | requireAdmin         | Permanent delete with cascade. Audit logged.                                                                                                                                                                                    |
| `getProductExtras(productId)`       | Public               | Fetches extras for a product with enriched product/variant data (title, slug, price, image, stock, active status). Uses `enrichExtras()` helper.                                                                                |
| `adminSetProductExtras(id, extras)` | requireAdmin         | Standalone extras save: validates with Zod, blocks self-reference, delete-and-recreate pattern. Audit logged with extras count.                                                                                                 |
| `getProductPriceHistory(productId)` | requireAdminOrViewer | Fetches 30-day price history for admin sparkline chart. Returns array of `{price, compareAtPrice, date}` sorted chronologically. Uses `getPriceHistory()` utility.                                                              |

### `src/lib/actions/orders.ts` (1268 lines)

| Function                                             | Guard                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOrderFromCart(input)`                         | requireAuth (or guest if enabled) | Full checkout flow: validates cart items against DB (prices, stock, active status), applies coupon, calculates shipping fee, decrements stock, creates order + order_items snapshots (includes `vat_rate` per item), handles payment method (Barion: status `awaiting_payment`, COD: status `processing` + adds `cod_fee` + sends receipt/admin emails immediately), runs preCheckoutHook/postPaidHook. Returns order ID. |
| `getOrderForUser(orderId)`                           | requireAuth                       | Fetches order with items, filtered by both order ID and authenticated user ID.                                                                                                                                                                                                                                                                                                                                            |
| `adminListOrders(filters)`                           | requireAdminOrViewer              | All orders with filters (status, date range, search by email/order ID). Paginated.                                                                                                                                                                                                                                                                                                                                        |
| `adminGetOrder(id)`                                  | requireAdminOrViewer              | Single order with items.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `adminUpdateOrderStatus(orderId, status, tracking?)` | requireAdmin                      | Server-side enforced forward-only status transitions via `isTransitionAllowed()` from shared constants. Payment-method-aware (Barion vs COD have different transition maps). Fetches `payment_method` from order before validating. Sets paid_at/shipped_at timestamps. Stores tracking code in `tracking_code` field. Returns descriptive Hungarian error on invalid transition. Audit logged.                           |
| `trackGuestOrder(input)`                             | Public (rate-limited)             | Guest order tracking: validates order number (8-char short ID or full UUID) + email via Zod. Uses admin client (bypasses RLS). Matches on `id` prefix + `email`. Rate limited: 5 per hour per IP. Returns limited order data with timeline.                                                                                                                                                                               |
| `getOrderNotes(orderId)`                             | requireAdminOrViewer              | Fetches all notes for an order with author names resolved from profiles. Reverse chronological. Returns `OrderNoteWithAuthor[]`.                                                                                                                                                                                                                                                                                          |
| `addOrderNote(orderId, content)`                     | requireAdmin                      | Creates a new internal note on an order. Validates order exists. Resolves author name from profile. Audit logged. Returns the created note with author name.                                                                                                                                                                                                                                                              |
| `deleteOrderNote(noteId)`                            | requireAdmin                      | Deletes an internal note. Ownership check (only own notes). Audit logged.                                                                                                                                                                                                                                                                                                                                                 |
| `exportOrdersCsv(filters)`                           | requireAdminOrViewer              | Exports orders to CSV with date range and status filters. UTF-8 BOM for Excel. Includes payment method and COD fee columns. Optional line-items section (includes ÁFA kulcs per item). Max 10,000 orders. Returns CSV string + filename + order count.                                                                                                                                                                    |

### `src/lib/actions/cart.ts` (300 lines)

| Function                      | Guard                  | What it does                                                                                                                                                          |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateCart(items)`         | Public (server action) | Validates cart items against DB: checks product exists, is active, variant exists, price matches, stock available. Returns normalized line items with correct totals. |
| `applyCoupon(code, subtotal)` | Public (server action) | Validates coupon: exists, active, within date range, not exhausted, meets minimum order. Returns discount amount.                                                     |

### `src/lib/actions/payments.ts` (122 lines)

| Function                      | Guard       | What it does                                                                                                                                                                |
| ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startPaymentAction(orderId)` | requireAuth | Fetches order, guards against COD orders (returns error), calls Barion startPayment, stores barion_payment_id and barion_payment_request_id on order, returns redirect URL. |

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

### `src/lib/actions/pages.ts` (264 lines)

| Function                                              | Guard                | What it does                                                                                           |
| ----------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `getPageContent(pageKey)`                             | Public               | Fetches published page content by key from `shop_pages`. Returns structured `AboutUsContent` or error. |
| `adminGetPageContent(pageKey)`                        | requireAdminOrViewer | Fetches page content including unpublished. Returns empty default content if page doesn't exist yet.   |
| `adminUpdatePageContent(pageKey, content, published)` | requireAdmin         | Upserts structured page content with full Zod validation. Logs audit event `page.update`.              |
| `adminTogglePagePublished(pageKey)`                   | requireAdmin         | Toggles `is_published` flag on existing page. Logs audit event `page.publish` or `page.unpublish`.     |

### `src/lib/actions/images.ts` (~150 lines)

| Function                       | Guard        | What it does                                                                                                                                                                                      |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadProductImage(formData)` | requireAdmin | Uploads a single image to Supabase Storage `product-images` bucket. Validates file type (JPEG/PNG/WebP/AVIF) and size (5 MB). Returns public URL.                                                 |
| `deleteProductImage(url)`      | requireAdmin | Deletes an image from the `product-images` bucket. Extracts file path from Supabase Storage URL pattern. No-op for external URLs (returns success). Called automatically on image remove/replace. |

---

## Integrations

**Status: COMPLETE** — All 3 integrations fully implemented with production-ready patterns.

### Barion (Payments)

| File                 | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `barion/client.ts`   | 239   | API client: `startPayment()`, `getPaymentState()`, `verifyPayment()`. Test/prod URL switching. Full type definitions for Barion API request/response.                                                                                                                                                                                                  |
| `barion/callback.ts` | 298   | Idempotent callback handler: verifies payment with Barion API, finds order by payment ID, skips if already in terminal state, decrements stock on success (with negative-stock guard, clamps to 0), updates order status + timestamps, sends receipt + admin notification emails (with payment method). Race condition protected via status IN clause. |

**Flow (Barion):** Checkout -> createOrderFromCart (status: `awaiting_payment`) -> startPaymentAction (calls Barion API, gets redirect URL) -> User pays on Barion -> Barion calls `/api/payments/barion/callback` -> handleBarionCallback (idempotent, updates order status, decrements stock, sends receipt + admin emails).

**Flow (COD / Utánvét):** Checkout -> createOrderFromCart (status: `processing`, adds `cod_fee`) -> sends receipt + admin notification emails immediately -> redirects to success page with `?method=cod`. Admin ships order -> courier collects payment -> admin marks order as `paid`.

### Resend (Email)

| File                  | Lines  | Purpose                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email/provider.ts`   | ~150   | `sendEmail()` with retry + exponential backoff. `sendBatchEmail()` (50/chunk). Sender address config (transactional vs marketing). Test recipient redirect for dev.                                                                                                                                                                                                                                            |
| `email/sender.ts`     | ~100   | High-level sending functions: `sendTransactionalEmail()`, `sendMarketingEmail()`. Handles sender identity separation.                                                                                                                                                                                                                                                                                          |
| `email/actions.ts`    | ~400   | `sendReceipt(orderId)`, `sendShippingUpdate(orderId)`, `sendAbandonedCartEmail(orderId)`, `renderNewsletterPreview(data)`, `sendNewsletterCampaign(data)`, `sendSignupConfirmationEmail({to, name})`, `sendWelcomeEmail({to, name})`, `sendAdminOrderNotification({..., paymentMethod?})`. All actions respect feature flags in `siteConfig.email`. Admin notification includes optional payment method label. |
| `email/templates.tsx` | ~1,216 | React Email render wrappers for all 7 templates. All styled with inline CSS, responsive, include unsubscribe links where needed.                                                                                                                                                                                                                                                                               |
| `email/webhook.ts`    | ~150   | `handleWebhookEvent()`: processes bounce (marks subscriber bounced), complaint (marks complained), delivered (updates stats), opened (increments open_count), clicked (increments click_count). `verifyWebhookSignature()` via HMAC.                                                                                                                                                                           |

### Invoicing (Billingo / Szamlazz)

| File                   | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoicing/adapter.ts` | 415   | Strategy pattern interface: `InvoicingAdapter` with `createInvoice()`, `getInvoice()`, `cancelInvoice()`. Three implementations: `BillingoAdapter` (REST API calls, per-item VAT rate via `billingoVatString()`, dynamic `payment_method`: "cash_on_delivery" for COD / "online_bankcard" for Barion, COD fee as separate line item), `SzamlazzAdapter` (XML API calls, per-item VAT rate and net price, dynamic `<fizmod>`: "Utánvét" for COD / "Bankkártya (online)" for Barion, COD fee as XML line item), `NullAdapter` (no-op fallback). Helper functions: `billingoVatString()`, `grossToNet()`, `grossToVat()`. Factory: `getInvoicingAdapter()` reads `INVOICING_PROVIDER` env var. Dev mode mock fallbacks. |

**Planned: Subscription invoicing reuse.** The existing `InvoicingAdapter` strategy pattern will be reused for generating subscription/plan invoices for agency clients. When the agency admin clicks "Szamla keszitese" on `/admin/agency/clients`, it calls the same `getInvoicingAdapter().createInvoice()` with subscription billing data instead of order data. This requires a thin wrapper function (e.g., `createSubscriptionInvoice(subscriptionId, billingPeriod)`) that maps `subscription_invoices` data to the adapter's `InvoiceInput` format. No changes to the adapter interface itself — only a new caller.

---

## API Route Handlers

**Status: COMPLETE** — 5 endpoints.

| Route                           | Method     | Auth               | Purpose                                                                                                           |
| ------------------------------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/api/payments/barion/callback` | GET        | None (Barion S2S)  | Barion payment callback. Always returns 200. Idempotent via order status check.                                   |
| `/api/email/webhook/resend`     | POST + GET | HMAC signature     | Resend webhook receiver. Processes bounce/complaint/delivered/opened/clicked. GET returns debug info in dev only. |
| `/api/email/abandoned-cart`     | POST       | CRON_SECRET header | Triggered by Edge Function. Sends abandoned cart email for a specific order.                                      |
| `/api/newsletter/unsubscribe`   | GET        | Signed token       | One-click unsubscribe. Renders Hungarian HTML confirmation page. Idempotent.                                      |
| `/api/dev/test-emails`          | GET        | Dev only           | Renders all email templates and sends to local Mailpit for visual QA. Returns 404 in production.                  |

### Edge Function

| Function         | Location                                                 | Purpose                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abandoned-cart` | `supabase/functions/abandoned-cart/index.ts` (132 lines) | Scheduled cron (30 min). Finds draft/awaiting_payment orders older than 2 hours with no abandoned_cart_sent_at. Posts to Next.js API for each (max 50/run). Stamps sent_at after success. |

---

## Components Inventory

**Status: COMPLETE** — 53 component files total.

### Shared Components (10)

| Component             | File                                    | Type   | Purpose                                                                                                                                      |
| --------------------- | --------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                | `shared/header.tsx`                     | Server | Auth-aware. Shows role-appropriate account link: Login (guest), Fiokom (customer), Admin (admin/viewer). Mobile sheet nav. Cart count badge. |
| Footer                | `shared/footer.tsx`                     | Server | Site links, legal links, newsletter signup, copyright.                                                                                       |
| AdminSidebar          | `shared/admin-sidebar.tsx`              | Client | 260px collapsible sidebar. Feature-flag-driven nav items. Agency viewer badge. Back to shop + sign out links. Mobile sheet.                  |
| Breadcrumbs           | `shared/breadcrumbs.tsx`                | Client | Configurable breadcrumb trail.                                                                                                               |
| CartCount             | `shared/cart-count.tsx`                 | Client | Cart item count badge in header.                                                                                                             |
| LoadingSkeleton       | `shared/loading-skeleton.tsx`           | Server | Reusable skeleton placeholders.                                                                                                              |
| NewsletterForm        | `shared/newsletter-form.tsx`            | Client | Email input + subscribe button. Calls subscribe server action. Toast feedback.                                                               |
| CookieConsent         | `cookie-consent.tsx`                    | Client | GDPR cookie consent banner with accept all, reject, and settings toggles. Slide-up animation. Persisted to localStorage.                     |
| CookieSettingsButton  | `shared/cookie-settings-button.tsx`     | Client | Floating button to reopen cookie consent settings. Used on cookie policy page.                                                               |
| CookieConsentProvider | `providers/cookie-consent-provider.tsx` | Client | Context provider for cookie consent state. Wraps app in root layout.                                                                         |

### Product Components (9)

| Component           | File                                | Type   | Purpose                                                                                                                                                                                          |
| ------------------- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ProductCard         | `product/product-card.tsx`          | Server | Card with image, title, price, compare-at price, category badges. Link to product detail.                                                                                                        |
| ProductGrid         | `product/product-grid.tsx`          | Server | Responsive grid of ProductCards.                                                                                                                                                                 |
| ProductDetailClient | `product/product-detail-client.tsx` | Client | Full product detail with variant state, price updates, extras checkboxes (FE-025), 30-day lowest price resolution per variant (FE-006), add to cart.                                             |
| ProductFilters      | `product/product-filters.tsx`       | Client | Category select, price range, in-stock toggle, sort select. Updates URL params.                                                                                                                  |
| VariantSelector     | `product/variant-selector.tsx`      | Client | Button/chip-based variant selection. Updates parent state.                                                                                                                                       |
| Gallery             | `product/gallery.tsx`               | Client | Main image + thumbnail strip. Click to switch.                                                                                                                                                   |
| AddToCartButton     | `product/add-to-cart-button.tsx`    | Client | Button with loading state. Calls Zustand addItem + adds checked extras as separate cart items. Toast confirmation with extras count.                                                             |
| PriceDisplay        | `product/price-display.tsx`         | Server | Formats HUF price. Shows strikethrough for compare-at. EU Omnibus Directive: displays "Legalacsonyabb ár az elmúlt 30 napban" text with lowest 30-day price when product is discounted (FE-006). |
| StockBadge          | `product/stock-badge.tsx`           | Server | Green/yellow/red badge based on stock level.                                                                                                                                                     |

### Cart/Checkout Components (4)

| Component           | File                             | Type   | Purpose                                                                                                                    |
| ------------------- | -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| CartLineItem        | `cart/cart-line-item.tsx`        | Client | Thumbnail, title, variant info, unit price, quantity controls, remove button, line total.                                  |
| CouponInput         | `cart/coupon-input.tsx`          | Client | Input + apply button. Calls applyCoupon server action. Shows discount amount or error.                                     |
| OrderSummary        | `cart/order-summary.tsx`         | Client | Subtotal, shipping fee, COD fee (optional, shown when > 0 as "Utánvét kezelési díj"), discount, total.                     |
| PickupPointSelector | `cart/pickup-point-selector.tsx` | Client | Dropdown selector for pickup points. Currently uses hardcoded mock data. Interface ready for real carrier API integration. |

### Admin Components (5)

| Component        | File                           | Type   | Purpose                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DashboardCharts  | `admin/dashboard-charts.tsx`   | Client | Recharts bar charts for daily revenue + daily order count.                                                                                                                                                                                                                                                                                           |
| OrderStatusBadge | `admin/order-status-badge.tsx` | Shared | Single source of truth for order status badge display. Uses `ORDER_STATUS_LABELS` and `ORDER_STATUS_BADGE_VARIANT` from `@/lib/constants/order-status`. Works in both Server Components and Client Components. Replaces 8+ inline StatusBadge duplications across admin/shop pages.                                                                  |
| OrderNotes       | `admin/order-notes.tsx`        | Client | Internal notes panel for order detail. Add/delete notes (admin), read-only for agency viewers. 2000-char limit. Author name resolution. useReducer state management.                                                                                                                                                                                 |
| ImageUpload      | `admin/image-upload.tsx`       | Client | `SingleImageUpload` + `GalleryImageUpload` — drag-and-drop / click-to-browse image upload. Uploads via `uploadProductImage` server action. Storage deletion on remove/replace via `deleteProductImage`. Gallery drag-and-drop reordering (HTML5 native) with position badges and visual drop indicator. Manual URL entry fallback. useReducer state. |
| PriceSparkline   | `admin/price-sparkline.tsx`    | Client | Lightweight SVG sparkline (~120px × 32px) for 30-day price history. Color-coded trend (green = decreasing, red = increasing, neutral = stable). Hover tooltip with price + date. Rendered next to base price input on admin product edit page. Uses `PriceHistoryPoint` type from `price-history-shared.ts`.                                         |

### Auth Components (1)

| Component          | File                            | Type   | Purpose                                                                           |
| ------------------ | ------------------------------- | ------ | --------------------------------------------------------------------------------- |
| DevProfileSelector | `auth/dev-profile-selector.tsx` | Client | Dev-only role switcher. Buttons for admin, viewer, customer roles. Quick sign-in. |

### UI Primitives (shadcn/ui) — 24 components

alert-dialog, badge, breadcrumb, button, card, chart, checkbox, command, dialog, dropdown-menu, input, input-group, label, pagination, popover, radio-group, select, separator, sheet, skeleton, sonner, table, tabs, textarea

---

## Email Templates

**Status: COMPLETE** — 7 React Email templates, all styled, responsive, Hungarian language.

| Template                 | File                           | Lines | Content                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Order Receipt            | `order-receipt.tsx`            | 520   | Order confirmation with line items table, shipping/billing addresses, payment method display ("Online bankkártya" / "Utánvét"), COD fee in totals if applicable, totals breakdown, tracking CTA button (pre-fills order number + email on tracking page), shop contact info. COD orders show "Feldolgozás alatt" status, Barion orders show "Fizetve". |
| Shipping Update          | `shipping-update.tsx`          | 287   | Shipping notification with tracking code, carrier name, estimated delivery, order summary.                                                                                                                                                                                                                                                             |
| Abandoned Cart           | `abandoned-cart.tsx`           | 274   | Cart recovery prompt with product list, subtotal, CTA button to resume checkout.                                                                                                                                                                                                                                                                       |
| Newsletter               | `newsletter.tsx`               | 215   | Marketing template with headline, body, CTA button, unsubscribe link (HMAC-signed).                                                                                                                                                                                                                                                                    |
| Signup Confirmation      | `signup-confirmation.tsx`      | ~140  | "Sikeres regisztráció" — sent after email+password signup. Login CTA button.                                                                                                                                                                                                                                                                           |
| Welcome                  | `welcome.tsx`                  | ~140  | "Üdvözlünk!" — sent on first sign-in (OAuth or email confirm). Products CTA button.                                                                                                                                                                                                                                                                    |
| Admin Order Notification | `admin-order-notification.tsx` | ~190  | Info-dense admin notification with order details table (customer, items, total, shipping, payment method). Sent when order is paid (Barion) or immediately on order creation (COD).                                                                                                                                                                    |

All templates use inline CSS for email client compatibility, are mobile-responsive, and include the shop's branding from siteConfig.

---

## Configuration System

**Status: COMPLETE** (base config). **Planned: Plan-based feature gating layer.**

### `src/lib/config/site.config.ts` (~260 lines)

Fully typed `SiteConfig` with these sections:

| Section                   | Key Settings                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **store**                 | name: "Agency Store", legalName: "Agency Kft.", currency: HUF, Budapest address, phone, email                                                                                                                                                                                |
| **urls**                  | siteUrl (from env), supportEmail                                                                                                                                                                                                                                             |
| **features**              | enableAccounts: true, enableGuestCheckout: true, enableCoupons: true, enableReviews: false (scaffold only), enableMarketingModule: true, enableAbandonedCart: true, enableB2BWholesaleMode: false                                                                            |
| **payments**              | provider: "barion", environment from env (test/prod), posKey env var name, redirectUrls. **COD config:** `cod.enabled: true`, `cod.fee: 590` (HUF surcharge), `cod.maxOrderAmount: 100_000` (orders above must pay online), `cod.allowedShippingMethods: ["home", "pickup"]` |
| **shipping.homeDelivery** | enabled: true, carriers: GLS, MPL, Express One                                                                                                                                                                                                                               |
| **shipping.pickupPoint**  | enabled: true, carriers: Foxpost, GLS Automata, Packeta, MPL Automata, Easybox                                                                                                                                                                                               |
| **shipping.rules**        | baseFee: 1490, freeOver: 15000, defaultProductWeightGrams: 500, weightTiers: [{maxWeightKg:2, fee:1490}, {maxWeightKg:5, fee:1990}, {maxWeightKg:10, fee:2990}, {maxWeightKg:20, fee:4490}]                                                                                  |
| **invoicing**             | provider from env (default "none"), mode: "manual"                                                                                                                                                                                                                           |
| **admin**                 | agencyViewerEnabled: true, readonlyByDefaultForAgency: true                                                                                                                                                                                                                  |
| **email**                 | adminNotificationRecipients: [ADMIN_EMAIL env], sendSignupConfirmation: true, sendWelcomeEmail: true, sendAdminOrderNotification: true                                                                                                                                       |
| **branding**              | logoText: "AGENCY", neutral black/white theme tokens                                                                                                                                                                                                                         |
| **tax**                   | defaultVatRate: 27, availableRates: [5, 18, 27]. Used by product validators and invoicing adapters.                                                                                                                                                                          |

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

| File                       | Schemas                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `validators/checkout.ts`   | addressSchema, contactSchema, homeDeliverySchema, pickupPointSchema, checkoutSchema (includes `paymentMethod: z.enum(["barion", "cod"])`) |
| `validators/coupon.ts`     | couponCreateSchema, couponApplySchema                                                                                                     |
| `validators/product.ts`    | vatRateSchema, variantSchema, productCreateSchema, productUpdateSchema                                                                    |
| `validators/subscriber.ts` | subscribeSchema, unsubscribeSchema, tagSchema                                                                                             |
| `validators/uuid.ts`       | uuidSchema                                                                                                                                |

Plus 15+ inline Zod schemas in individual action files.

---

## SEO & Performance

**Status: COMPLETE**

| Feature           | Status | Details                                                                                                                                                                                                                                 |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic sitemap   | DONE   | `src/app/sitemap.ts` — includes all active products (limit 5000, filtered by published_at), categories (limit 500), and 5 static pages. Priority weighting: home 1.0, products 0.9, individual products 0.8, categories 0.7, legal 0.3. |
| robots.txt        | DONE   | `src/app/robots.ts` — allows all crawlers on `/`. Disallows `/admin/`, `/api/`, `/checkout/`, `/account/`. Points to sitemap.                                                                                                           |
| Per-page metadata | DONE   | Custom title/description on every route. Product pages have dynamic metadata from DB.                                                                                                                                                   |
| JSON-LD           | DONE   | Product structured data on `/products/[slug]` (Product schema with name, description, price, availability, image).                                                                                                                      |
| OpenGraph         | DONE   | Product pages include og:title, og:description, og:image.                                                                                                                                                                               |
| next/image        | DONE   | Used for product images with placeholder blur.                                                                                                                                                                                          |
| Loading skeletons | DONE   | `loading.tsx` files for products list and product detail pages.                                                                                                                                                                         |

---

## Testing

**Status: COMPLETE** — Unit, integration, and E2E tests.

### Unit Tests (Vitest) — 15 test files

| Test File                      | Location           | What it tests                                                                                                                                                                                                                  |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cart-math.test.ts`            | tests/unit/        | Cart subtotal calculation, quantity updates, item removal                                                                                                                                                                      |
| `coupon-validation.test.ts`    | tests/unit/        | Coupon validity checks (dates, usage limits, min order, active status)                                                                                                                                                         |
| `order-totals.test.ts`         | tests/unit/        | Order total calculation with discounts and shipping                                                                                                                                                                            |
| `shipping.test.ts`             | tests/unit/        | Shipping fee calculation, free shipping threshold, weight tier lookup (getWeightTierFee), weight-based carrier fees, tier boundaries                                                                                           |
| `cart-store.test.ts`           | src/\_\_tests\_\_/ | Zustand cart store integration (add, remove, update, clear, persistence)                                                                                                                                                       |
| `coupon-schemas.test.ts`       | src/\_\_tests\_\_/ | Zod coupon schema validation                                                                                                                                                                                                   |
| `order-shipping-utils.test.ts` | src/\_\_tests\_\_/ | Order and shipping utility functions                                                                                                                                                                                           |
| `checkout-validation.test.ts`  | src/\_\_tests\_\_/ | Checkout form Zod schema validation                                                                                                                                                                                            |
| `email-actions.test.ts`        | src/\_\_tests\_\_/ | Email action functions: signup confirmation, welcome, admin notification (15 tests)                                                                                                                                            |
| `order-notes.test.ts`          | src/\_\_tests\_\_/ | Order note CRUD actions: getOrderNotes, addOrderNote, deleteOrderNote (13 tests)                                                                                                                                               |
| `product-extras.test.ts`       | src/\_\_tests\_\_/ | Product extras CRUD: getProductExtras (6 tests), adminSetProductExtras (9 tests)                                                                                                                                               |
| `order-export.test.ts`         | src/\_\_tests\_\_/ | Order CSV export: filters, BOM, escaping, line items, empty results (16 tests)                                                                                                                                                 |
| `vat-rate.test.ts`             | src/\_\_tests\_\_/ | VAT rate management: Zod validation, product create/update, invoicing helpers, TaxConfig, CSV export (21 tests)                                                                                                                |
| `scheduled-publishing.test.ts` | src/\_\_tests\_\_/ | Scheduled publishing: publishedAt parsing, create/update actions, public query filters, sitemap filter (15 tests)                                                                                                              |
| `price-history.test.ts`        | src/\_\_tests\_\_/ | 30-day price history (FE-006): resolveLowest30DayPrice pure function (6 tests), getLowest30DayPrice server query (6 tests), getLowest30DayPriceMap batch grouping (3 tests), getPriceHistory chronological retrieval (5 tests) |

### Integration Tests (Vitest) — 1 test file

| Test File              | Location                       | What it tests                                                                                                                                                                                                         |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-order.test.ts` | tests/integration/ (430 lines) | Full `createOrderFromCart` flow against mocked Supabase. Tests: valid order creation, stock decrement, coupon application, guest checkout, invalid cart handling. MockChain supports `.or()` for published_at filter. |

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

**Status: COMPLETE** — 960 lines of realistic Hungarian test data.

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

| Entity                 | Count | Notes                                                                                                                          |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| Categories             | 18    | 7 top-level + 11 subcategories, 1 inactive                                                                                     |
| Products               | 15    | 14 active + 1 inactive, 5,990 — 99,990 HUF range                                                                               |
| Variants               | 62    | Multi-dimensional (Size + Color), single-dimension, single-variant. 1 out-of-stock.                                            |
| Product-Category links | 28    | Multi-category assignments                                                                                                     |
| Coupons                | 8     | Active, expired, exhausted, inactive, future, unrestricted                                                                     |
| Orders                 | 15    | All statuses represented, both shipping methods, 3 coupons used, 1 guest order, 3 COD orders (processing, shipped, paid guest) |
| Order Items            | 19    | Multi-item orders included                                                                                                     |
| Subscribers            | 10    | 9 subscribed + 1 unsubscribed, varied sources and tags                                                                         |
| Audit Logs             | 12    | Various actions by different actors                                                                                            |

---

## Known Issues & Minor Gaps

These are small issues or architectural notes. All former "spec gaps" and "planned features" have been moved to the **Feature Roadmap** below with full enterprise-level specifications (see FE-000 through FE-045).

### Bugs

1. **Broken link in `/checkout/success`:** Links to `/account/orders` but the actual route is `/profile/orders`. ? Fixed in **FE-000**.
2. **robots.ts disallows wrong path:** Disallows `/account/` which doesn't exist. Should be `/profile/`. ? Fixed in **FE-000**.

### Architecture Notes

3. **Checkout/admin components are inline:** CheckoutStepper, AddressForm, ShippingMethodSelector, DataTable, ~~StatusBadge~~, ConfirmDialog, ProductForm, OrderDetailPanel are built inline within their pages rather than extracted as reusable components. → **StatusBadge** extracted to shared `OrderStatusBadge` (`admin/order-status-badge.tsx`) with centralized constants in `lib/constants/order-status.ts` — 8 inline duplications eliminated. Remaining inline components addressed in **FE-005**.

### Documentation Inaccuracies

4. **Test file count mismatch:** ~~PROJECT_STATUS.md claims 8 unit test files, but only 5 unique test files exist.~~ → Fixed in **FE-000** (missing tests written) and **FE-007** (email-actions.test.ts added). Now 15 unit test files, 369 total tests passing across 19 test files.

### Completed Feature Fixes

5. **FE-002 (Cookie Consent & GDPR):** Cookie consent banner, cookie policy page, and settings button. GDPR-compliant with necessary/analytics/marketing cookie categories.
6. **FE-007 (Email Flow Completion):** Signup confirmation, welcome, and admin order notification emails. All 3 sending actions with feature flags in siteConfig.
7. **FE-013 (Guest Order Tracking):** `/order-tracking` page with form + status card + timeline. `trackGuestOrder` server action with rate limiting. Tracking CTA in order receipt email and checkout success page.
8. **FE-018 (Order Internal Notes):** `order_notes` table with RLS. 3 server actions (`getOrderNotes`, `addOrderNote`, `deleteOrderNote`). `OrderNotes` client component integrated into admin order detail page. Agency viewer read-only support. 13 unit tests.
9. **FE-023 (About Us Page Builder):** `shop_pages` table with RLS and auto-update trigger. 4 server actions (`getPageContent`, `adminGetPageContent`, `adminUpdatePageContent`, `adminTogglePagePublished`) with full Zod validation. Public `/about` page (Server Component, 5 sections: hero, story, team, values, contact — hidden if empty). Admin editor at `/admin/pages/about` (Client Component, collapsible sections, team/values add/remove, publish toggle, dirty state tracking). "Oldalak" nav item in admin sidebar. "Rólunk" link in footer.
10. **FE-025 (Extra Product Selection Checkbox):** `product_extras` table (UNIQUE(product_id, extra_product_id), self-reference CHECK) with RLS. `enrichExtras()` helper fetches live product details for extras. `getProductExtras` and `adminSetProductExtras` server actions with Zod validation. Storefront: extras checkboxes on product detail page (default-checked support, out-of-stock disabled), added as separate cart items. Admin: "Kiegészítő termékek" Card on product create/edit with search, label editing, sort order, default-checked toggle. 15 unit tests.
11. **FE-026 (Order Export CSV/Excel):** `exportOrdersCsv` server action with date range and status filters, UTF-8 BOM for Excel. "Exportálás" button + Dialog on admin orders page with date picker, status select, line-items checkbox. CSV columns: order number, date, status, customer name/email, shipping, fees, totals, payment status, item count, address, tracking number. Optional line-items section with product/variant/SKU/quantity/price detail. 16 unit tests.
12. **FE-029 (VAT Rate Management):** `vat_rate` column on `products` (default 27, CHECK IN (5,18,27)) and `order_items` (historical snapshot). `TaxConfig` in siteConfig (`defaultVatRate: 27, availableRates: [5, 18, 27]`). `vatRateSchema` Zod validator with `.refine()` against config. Admin product forms: "ÁFA kulcs" Select dropdown in Árazás section. `adminCreateProduct` parses vatRate from FormData (default 27). `createOrderFromCart` snapshots `vat_rate` per item. Invoicing adapters: `billingoVatString()`, `grossToNet()`, `grossToVat()` helpers, per-item VAT rate for both Billingo and Szamlazz. CSV export: "ÁFA kulcs" column in line items section. Migration: `008_vat_rates.sql`. 21 unit tests.
13. **FE-037 (Scheduled Product Publishing):** `published_at` timestamptz column on `products` (nullable, NULL = immediate). RLS policy updated to include `published_at IS NULL OR published_at <= now()`. Partial index on `published_at` WHERE NOT NULL. Defense-in-depth app-level filters in `listProducts`, `getProductBySlug`, `validateCart`, `createOrderFromCart`, and `sitemap.ts`. `publishedAt` in Zod create/update schemas. Admin product forms: `datetime-local` input in Státusz card. Product list: 3-state badge (Aktív/Inaktív/Ütemezett with date). Migration: `009_scheduled_publishing.sql`. 15 unit tests.
14. **FE-044 (Weight-based Shipping):** `weight_grams` int column on `products` and `product_variants` (nullable). `defaultProductWeightGrams: 500` in siteConfig. 4 weight tiers in config: 0-2kg (1490 Ft), 2-5kg (1990 Ft), 5-10kg (2990 Ft), 10-20kg (4490 Ft). `getWeightTierFee()` function for tier lookup (sorted ascending, exceeds-all → highest tier fee). `calculateShippingFee()` and `getCarrierFee()` accept optional `totalWeightGrams` param — weight tier replaces base/carrier fee when provided. `CartItem.weightGrams` field. Weight resolved from variant → product → default in add-to-cart, cart validation, and order creation. Admin product forms: "Súly (gramm)" input in Árazás card + per-variant "Súly (g)" input. Cart page shows total weight in summary. Checkout page shows weight next to shipping fee display. `weightGrams` in product Zod create/update/variant schemas. Migration: `010_weight_based_shipping.sql`. 25 shipping unit tests (expanded from 12 with weight tier tests).
15. **FE-045 (Utánvét / Cash on Delivery):** `payment_method` text column (default 'barion', CHECK IN ('barion','cod')) and `cod_fee` int column (default 0) on `orders` table. Migration: `011_add_payment_method.sql`. `CodConfig` interface in siteConfig with `enabled`, `fee` (590 HUF), `maxOrderAmount` (100,000 HUF), `allowedShippingMethods` (["home","pickup"]). `PaymentMethod` TypeScript type. Payment method selector radio cards in checkout Step 3 (Barion vs Utánvét). COD orders: skip Barion entirely, set status to `processing`, add COD fee to total, send receipt + admin notification emails immediately. Barion orders: existing flow unchanged. OrderSummary shows "Utánvét kezelési díj" line when COD. Success page: "Rendelés visszaigazolva!" for COD vs "Sikeres fizetés!" for Barion. Admin order detail: COD-aware status transitions (shipped → paid for COD), payment method display, COD fee in totals. Invoicing: dynamic `payment_method` (Billingo: "cash_on_delivery", Számlázz.hu: "Utánvét") + COD fee line items. Guest order tracking: COD-aware timeline (processing → shipped → paid). CSV export: "Fizetési mód" and "Utánvét díj" columns. Email templates: payment method + COD fee in order receipt, payment method label in admin notification. `startPaymentAction` guard for COD orders. 3 COD seed orders. `checkoutSchema` includes `paymentMethod` enum.
16. **Order Status Management Overhaul:** Comprehensive refactor of order status system. **New file:** `lib/constants/order-status.ts` — single source of truth for all status labels, badge variants, transition maps, timeline definitions, and confirmation dialog metadata. **Server-side enforcement:** `adminUpdateOrderStatus` now validates transitions server-side via `isTransitionAllowed()` (was UI-only before — security gap). **COD flow fixes:** corrected transition maps (COD: processing → shipped → paid; removed nonsensical transitions like paid → processing). **Shared component:** `OrderStatusBadge` (`admin/order-status-badge.tsx`) replaces 8 inline duplications across admin and shop pages. **Admin order detail redesign:** prominent "Következő lépés" status action card at top of page (was buried below line items), AlertDialog confirmation before every status change with Hungarian descriptions, visual status stepper/progress indicator (COD-aware), error feedback for rejected transitions. **Hungarian consistency:** standardized "Feldolgozás alatt" (was "Feldolgozás"), "Lemondva" (was "Törölve"). **Bug fix:** tracking code stored in `tracking_code` field (was overwriting `notes`). **UI component:** added `alert-dialog` shadcn component.
17. **FE-006 (30-Day Price History Tracking):** EU Omnibus Directive compliance. `price_history` table with database triggers (`record_price_change` on products, `record_variant_price_change` on product_variants) that automatically record price/compare_at_price changes — no application-level inserts. RLS: public SELECT, admin UPDATE/DELETE, no direct INSERT. 2 indexes for fast lookups. 90-day cleanup function. Migration: `012_price_history.sql`. TypeScript types: `PriceHistoryRow`, `PriceHistoryInsert` in `database.ts`. Utility functions split into server-only (`price-history.ts`: `getLowest30DayPrice`, `getLowest30DayPriceMap`, `getPriceHistory`) and client-safe (`price-history-shared.ts`: `resolveLowest30DayPrice`, types `LowestPriceMap`, `LowestPriceResult`, `PriceHistoryPoint`). Storefront: product detail page fetches `lowestPriceMap` when discounted, `ProductDetailClient` resolves per-variant lowest price, `PriceDisplay` shows "Legalacsonyabb ár az elmúlt 30 napban: X Ft" below price when `compare_at_price > base_price` (hidden for free products). Variant fallback: if variant has no price history, uses product-level history. Admin: `PriceSparkline` component (lightweight SVG ~120px × 32px, color-coded trend, hover tooltip) rendered next to base price input on product edit page. `getProductPriceHistory` server action. 20 unit tests.

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
- Utánvét / Cash on Delivery (configurable surcharge and order limit)
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
- Utánvét / Cash on Delivery (configurable fee + max order amount)
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
