# Agency E-Commerce Boilerplate — Project Status & Roadmap

> **Last updated:** 2026-04-02
> **Codebase:** 11 commits, ~220 files, ~49,000 lines of code
> **Status:** Core boilerplate ~95% complete against original spec. All major flows functional end-to-end. **46 features** planned across 4 priority tiers (P0-P3) — 16 completed (FE-000, FE-002, FE-003, FE-006, FE-007, FE-010, FE-013, FE-016, FE-018, FE-023, FE-025, FE-026, FE-029, FE-037, FE-044, FE-045). Agency/Admin separation complete — agency pages moved to `/agency/*` route group with `enableAgencyMode` config flag. Type system overhauled: all types auto-generated from DB schema via `supabase gen types`. **Self-service subscription payment system** fully implemented: Barion recurring payments, automatic renewals, self-service cancellation, auto-invoicing. See Feature Roadmap.

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
8. [Agency Panel (Complete)](#agency-panel)
9. [Server Actions (Complete)](#server-actions)
10. [Integrations (Complete)](#integrations)
11. [API Route Handlers (Complete)](#api-route-handlers)
12. [Components Inventory (Complete)](#components-inventory)
13. [Email Templates (Complete)](#email-templates)
14. [Configuration System (Complete)](#configuration-system)
15. [SEO & Performance (Complete)](#seo--performance)
16. [Testing (Complete)](#testing)
17. [Documentation (Complete)](#documentation)
18. [Seed Data (Complete)](#seed-data)
19. [Known Issues & Minor Gaps](#known-issues--minor-gaps)
20. [Plan Tiers & Pricing](#plan-tiers--pricing)

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

| Layer             | Technology                             | Version               |
| ----------------- | -------------------------------------- | --------------------- |
| Framework         | Next.js (App Router)                   | 16.1.6                |
| Language          | TypeScript (strict mode)               | 5.x                   |
| UI                | React                                  | 19.2                  |
| Styling           | Tailwind CSS                           | v4                    |
| Component Library | shadcn/ui (base-ui/react)              | 4.0.2                 |
| Database          | Supabase (Postgres 17)                 | Latest                |
| Auth              | Supabase Auth                          | via @supabase/ssr     |
| Storage           | Supabase Storage                       | Product images bucket |
| State Management  | Zustand + persist                      | Latest                |
| Forms             | react-hook-form + @hookform/resolvers  | Latest                |
| Validation        | Zod                                    | v4                    |
| Payments          | Barion Smart Gateway v2                | Custom client         |
| Email             | Resend + React Email                   | Latest                |
| Invoicing         | Billingo / Szamlazz.hu adapters        | Custom                |
| Charts            | Recharts                               | Latest                |
| Testing           | Vitest + Playwright                    | Latest                |
| Linting           | ESLint (next/core-web-vitals)          | Latest                |
| Formatting        | Prettier + prettier-plugin-tailwindcss | 3.x + 0.7.x           |
| Package Manager   | pnpm                                   | Latest                |

**React Compiler:** Enabled in `next.config.ts`.

---

## Architecture Overview

```
src/
  app/
    (shop)/          # Storefront route group (public + customer)
    (auth)/          # Login, register, reset-password
    (admin)/admin/   # Admin panel (role-protected)
    (agency)/agency/ # Agency panel (agency-owner-only, gated by enableAgencyMode)
    api/             # Route handlers (Barion callback, email webhooks, etc.)
  components/
    shared/          # Header, Footer, AdminSidebar, AgencySidebar, Breadcrumbs, etc.
    product/         # ProductCard, ProductGrid, Gallery, VariantSelector, etc.
    cart/            # CartLineItem, CouponInput, OrderSummary, etc.
    admin/           # DashboardCharts, OrderNotes
    auth/            # DevProfileSelector
    ui/              # 23 shadcn/ui primitives
  lib/
    actions/         # 15 server action files (~101 exported functions)
    config/          # site.config.ts, hooks.ts
    integrations/    # barion/, email/, invoicing/
    security/        # roles.ts, rate-limit.ts, logger.ts, unsubscribe-token.ts
    supabase/        # server.ts, client.ts, admin.ts, middleware.ts
    store/           # Zustand stores: cart.ts (persist), ui.ts (no persist — cartDrawerOpen)
    types/           # database.generated.ts (auto-generated), database.ts (aliases + JSONB shapes), index.ts
    utils/           # format.ts, shipping.ts, price-history.ts, price-history-shared.ts
    validators/      # checkout.ts, coupon.ts, product.ts, review.ts, subscriber.ts, subscription.ts, uuid.ts
  proxy.ts           # Middleware (role-based route protection)
  supabase/
  migrations/        # 18 SQL migration files
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

**Status: COMPLETE** — 18 migrations applied, 19 tables + 1 view, 10 enums, 29+ indexes, 49+ RLS policies, 4 storage policies.

### Enums

| Enum                  | Values                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| `app_role`            | `customer`, `admin`, `agency_viewer`                                                  |
| `order_status`        | `draft`, `awaiting_payment`, `paid`, `processing`, `shipped`, `cancelled`, `refunded` |
| `subscriber_status`   | `subscribed`, `unsubscribed`, `bounced`, `complained`                                 |
| `subscription_status` | `active`, `past_due`, `cancelled`, `trialing`, `suspended`                            |
| `review_status`       | `pending`, `approved`, `rejected`                                                     |
| `payment_method`      | `barion`, `cod`                                                                       |
| `discount_type`       | `percentage`, `fixed`                                                                 |
| `invoice_status`      | `pending`, `paid`, `failed`, `refunded`                                               |
| `billing_cycle`       | `monthly`, `annual`                                                                   |
| `shipping_method`     | `home`, `pickup`                                                                      |

### Tables

#### 1. `profiles`

| Column                     | Type        | Constraints                                                                            |
| -------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `id`                       | uuid PK     | References `auth.users(id) ON DELETE CASCADE`                                          |
| `role`                     | app_role    | NOT NULL, DEFAULT `'customer'`                                                         |
| `full_name`                | text        | Nullable                                                                               |
| `phone`                    | text        | Nullable                                                                               |
| `default_shipping_address` | jsonb       | `{name, street, city, zip, country}`                                                   |
| `default_billing_address`  | jsonb       | `{name, street, city, zip, country, company_name?, tax_number?}`                       |
| `default_pickup_point`     | jsonb       | `{provider, point_id, point_label}`                                                    |
| `created_at`               | timestamptz | DEFAULT now()                                                                          |
| `is_agency_owner`          | boolean     | NOT NULL DEFAULT false — identifies the agency owner user (full access to `/agency/*`) |

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

| Column             | Type          | Constraints                 |
| ------------------ | ------------- | --------------------------- |
| `id`               | uuid PK       | DEFAULT gen_random_uuid()   |
| `code`             | text          | UNIQUE, NOT NULL            |
| `discount_type`    | discount_type | enum: 'percentage', 'fixed' |
| `value`            | int           | NOT NULL                    |
| `min_order_amount` | int           | Nullable                    |
| `max_uses`         | int           | Nullable                    |
| `used_count`       | int           | DEFAULT 0                   |
| `valid_from`       | timestamptz   | Nullable                    |
| `valid_until`      | timestamptz   | Nullable                    |
| `is_active`        | boolean       | DEFAULT true                |

Indexes: `idx_coupons_code`
RLS: NOT publicly readable (validated server-side only). Admin full. Agency viewer read.

#### 7. `orders`

| Column                      | Type            | Constraints                                     |
| --------------------------- | --------------- | ----------------------------------------------- |
| `id`                        | uuid PK         | DEFAULT gen_random_uuid()                       |
| `user_id`                   | uuid            | FK to auth.users(id), nullable (guest checkout) |
| `email`                     | text            | NOT NULL                                        |
| `status`                    | order_status    | DEFAULT 'draft'                                 |
| `currency`                  | text            | DEFAULT 'HUF'                                   |
| `subtotal_amount`           | int             | DEFAULT 0                                       |
| `shipping_fee`              | int             | DEFAULT 0                                       |
| `discount_total`            | int             | DEFAULT 0                                       |
| `total_amount`              | int             | DEFAULT 0                                       |
| `payment_method`            | payment_method  | DEFAULT 'barion', enum: 'barion', 'cod'         |
| `cod_fee`                   | int             | DEFAULT 0. Utánvét kezelési díj.                |
| `coupon_code`               | text            | Nullable                                        |
| `shipping_method`           | shipping_method | DEFAULT 'home', enum: 'home', 'pickup'          |
| `shipping_address`          | jsonb           | DEFAULT '{}'                                    |
| `shipping_phone`            | text            | Nullable                                        |
| `pickup_point_provider`     | text            | Nullable                                        |
| `pickup_point_id`           | text            | Nullable                                        |
| `pickup_point_label`        | text            | Nullable                                        |
| `billing_address`           | jsonb           | DEFAULT '{}'                                    |
| `notes`                     | text            | Nullable                                        |
| `barion_payment_id`         | text            | Nullable                                        |
| `barion_payment_request_id` | text            | Nullable                                        |
| `barion_status`             | text            | Nullable                                        |
| `invoice_provider`          | text            | Nullable                                        |
| `invoice_number`            | text            | Nullable                                        |
| `invoice_url`               | text            | Nullable                                        |
| `created_at`                | timestamptz     | DEFAULT now()                                   |
| `updated_at`                | timestamptz     | DEFAULT now() (auto-trigger)                    |
| `paid_at`                   | timestamptz     | Nullable                                        |
| `shipped_at`                | timestamptz     | Nullable                                        |
| `idempotency_key`           | text            | UNIQUE, nullable                                |
| `abandoned_cart_sent_at`    | timestamptz     | Nullable                                        |

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

#### 15. `shop_plans`

Defines available subscription plan tiers. Each row is a plan template that can be customized per client at project setup.

| Column               | Type        | Constraints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | uuid PK     | DEFAULT gen_random_uuid()                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `slug`               | text        | UNIQUE, NOT NULL (e.g., `basic`, `premium`)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `name`               | text        | NOT NULL (display name, e.g., "Basic", "Premium")                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `description`        | text        | Nullable — short tagline for the plan                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `base_monthly_price` | int         | NOT NULL (HUF) — default monthly price, can be overridden per client in `shop_subscriptions`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `base_annual_price`  | int         | Nullable (HUF) — default annual price (discounted). If NULL, annual billing not offered for this plan.                                                                                                                                                                                                                                                                                                                                                                                           |
| `features`           | jsonb       | NOT NULL DEFAULT '{}' — structured feature flags: `{max_products, max_admins, enableMarketing, enableFlashSales, enableBundles, enableGiftCards, enableWebhooks, enableB2B, enableAdvancedAnalytics, enableBulkActions, max_emails_per_month, delivery_options_limit, enableCsvImport, csv_import_limit, enableMetaPixel, enableScheduledPublishing, enableLoyalty, enableWishlistAnalytics, enableCustomerSegmentation, enableAutoReviewRequest, enableRefundApi, enable_blog, enable_reviews}` |
| `sort_order`         | int         | DEFAULT 0 — display order on comparison page                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `is_active`          | boolean     | DEFAULT true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `created_at`         | timestamptz | DEFAULT now()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Notes:

- `features` jsonb allows flexible feature gating without schema changes for each new feature.
- `base_monthly_price` and `base_annual_price` are defaults; actual client pricing is stored on `shop_subscriptions`.
- Agency admin can create custom plans or modify existing ones per client.

RLS: Admin read. Agency admin full CRUD. Agency viewer read.

#### 16. `shop_subscriptions`

One active subscription per shop (client). Tracks the client's current plan, billing cycle, and custom pricing.

| Column                    | Type                | Constraints                                                                                          |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                      | uuid PK             | DEFAULT gen_random_uuid()                                                                            |
| `plan_id`                 | uuid                | FK to shop_plans(id), NOT NULL                                                                       |
| `shop_identifier`         | text                | UNIQUE, NOT NULL — identifies which client shop this subscription belongs to (e.g., domain or slug)  |
| `status`                  | subscription_status | NOT NULL DEFAULT 'active'                                                                            |
| `billing_cycle`           | billing_cycle       | NOT NULL, enum: 'monthly', 'annual' — determines which price applies                                 |
| `custom_monthly_price`    | int                 | Nullable (HUF) — if set, overrides plan's `base_monthly_price` for this client                       |
| `custom_annual_price`     | int                 | Nullable (HUF) — if set, overrides plan's `base_annual_price` for this client                        |
| `current_period_start`    | timestamptz         | NOT NULL — start of current billing period                                                           |
| `current_period_end`      | timestamptz         | NOT NULL — end of current billing period (auto-renew date)                                           |
| `trial_ends_at`           | timestamptz         | Nullable — if trialing, when the trial expires                                                       |
| `cancelled_at`            | timestamptz         | Nullable — when the subscription was cancelled (may still be active until period end)                |
| `feature_overrides`       | jsonb               | DEFAULT '{}' — per-client feature overrides that extend or restrict the base plan's `features` jsonb |
| `notes`                   | text                | Nullable — internal agency notes about this client's deal                                            |
| `barion_recurrence_token` | text                | Nullable — Barion RecurrenceId for automatic recurring charges                                       |
| `barion_funding_source`   | text                | Nullable — funding source from last successful Barion payment (e.g., "BankCard")                     |
| `last_payment_id`         | text                | Nullable — Barion PaymentId of the most recent subscription payment                                  |
| `grace_period_end`        | timestamptz         | Nullable — deadline for failed renewal retries before suspension                                     |
| `renewal_attempts`        | int                 | DEFAULT 0 — count of consecutive failed renewal attempts                                             |
| `payment_method`          | text                | Nullable — payment method type (e.g., "barion")                                                      |
| `created_at`              | timestamptz         | DEFAULT now()                                                                                        |
| `updated_at`              | timestamptz         | DEFAULT now() (auto-trigger)                                                                         |

Notes:

- `custom_monthly_price` / `custom_annual_price` allow the agency to negotiate different prices per client without creating a new plan tier.
- `feature_overrides` merges with the plan's `features` jsonb at runtime, allowing per-client exceptions (e.g., a Basic client who paid extra for marketing).
- Effective price resolution: `custom_*_price ?? plan.base_*_price` depending on `billing_cycle`.
- Only one active subscription per `shop_identifier` at a time.

RLS: Admin read and update (own shop only, via shop_identifier match). Agency admin full CRUD.

#### 17. `subscription_invoices`

Billing records for plan subscriptions. Reuses the existing Billingo/Szamlazz invoicing adapters for invoice generation.

| Column                 | Type           | Constraints                                                                |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| `id`                   | uuid PK        | DEFAULT gen_random_uuid()                                                  |
| `subscription_id`      | uuid           | FK to shop_subscriptions(id) ON DELETE CASCADE                             |
| `amount`               | int            | NOT NULL (HUF) — the amount charged for this billing period                |
| `currency`             | text           | DEFAULT 'HUF'                                                              |
| `billing_period_start` | timestamptz    | NOT NULL                                                                   |
| `billing_period_end`   | timestamptz    | NOT NULL                                                                   |
| `status`               | invoice_status | NOT NULL, enum: 'pending', 'paid', 'failed', 'refunded', DEFAULT 'pending' |
| `paid_at`              | timestamptz    | Nullable                                                                   |
| `invoice_provider`     | text           | Nullable — 'billingo', 'szamlazz', or null if not yet generated            |
| `invoice_number`       | text           | Nullable — external invoice number from provider                           |
| `invoice_url`          | text           | Nullable — downloadable invoice PDF link                                   |
| `payment_method`       | text           | Nullable — 'bank_transfer', 'card', 'barion', etc.                         |
| `notes`                | text           | Nullable — internal notes (e.g., "first month free", "custom deal")        |
| `barion_payment_id`    | text           | Nullable — Barion PaymentId associated with this invoice                   |
| `barion_trace_id`      | text           | Nullable — Barion trace ID for tracking                                    |
| `is_renewal`           | boolean        | DEFAULT false — whether this invoice was generated by automatic renewal    |
| `created_at`           | timestamptz    | DEFAULT now()                                                              |

Notes:

- Invoice generation reuses the existing `InvoicingAdapter` strategy pattern (Billingo/Szamlazz/Null).
- Auto-generated on successful initial subscription payments and automatic renewals via `generateSubscriptionInvoice()`.
- Agency admin can also generate invoices manually via `/agency/clients`.
- `amount` reflects the actual charged price (after any custom pricing or annual discount).
- `is_renewal` distinguishes auto-renewal invoices from initial payment invoices.
- `barion_payment_id` and `barion_trace_id` link the invoice to the specific Barion transaction.

RLS: Admin read (own shop's invoices only, via subscription join). Agency admin full CRUD. Agency viewer read.

#### 18. `reviews`

Customer product reviews with moderation workflow. Supports ratings (1-5 stars), text reviews, admin replies, and verified-purchase badges.

| Column           | Type          | Constraints                                                                                   |
| ---------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `id`             | uuid PK       | DEFAULT gen_random_uuid()                                                                     |
| `product_id`     | uuid          | FK to products(id) ON DELETE CASCADE, NOT NULL                                                |
| `user_id`        | uuid          | FK to auth.users(id) ON DELETE SET NULL, nullable                                             |
| `rating`         | int           | NOT NULL, CHECK (rating >= 1 AND rating <= 5)                                                 |
| `title`          | text          | Nullable, max 200 chars                                                                       |
| `body`           | text          | Nullable, max 2000 chars                                                                      |
| `status`         | review_status | NOT NULL DEFAULT 'pending', enum: 'pending', 'approved', 'rejected'                           |
| `is_verified`    | boolean       | NOT NULL DEFAULT false — auto-set to true if user has a shipped order containing this product |
| `admin_reply`    | text          | Nullable, max 1000 chars — admin response to the review                                       |
| `admin_reply_at` | timestamptz   | Nullable — when admin reply was posted                                                        |
| `created_at`     | timestamptz   | NOT NULL DEFAULT now()                                                                        |
| `updated_at`     | timestamptz   | NOT NULL DEFAULT now() (auto-trigger)                                                         |

Constraints: UNIQUE(product_id, user_id) — one review per user per product.
Indexes: `idx_reviews_product_status` (product_id, status, created_at DESC), `idx_reviews_user` (user_id), `idx_reviews_status` (status)
RLS: Public SELECT (approved only). Authenticated INSERT (own user_id). Admin full CRUD. Agency viewer read.
Trigger: `trg_reviews_updated_at` — auto-sets `updated_at` on UPDATE via `set_updated_at()`.

#### View: `product_review_stats`

Regular (non-materialized) view aggregating review statistics per product from approved reviews.

| Column           | Type    | Source                                    |
| ---------------- | ------- | ----------------------------------------- |
| `product_id`     | uuid    | reviews.product_id                        |
| `average_rating` | numeric | ROUND(AVG(rating), 1) — one decimal place |
| `review_count`   | bigint  | COUNT(\*) of approved reviews             |
| `rating_1`       | bigint  | COUNT of 1-star approved reviews          |
| `rating_2`       | bigint  | COUNT of 2-star approved reviews          |
| `rating_3`       | bigint  | COUNT of 3-star approved reviews          |
| `rating_4`       | bigint  | COUNT of 4-star approved reviews          |
| `rating_5`       | bigint  | COUNT of 5-star approved reviews          |

RLS: Not applicable (view inherits from `reviews` RLS). Queried via admin client in server actions.

#### 19. `posts`

| Column             | Type        | Constraints                                          |
| ------------------ | ----------- | ---------------------------------------------------- |
| `id`               | uuid        | PK DEFAULT gen_random_uuid()                         |
| `slug`             | text        | NOT NULL UNIQUE                                      |
| `title`            | text        | NOT NULL                                             |
| `excerpt`          | text        | NULL                                                 |
| `content_html`     | text        | NOT NULL DEFAULT ''                                  |
| `cover_image_url`  | text        | NULL                                                 |
| `author_id`        | uuid        | NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE |
| `is_published`     | boolean     | NOT NULL DEFAULT false                               |
| `published_at`     | timestamptz | NULL                                                 |
| `tags`             | text[]      | NULL                                                 |
| `meta_title`       | text        | NULL                                                 |
| `meta_description` | text        | NULL                                                 |
| `created_at`       | timestamptz | NOT NULL DEFAULT now()                               |
| `updated_at`       | timestamptz | NOT NULL DEFAULT now() (auto-trigger)                |

Indexes: `idx_posts_slug` (slug), `idx_posts_published` (is_published, published_at DESC), `idx_posts_author` (author_id), `idx_posts_tags` GIN (tags)
RLS: Public SELECT (published only). Admin full CRUD. Agency viewer read.
Trigger: `trg_posts_updated_at` — auto-sets `updated_at` on UPDATE via `set_updated_at()`.

#### 20. `subscription_payment_events`

Detailed payment event log for subscription payments. Tracks every payment attempt, success, failure, and renewal event for audit and debugging.

| Column              | Type        | Constraints                                                                                                                                                                       |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | uuid PK     | DEFAULT gen_random_uuid()                                                                                                                                                         |
| `subscription_id`   | uuid        | FK to shop_subscriptions(id) ON DELETE CASCADE, NOT NULL                                                                                                                          |
| `event_type`        | text        | NOT NULL — one of: `payment_initiated`, `payment_success`, `payment_failed`, `renewal_attempt`, `renewal_success`, `renewal_failed`, `cancellation`, `suspension`, `reactivation` |
| `barion_payment_id` | text        | Nullable — Barion PaymentId for this event                                                                                                                                        |
| `amount`            | int         | Nullable (HUF) — payment amount for this event                                                                                                                                    |
| `currency`          | text        | DEFAULT 'HUF'                                                                                                                                                                     |
| `status`            | text        | Nullable — status snapshot at the time of the event                                                                                                                               |
| `error_message`     | text        | Nullable — error details for failed events                                                                                                                                        |
| `metadata`          | jsonb       | DEFAULT '{}' — additional event-specific data (funding source, trace ID, etc.)                                                                                                    |
| `created_at`        | timestamptz | DEFAULT now()                                                                                                                                                                     |

Notes:

- Provides a full audit trail for all subscription payment lifecycle events.
- Used for debugging payment failures, renewal retries, and suspension flows.
- `metadata` jsonb stores event-specific details without schema changes per event type.

RLS: Admin read (own shop's events only, via subscription join). Agency admin read.

### Database Functions & Triggers

| Function                        | Type                      | Purpose                                                                                                         |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `current_app_role()`            | STABLE, SECURITY DEFINER  | Returns app_role for auth.uid() from profiles. Fallback: 'customer'.                                            |
| `handle_new_user()`             | Trigger, SECURITY DEFINER | Auto-creates profiles row on auth.users INSERT with role='customer'.                                            |
| `set_updated_at()`              | Trigger                   | Sets updated_at = now() on UPDATE.                                                                              |
| `record_price_change()`         | Trigger, SECURITY DEFINER | Records product-level price changes to `price_history` when base_price or compare_at_price changes on products. |
| `record_variant_price_change()` | Trigger, SECURITY DEFINER | Records variant-level price changes to `price_history` when price_override changes on product_variants.         |
| `cleanup_old_price_history()`   | Scheduled (daily)         | Deletes `price_history` records older than 90 days.                                                             |

| Trigger                             | Table              | Event         |
| ----------------------------------- | ------------------ | ------------- |
| `on_auth_user_created`              | auth.users         | AFTER INSERT  |
| `trg_products_updated_at`           | products           | BEFORE UPDATE |
| `trg_product_variants_updated_at`   | product_variants   | BEFORE UPDATE |
| `trg_orders_updated_at`             | orders             | BEFORE UPDATE |
| `trg_shop_pages_updated_at`         | shop_pages         | BEFORE UPDATE |
| `trg_record_price_change`           | products           | AFTER UPDATE  |
| `trg_record_variant_price_change`   | product_variants   | AFTER UPDATE  |
| `trg_shop_subscriptions_updated_at` | shop_subscriptions | BEFORE UPDATE |
| `trg_reviews_updated_at`            | reviews            | BEFORE UPDATE |

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

### Implemented: Agency Owner Flag

**Status: COMPLETE** — Implemented as `is_agency_owner boolean` on the `profiles` table (migration `013_plan_subscription_system.sql`). Agency pages separated into dedicated `/agency/*` route group.

The agency owner flag distinguishes the agency operator from regular shop admins:

- Can access all agency-level pages (`/agency/*`) including client management and subscription plan CRUD
- Manages `shop_plans`, `shop_subscriptions`, and `subscription_invoices` (full CRUD via `requireAgencyOwner()` guard)
- Can override per-client feature flags and pricing
- Generates subscription invoices for clients via the existing invoicing adapters
- Regular `admin` users do NOT see agency-level pages — they only manage their own shop
- All agency-owner-only server actions are additionally gated by `isAgencyModeEnabled()` which checks `siteConfig.admin.enableAgencyMode`

**Implementation:** `is_agency_owner boolean NOT NULL DEFAULT false` on `profiles`. Guards: `requireAgencyOwner()` throws if false, `isAgencyOwner(profile)` returns boolean. Middleware reads `is_agency_owner` from session to protect `/agency/*` routes. Seed: `admin@agency.test` has `is_agency_owner = true`. Config: `admin.enableAgencyMode` flag (default `true`) — when `false`, all agency server actions return an error and the agency layout redirects to `/admin`.

### Middleware (`src/proxy.ts`)

Single middleware intercepts every request. Uses `updateSession()` which refreshes the Supabase session and fetches user role from profiles.

### Route Protection Rules

| User State                       | Can Access                                                                                          | Cannot Access                                                       | Redirects To              |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| Guest (no session)               | `/`, `/products/**`, `/cart`, `/checkout/**`, `/login`, `/register`, `/reset-password`, legal pages | `/profile/*`, `/admin/*`, `/agency/*`                               | `/login?redirectTo=[url]` |
| Customer                         | All public routes, `/profile/*`                                                                     | `/login`, `/register`, `/reset-password`, `/admin/*`, `/agency/*`   | `/profile`                |
| Admin / Agency Viewer            | All public routes, `/admin/*`                                                                       | `/login`, `/register`, `/reset-password`, `/profile/*`, `/agency/*` | `/admin`                  |
| Agency Owner (`is_agency_owner`) | All public routes, `/admin/*`, `/agency/*`                                                          | `/login`, `/register`, `/reset-password`, `/profile/*`              | `/admin`                  |

### Supabase Clients

| Client                  | File        | Purpose                                                                                                      |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `createClient()`        | `server.ts` | User-scoped SSR client. Respects RLS. For Server Components and customer-facing Server Actions.              |
| `createAdminClient()`   | `admin.ts`  | Service-role client. Bypasses RLS. Singleton with env-var invalidation guard. For admin Server Actions only. |
| `createBrowserClient()` | `client.ts` | Browser-side Supabase client. For client components.                                                         |

### Security Helpers (`src/lib/security/`)

| Function                   | File                 | Purpose                                                                                              |
| -------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `requireAuth()`            | roles.ts             | Returns authenticated user or throws (redirects to login)                                            |
| `requireAdmin()`           | roles.ts             | Returns admin user or throws (blocks agency_viewer)                                                  |
| `requireAdminOrViewer()`   | roles.ts             | Returns admin or agency_viewer user                                                                  |
| `getCurrentProfile()`      | roles.ts             | Returns profile or null (non-throwing, for layouts)                                                  |
| `isAgencyViewer()`         | roles.ts             | Boolean check                                                                                        |
| `RateLimiter` class        | rate-limit.ts        | In-memory rate limiter (subscribe: 5/60s, auth: 10/60s, orderTracking: 5/3600s)                      |
| `logAudit()`               | logger.ts            | Writes to audit_logs via admin client                                                                |
| `signUnsubscribeToken()`   | unsubscribe-token.ts | HMAC-SHA256 signed token generation                                                                  |
| `verifyUnsubscribeToken()` | unsubscribe-token.ts | Token verification, returns email or null                                                            |
| `requireAgencyOwner()`     | roles.ts             | Returns profile or throws if `is_agency_owner` is false                                              |
| `isAgencyOwner()`          | roles.ts             | Boolean check for `is_agency_owner` flag on profile                                                  |
| `isAgencyModeEnabled()`    | subscriptions.ts     | Boolean check for `siteConfig.admin.enableAgencyMode` — gates all agency-owner server actions        |
| `getPlanGate()`            | plan-gate.ts         | Returns `PlanGate` with `check()` and `checkLimit()`. No subscription → unlimited (dev/open access). |

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

**Status: COMPLETE** — All 12 storefront routes fully implemented. Reviews section on product detail pages (FE-010).

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
- **Features:** Server fetch product + variants + categories + extras. Variant selector (buttons/chips, updates price and stock). Extra product checkboxes (FE-025, default-checked, out-of-stock handling). 30-day lowest price display for discounted products (FE-006, EU Omnibus Directive). Add to cart (client, includes checked extras as separate items). Gallery with main image + thumbnails. Breadcrumbs. SEO metadata per product. JSON-LD Product schema (includes AggregateRating when reviews exist). Loading skeleton. **Reviews section (FE-010):** review summary with star distribution chart, paginated review list with verified badges, review form for authenticated users with one-review-per-product enforcement.
- **Components used:** ProductDetailClient, VariantSelector, Gallery, AddToCartButton, PriceDisplay, StockBadge, Breadcrumbs, ReviewSection

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

### `/blog` (Blog Listing)

- **File:** `src/app/(shop)/blog/page.tsx`
- **Type:** Server Component
- **Features:** Paginated blog post card grid (6 per page). Tag-based filtering via `?tag=` query param. Cover images with fallback initial letter. Post cards show title, excerpt (line-clamped), tags (clickable, link to filtered view), published date, author name. Breadcrumbs. `loading.tsx` skeleton. SEO metadata.

### `/blog/[slug]` (Blog Post Detail)

- **File:** `src/app/(shop)/blog/[slug]/page.tsx`
- **Type:** Server Component
- **Features:** Full blog post with cover image hero, title, date, author, tags, and HTML content in a `prose` container. Related posts section (up to 3, same-tag overlap, excluding current). Dynamic `generateMetadata` with OpenGraph article type, `meta_title`/`meta_description` overrides. Breadcrumbs. `notFound()` for missing/unpublished posts.

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

**Status: COMPLETE** — All 16 admin pages fully implemented with agency_viewer read-only enforcement. Agency management pages moved to separate `/agency/*` route group (see [Agency Panel](#agency-panel)).

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

### `/admin/reviews` (Review Moderation)

- **File:** `src/app/(admin)/admin/reviews/page.tsx`
- **Type:** Client Component with server data fetching
- **Features:** Full review moderation dashboard with stats cards (total, pending, approved, rejected counts), tab-based filtering (Összes/Függőben/Jóváhagyott/Elutasított), paginated review list with product title, customer name, rating, status badge, date. Per-review actions: approve, reject, add/edit admin reply. Bulk actions: approve all pending, reject all pending. Review detail shows full text, verified purchase badge, admin reply. Agency viewers see read-only view.
- **Nav:** "Értékelések" (`Star` icon) in admin sidebar, gated by `siteConfig.features.enableReviews`

### `/admin/blog` (Blog Post Management)

- **File:** `src/app/(admin)/admin/blog/page.tsx`
- **Type:** Client Component with server data fetching
- **Features:** Blog post management dashboard with stats cards (total, published, draft counts). Tab-based filtering (Összes/Publikált/Vázlat), text search by title. Paginated post table with title, slug, tags, status badge, author, created date. Per-post actions: view on site (external link), toggle publish/unpublish, edit, delete with confirmation. Pagination via `AdminPagination`.
- **Nav:** "Blog" (`Newspaper` icon) in admin sidebar, gated by `siteConfig.features.enableBlog` and `enable_blog` plan feature.

### `/admin/blog/new` (Blog Post Create)

- **File:** `src/app/(admin)/admin/blog/new/page.tsx`
- **Type:** Client Component
- **Features:** Blog post creation form with 3-column layout (2/3 main content + 1/3 sidebar). Main: title (auto-generates slug), slug (manually editable), excerpt (textarea, max 1000), Markdown editor (`@uiw/react-md-editor`, lazy-loaded, live preview). Sidebar: publish/draft toggle, cover image upload (`SingleImageUpload`), comma-separated tags input, SEO fields (meta title, meta description). Redirects to edit page on success.

### `/admin/blog/[id]` (Blog Post Edit)

- **File:** `src/app/(admin)/admin/blog/[id]/page.tsx`
- **Type:** Client Component
- **Features:** Same layout as create page. Pre-populates all fields from existing post. Status badge + creation date in header. External "Megtekintés" link for published posts. Delete button with confirmation dialog. Success/error feedback messages. Local state update on save for immediate UI refresh.

### `/admin/subscription` (Self-Service Subscription Dashboard)

**Purpose:** Shop owners can view their plan details, manage their subscription (cancel), see payment information, and initiate payments. This is a **self-service** page with full subscription lifecycle management.

- **Data fetching:** Uses `getMySubscriptionWithPaymentInfo()` from `subscription-payments.ts` (enhanced subscription read with payment metadata: `barion_recurrence_token`, `barion_funding_source`, `last_payment_id`, `grace_period_end`, `renewal_attempts`, `payment_method`). Also fetches invoices via `getMyInvoices()`.
- **Payment redirect handling:** Reads `?payment=success` and `?payment=cancel` query params (from Barion redirect), shows toast notifications, strips query params from URL.
- **Status banners:**
  - Cancellation pending: "Az előfizetésed le van mondva" with period end date
  - Past due: "A fizetés sikertelen" warning with grace period info
  - Suspended: "Az előfizetésed felfüggesztve" alert with resubscribe CTA
- **Plan overview card:** Current plan name + badge, billing cycle, next renewal date, current price
- **Payment method card:** Shows Barion funding source (e.g., "Bankkártya") if available, last payment date
- **Feature usage summary:** Visual indicators for plan-limited features:
  - Product count: "142 / 500 termék" (with progress bar if limited)
  - Admin users: "1 / 1 admin felhasználó"
  - Email sends this month: "340 / 1,000 email" (if marketing module is in plan)
  - Delivery options: "2 / 2 szállítási mód"
- **Feature list:** All features with checkmarks (included) or lock icons + "Premium" badge (not in current plan). Locked features link to the comparison page (`/admin/subscription/plans`).
- **Cancel subscription:** AlertDialog confirmation flow. Sets subscription to cancel at period end (no immediate cancellation, active until `current_period_end`). Uses `cancelMySubscription()` server action.
- **Billing history table:** Past invoices from `subscription_invoices` table. Columns: billing period, amount (HUF), status, renewal badge, invoice number, download link. Paginated.
- **Upgrade CTA:** Prominent button linking to `/admin/subscription/plans` if not on the highest plan.
- **No subscription state:** Graceful handling when no active subscription found — shows informational message with link to plans page.
- **Access:** All admin roles can view. Cancellation restricted to admin role.

### `/admin/subscription/plans` (Plan Comparison & Subscribe Page)

**Purpose:** A side-by-side plan comparison page for shop owners to understand available plans and subscribe directly. Plan CRUD has been moved to `/agency/plans` (agency-owner-only). This is NOT a public marketing page — it's inside the admin panel.

- **Layout:** Side-by-side pricing cards (responsive grid). Each plan rendered as a card with name, price, description, and feature checklist.
- **Monthly/annual toggle:** Switch to view prices for monthly or annual billing. Annual cards show monthly-equivalent price with savings badge.
- **Current plan highlight:** The shop owner's current plan (from `getMySubscription()`) is visually highlighted with a "Jelenlegi csomagod" (Current Plan) badge and distinct border.
- **Feature checklists:** Each plan card lists included features with checkmarks and excluded features with X marks, based on the plan's `features` jsonb.
- **Subscribe CTA:** "Előfizetés" button on each plan triggers `startSubscriptionPayment()` server action, redirecting to Barion for payment. Downgrade prevention: button disabled with "Alacsonyabb csomag" tooltip for plans with lower `sort_order` than current. Loading spinner on subscribing plan.
- **Cancelled subscription banner:** If subscription is cancelled, shows info banner: "Az előfizetésed le van mondva" with period end date and encouragement to resubscribe.
- **Data:** Fetches all active plans via `listPlans()` and current subscription via `getMySubscription()`.
- **Access:** All admin roles can view. Subscribe action restricted to admin role.

### Admin Layout & Sidebar

- **Desktop:** Fixed 260px collapsible sidebar + top bar with toggle
- **Mobile:** Sheet-based slide-out sidebar
- **Navigation items:** Feature-flag-driven (marketing only shows if `enableMarketingModule` is true, coupons only if `enableCoupons` is true, reviews only if `enableReviews` is true). "Oldalak" link to `/admin/pages/about` (always visible).
- **Nav items:** "Előfizetés" (Subscription) link to `/admin/subscription` (all admin roles).
- **Agency link:** Conditional "Ügynökségi kezelő" link with `Building2` icon, shown only when `enableAgencyMode` is `true` AND user has `is_agency_owner = true`. Links to `/agency`. Separated from other nav items with a visual `Separator`.
- **Agency viewer:** Yellow "Csak olvasás" (Read-only) badge in sidebar
- **Footer links:** "Vissza a boltba" (Back to shop) + "Kijelentkezés" (Sign out)
- **Props chain:** Admin layout passes `enableAgencyMode` through `AdminShell` → `DesktopSidebar`/`TopBar` → `MobileSidebar` → `NavLinks`

---

## Agency Panel

**Status: COMPLETE** — 4 pages in a dedicated `(agency)` route group with own layout and sidebar. Gated by `enableAgencyMode` config flag. Only accessible to users with `is_agency_owner = true`.

### Agency Layout (`src/app/(agency)/layout.tsx`)

- **Type:** Server Component with auth guards
- **Guards:** Checks `siteConfig.admin.enableAgencyMode` (redirects to `/admin` if `false`), then `getCurrentProfile()` + `isAgencyOwner()` (redirects to `/login` or `/unauthorized`)
- **Renders:** `<AgencyShell>` component wrapping child pages

### `/agency` (Agency Dashboard)

- **File:** `src/app/(agency)/agency/page.tsx`
- **KPI Cards:** Total active clients, MRR (Monthly Recurring Revenue) calculation, plan distribution breakdown
- **Quick links:** Navigate to clients list and plans management
- **Data:** Fetched server-side via `listSubscriptions()` and `listPlans()`

### `/agency/clients` (Agency Client List)

- **File:** `src/app/(agency)/agency/clients/page.tsx`
- **Client list table:** All shops managed by the agency
  - Columns: shop name/identifier, current plan, billing cycle, status (active/past_due/cancelled/trialing/suspended), monthly revenue, next renewal date, actions
  - Search by shop name/identifier
  - Filter by plan, status, billing cycle
  - Sort by revenue, renewal date, name
- **Click row => Client detail page** (`/agency/clients/[id]`)
- **New client setup:** Button to onboard a new client shop
- **Access:** `is_agency_owner` users only

### `/agency/clients/[id]` (Agency Client Detail)

- **File:** `src/app/(agency)/agency/clients/[id]/page.tsx`
- **Subscription management:** Change plan, switch billing cycle (monthly/annual), set custom pricing (override base plan price), toggle annual discount
- **Feature overrides:** Per-client feature flag toggles. Stored in `shop_subscriptions.feature_overrides` jsonb.
- **Pricing controls:** Custom monthly price, custom annual price. Shows plan base price vs custom price.
- **Billing history:** All `subscription_invoices` for this client. Status, amounts, invoice links.
- **Invoice actions:** "Számla készítése" (Generate invoice) button
- **Subscription actions:** Pause, cancel, resume, extend trial
- **Internal notes:** Free-text notes about the client's deal
- **Audit:** All subscription changes logged to `audit_logs`

### `/agency/plans` (Agency Plan Management)

- **File:** `src/app/(agency)/agency/plans/page.tsx`
- **Plan CRUD:** Full create/read/update for subscription plan tiers
- **Fields:** Name, slug, description, monthly price, annual price, features jsonb, sort order, active toggle
- **Data:** Uses `listPlans()`, `adminCreatePlan()`, `adminUpdatePlan()` server actions
- **Access:** `is_agency_owner` users only. All agency-owner actions additionally gated by `isAgencyModeEnabled()`

### Agency Layout & Sidebar

- **Component:** `AgencyShell` in `src/components/shared/agency-sidebar.tsx` (246 lines)
- **Desktop:** Fixed 260px collapsible sidebar (same pattern as admin sidebar)
- **Mobile:** Sheet-based slide-out sidebar
- **Navigation items:** Áttekintés (`/agency`), Ügyfelek (`/agency/clients`), Csomagok (`/agency/plans`)
- **Header:** "Ügynökségi kezelő" title with `Badge` variant
- **Footer links:** "Vissza az adminhoz" (Back to admin) + "Kijelentkezés" (Sign out)

---

## Server Actions

**Status: COMPLETE** — 16 action files, ~101 exported functions, all with Zod validation.

### `src/lib/actions/products.ts` (1150 lines)

| Function                            | Guard                | What it does                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listProducts(filters)`             | Public               | Server-side filtered/sorted/paginated product listing. Filters: category, price range, stock, sort. Joins variants and categories. Filters by `published_at IS NULL OR published_at <= now()` (defense-in-depth on top of RLS).                                                                      |
| `getProductBySlug(slug)`            | Public               | Fetches single product with all variants, categories, and extras. Active products only. Filters by `published_at` (defense-in-depth). Enriches extras with live product data.                                                                                                                        |
| `adminListProducts(filters)`        | requireAdminOrViewer | Lists ALL products (including inactive and scheduled). Search, filter, paginate.                                                                                                                                                                                                                     |
| `adminGetProduct(id)`               | requireAdminOrViewer | Single product with variants, categories, and extras (any status). Enriches extras with live product data.                                                                                                                                                                                           |
| `adminCreateProduct(formData)`      | requireAdmin         | Creates product + variants + category associations + extras. FormData-based. Parses `vatRate` (default 27) and `publishedAt` (nullable datetime). Auto-generates slug. Validates with Zod. **Checks plan product limit** via `getPlanGate().checkLimit('max_products')` before insert. Audit logged. |
| `adminUpdateProduct(formData)`      | requireAdmin         | Updates product fields (including `vat_rate`, `published_at`), syncs variants (upsert/delete), syncs categories, syncs extras (delete-and-recreate). Audit logged.                                                                                                                                   |
| `adminDeleteProduct(id)`            | requireAdmin         | Soft delete (is_active = false). Audit logged.                                                                                                                                                                                                                                                       |
| `adminToggleProductActive(id)`      | requireAdmin         | Toggle active state. Audit logged.                                                                                                                                                                                                                                                                   |
| `adminHardDeleteProduct(id)`        | requireAdmin         | Permanent delete with cascade. Audit logged.                                                                                                                                                                                                                                                         |
| `getProductExtras(productId)`       | Public               | Fetches extras for a product with enriched product/variant data (title, slug, price, image, stock, active status). Uses `enrichExtras()` helper.                                                                                                                                                     |
| `adminSetProductExtras(id, extras)` | requireAdmin         | Standalone extras save: validates with Zod, blocks self-reference, delete-and-recreate pattern. Audit logged with extras count.                                                                                                                                                                      |
| `getProductPriceHistory(productId)` | requireAdminOrViewer | Fetches 30-day price history for admin sparkline chart. Returns array of `{price, compareAtPrice, date}` sorted chronologically. Uses `getPriceHistory()` utility.                                                                                                                                   |

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

| Function                         | Guard                | What it does                                                                                 |
| -------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `listCategories()`               | Public               | Active categories with parent hierarchy.                                                     |
| `adminListCategories()`          | requireAdminOrViewer | All categories (including inactive).                                                         |
| `adminCreateCategory(input)`     | requireAdmin         | Create with slug auto-gen. **Checks plan category limit** via `getPlanGate()`. Audit logged. |
| `adminUpdateCategory(id, input)` | requireAdmin         | Update fields. Audit logged.                                                                 |
| `adminDeleteCategory(id)`        | requireAdmin         | Soft delete. Audit logged.                                                                   |
| `adminToggleCategory(id)`        | requireAdmin         | Toggle active. Audit logged.                                                                 |
| `adminHardDeleteCategory(id)`    | requireAdmin         | Permanent delete. Audit logged.                                                              |
| `adminRestoreCategory(id)`       | requireAdmin         | Restore soft-deleted. Audit logged.                                                          |

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

### `src/lib/actions/reviews.ts` (~600 lines)

| Function                                        | Guard                | What it does                                                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getProductReviews(productId, page?, perPage?)` | Public               | Fetches approved reviews for a product, paginated. Includes user full_name via profiles FK join (migration 017). Returns reviews + total count.                                                                              |
| `getProductReviewStats(productId)`              | Public               | Fetches aggregated review stats from `product_review_stats` view: average rating, total count, per-star distribution.                                                                                                        |
| `getUserReview(productId)`                      | requireAuth          | Checks if the authenticated user has already reviewed this product. Returns the review or null.                                                                                                                              |
| `createReview(input)`                           | requireAuth          | Creates a new review with Zod validation. Enforces one-review-per-product constraint. Auto-sets `is_verified` by checking if user has a shipped order containing the product. Plan-gated via `enable_reviews`. Audit logged. |
| `updateReview(reviewId, input)`                 | requireAuth          | Updates own review (title, body, rating). Resets status to 'pending' for re-moderation. Audit logged.                                                                                                                        |
| `deleteReview(reviewId)`                        | requireAuth          | Deletes own review. Audit logged.                                                                                                                                                                                            |
| `adminListReviews(filters)`                     | requireAdminOrViewer | Lists all reviews with filters (status, product, search). Paginated. Includes product title and user name.                                                                                                                   |
| `adminGetReviewStats()`                         | requireAdminOrViewer | Returns aggregate moderation stats: total, pending, approved, rejected counts.                                                                                                                                               |
| `adminUpdateReviewStatus(reviewId, status)`     | requireAdmin         | Approves or rejects a review. Audit logged.                                                                                                                                                                                  |
| `adminReplyToReview(reviewId, reply)`           | requireAdmin         | Adds or updates admin reply on a review. Sets `admin_reply_at` timestamp. Audit logged.                                                                                                                                      |
| `adminBulkUpdateStatus(status)`                 | requireAdmin         | Bulk approves or rejects all pending reviews. Audit logged with count.                                                                                                                                                       |

### `src/lib/actions/subscriptions.ts` (~743 lines)

| Function                             | Guard                                    | What it does                                                                                                                                                             |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listPlans()`                        | requireAdminOrViewer                     | Fetches all active `shop_plans` ordered by `sort_order`. Returns `ShopPlanRow[]`.                                                                                        |
| `getPlan(id)`                        | requireAdminOrViewer                     | Fetches single plan by ID. Returns `ShopPlanRow`.                                                                                                                        |
| `adminCreatePlan(input)`             | requireAgencyOwner + isAgencyModeEnabled | Creates a new plan tier. Validates with `planCreateSchema`. Audit logged. Returns error if agency mode is disabled.                                                      |
| `adminUpdatePlan(id, input)`         | requireAgencyOwner + isAgencyModeEnabled | Updates plan fields. Validates with `planUpdateSchema`. Audit logged. Returns error if agency mode is disabled.                                                          |
| `getMySubscription()`                | requireAdminOrViewer                     | Fetches the active/trialing/past_due subscription for the current shop (by `siteConfig.subscription.defaultShopIdentifier`). Returns `ShopSubscriptionWithPlan` or null. |
| `getMyInvoices()`                    | requireAdminOrViewer                     | Fetches invoices for the current shop's subscription (by shop identifier). Returns `SubscriptionInvoiceRow[]`. Returns empty array if no subscription found.             |
| `listSubscriptions()`                | requireAgencyOwner + isAgencyModeEnabled | Fetches all `shop_subscriptions` joined with their plan. Returns `ShopSubscriptionWithPlan[]`.                                                                           |
| `getSubscription(id)`                | requireAdminOrViewer                     | Fetches single subscription by ID with plan. Returns `ShopSubscriptionWithPlan`.                                                                                         |
| `adminCreateSubscription(input)`     | requireAgencyOwner + isAgencyModeEnabled | Creates a new client subscription. Validates with `subscriptionCreateSchema`. Audit logged.                                                                              |
| `adminUpdateSubscription(id, input)` | requireAgencyOwner + isAgencyModeEnabled | Updates subscription fields (plan, billing cycle, custom pricing, feature overrides, notes). Validates with `subscriptionUpdateSchema`. Audit logged.                    |
| `adminCancelSubscription(id)`        | requireAgencyOwner + isAgencyModeEnabled | Sets subscription status to `cancelled` and stamps `cancelled_at`. Audit logged.                                                                                         |
| `listInvoices(subscriptionId?)`      | requireAdminOrViewer                     | Lists invoices for a given subscription (or all if agency owner and no ID passed). Returns `SubscriptionInvoiceRow[]`.                                                   |
| `adminCreateInvoice(input)`          | requireAgencyOwner + isAgencyModeEnabled | Creates a billing invoice record for a subscription. Validates with `invoiceCreateSchema`. Audit logged.                                                                 |
| `adminUpdateInvoice(id, input)`      | requireAgencyOwner + isAgencyModeEnabled | Updates invoice fields (status, paid_at, invoice_provider, invoice_number, invoice_url, notes). Validates with `invoiceUpdateSchema`. Audit logged.                      |

### `src/lib/actions/subscription-payments.ts` (~1102 lines)

| Function                                     | Guard                | What it does                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startSubscriptionPayment(planId, cycle)`    | requireAdmin         | Initiates a Barion recurring payment for a subscription plan. Validates plan exists, resolves effective price, calls `startSubscriptionCheckout()`, creates/updates subscription record with `awaiting_payment` equivalent state, logs payment event. Returns Barion redirect URL.                |
| `handleSubscriptionCallback(paymentId)`      | Internal (API route) | Processes Barion server-to-server callback. Verifies payment via `verifySubscriptionPayment()`, captures recurrence token on success, updates subscription status/billing period, creates invoice record, generates invoice via `generateSubscriptionInvoice()`, logs payment events. Idempotent. |
| `cancelMySubscription()`                     | requireAdmin         | Self-service cancellation. Sets `cancelled_at` timestamp but keeps subscription active until `current_period_end`. Logs cancellation event. Audit logged.                                                                                                                                         |
| `getMySubscriptionWithPaymentInfo()`         | requireAdminOrViewer | Enhanced subscription read that returns payment metadata (recurrence token presence, funding source, last payment ID, grace period, renewal attempts, payment method) alongside standard subscription + plan data.                                                                                |
| `processSubscriptionRenewal(subscriptionId)` | Internal (cron)      | Processes a single subscription renewal. Calls `chargeRecurringPayment()` with stored token, handles success (reset period, create invoice, generate invoice doc) and failure (increment attempts, set grace period or suspend). Logs all events.                                                 |
| `findSubscriptionsDueForRenewal()`           | Internal (cron)      | Queries subscriptions where `current_period_end <= now()` AND status is active/past_due with a valid recurrence token. Returns list of subscription IDs due for automatic renewal.                                                                                                                |

### `src/lib/actions/blog.ts` (~670 lines)

| Function                        | Guard                | What it does                                                                                                                                             |
| ------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPublishedPosts(params)`     | Public (plan-gated)  | Paginated published posts with optional tag filter. Enriches with author names from profiles. Gated by `enableBlog` config + `enable_blog` plan feature. |
| `getPostBySlug(slug)`           | Public (plan-gated)  | Fetches single published post by slug with author name. Gated by blog feature flags.                                                                     |
| `getRelatedPosts(postId, tags)` | Public               | Fetches up to 3 related published posts by overlapping tags, excluding current post. Enriches with author names.                                         |
| `adminGetPosts(params)`         | requireAdminOrViewer | Lists all posts (published + draft) with search, status filter, pagination. Enriches with author names.                                                  |
| `adminGetPost(id)`              | requireAdminOrViewer | Single post by ID (any status) with author name. UUID validated via `uuidSchema`.                                                                        |
| `adminCreatePost(input)`        | requireAdmin         | Creates post with Zod validation, auto-slug generation (collision-safe with -2, -3 suffixes), sets `published_at` on publish. Audit logged.              |
| `adminUpdatePost(id, input)`    | requireAdmin         | Updates post fields. Handles publish state transitions (sets/clears `published_at`). Unique slug generation on slug change. Audit logged.                |
| `adminDeletePost(id)`           | requireAdmin         | Hard delete. Fetches post for audit metadata before deletion. Audit logged.                                                                              |
| `adminTogglePostPublished(id)`  | requireAdmin         | Toggles `is_published` flag. Sets `published_at` on first publish, clears on unpublish. Audit logged with `post.publish` / `post.unpublish` action.      |

**Blog feature gate:** All public actions check both `siteConfig.features.enableBlog` (static) and `getPlanGate().check("enable_blog")` (dynamic plan feature) via the `checkBlogEnabled()` helper.

- **Agency mode guard:** All 10 agency-owner-only actions (marked with `isAgencyModeEnabled` above) check `siteConfig.admin.enableAgencyMode` before proceeding. If disabled, they return `{ success: false, error: "Az ügynökségi mód nincs engedélyezve." }`. This allows the boilerplate to be used for non-agency businesses by setting `enableAgencyMode: false`.

### Self-Service Subscription Payments (FE-003 Extension)

26. **Self-Service Subscription Payment System:** Full self-service payment lifecycle built on top of FE-003. **Database:** Migration `018_self_service_subscription_payments.sql` — adds `suspended` to `subscription_status` enum, 6 new columns on `shop_subscriptions` (barion_recurrence_token, barion_funding_source, last_payment_id, grace_period_end, renewal_attempts, payment_method), 3 new columns on `subscription_invoices` (barion_payment_id, barion_trace_id, is_renewal), new `subscription_payment_events` table (10 columns, full audit trail). New RLS policies for admin self-service access. **Config:** `SubscriptionConfig` extended with `trialDays` (env-driven), `gracePeriodDays: 7`, `renewalRetryAttempts: 3`, `subscriptionRedirectUrls` (success/cancel paths). **Barion integration:** `barion/client.ts` rewritten (~530 lines) with 3 new functions: `startSubscriptionCheckout()` (customer-initiated, token capture), `chargeRecurringPayment()` (merchant-initiated, stored token), `verifySubscriptionPayment()` (token verification). Extended `PaymentStateResult` type. **Server actions:** `subscription-payments.ts` (~1102 lines, 6 exported functions): `startSubscriptionPayment`, `handleSubscriptionCallback`, `cancelMySubscription`, `getMySubscriptionWithPaymentInfo`, `processSubscriptionRenewal`, `findSubscriptionsDueForRenewal`. **API routes:** `/api/payments/barion/subscription-callback` (Barion S2S), `/api/cron/subscription-renewals` (hourly cron, CRON_SECRET). **Invoicing:** `invoicing/subscription-invoice.ts` — auto-generates invoices via existing Billingo/Számlázz.hu adapters on payment success and renewal. **Scheduler:** `vercel.json` with hourly cron config. **UI:** `PlanColumnHeader` rewritten as client component with "Előfizetés" CTA + downgrade prevention; `/admin/subscription` rewritten with self-service cancel (AlertDialog), status banners (cancelled/past_due/suspended), payment method card, payment redirect handling (?payment=success/cancel query params); `/admin/subscription/plans` updated with subscribe callback. `pnpm build` passes. `pnpm tsc --noEmit` passes.

---

## Integrations

**Status: COMPLETE** — All 3 integrations fully implemented with production-ready patterns.

### Barion (Payments)

| File                 | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `barion/client.ts`   | ~530  | API client: `startPayment()`, `getPaymentState()`, `verifyPayment()` (order payments). `startSubscriptionCheckout()` (customer-initiated recurring with token capture), `chargeRecurringPayment()` (merchant-initiated token-based charges), `verifySubscriptionPayment()` (checks token capture status). Test/prod URL switching. Full type definitions for Barion API request/response. Extended `PaymentStateResult` with `recurrenceResult`, `fundingSource`, `traceId`. |
| `barion/callback.ts` | 298   | Idempotent callback handler: verifies payment with Barion API, finds order by payment ID, skips if already in terminal state, decrements stock on success (with negative-stock guard, clamps to 0), updates order status + timestamps, sends receipt + admin notification emails (with payment method). Race condition protected via status IN clause.                                                                                                                       |

**Flow (Barion — Orders):** Checkout -> createOrderFromCart (status: `awaiting_payment`) -> startPaymentAction (calls Barion API, gets redirect URL) -> User pays on Barion -> Barion calls `/api/payments/barion/callback` -> handleBarionCallback (idempotent, updates order status, decrements stock, sends receipt + admin emails).

**Flow (Barion — Subscriptions):** Plan page -> startSubscriptionPayment (creates subscription, calls `startSubscriptionCheckout` with `RecurrenceType: "RecurringPayment"`, `InitiateRecurrence: true`) -> User pays on Barion (must have Barion wallet, `GuestCheckout: false`) -> Barion calls `/api/payments/barion/subscription-callback` -> handleSubscriptionCallback (captures recurrence token, activates subscription, creates invoice, generates invoice doc). **Renewals:** Hourly cron -> `findSubscriptionsDueForRenewal()` -> `processSubscriptionRenewal()` (calls `chargeRecurringPayment` with stored token, `RecurrenceType: "MerchantInitiatedPayment"`) -> success: reset billing period, create invoice | failure: increment attempts, grace period, eventual suspension.

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

| File                                | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invoicing/adapter.ts`              | 415   | Strategy pattern interface: `InvoicingAdapter` with `createInvoice()`, `getInvoice()`, `cancelInvoice()`. Three implementations: `BillingoAdapter` (REST API calls, per-item VAT rate via `billingoVatString()`, dynamic `payment_method`: "cash_on_delivery" for COD / "online_bankcard" for Barion, COD fee as separate line item), `SzamlazzAdapter` (XML API calls, per-item VAT rate and net price, dynamic `<fizmod>`: "Utánvét" for COD / "Bankkártya (online)" for Barion, COD fee as XML line item), `NullAdapter` (no-op fallback). Helper functions: `billingoVatString()`, `grossToNet()`, `grossToVat()`. Factory: `getInvoicingAdapter()` reads `INVOICING_PROVIDER` env var. Dev mode mock fallbacks. |
| `invoicing/subscription-invoice.ts` | ~180  | Subscription invoice generation wrapper. `generateSubscriptionInvoice(subscriptionId, invoiceId)` — maps subscription billing data to the `InvoicingAdapter.createInvoice()` format. Supports both Billingo and Számlázz.hu adapters. Called automatically on successful initial payments and renewals. Updates `subscription_invoices` record with provider name, invoice number, and download URL. Non-blocking (wrapped in try/catch).                                                                                                                                                                                                                                                                            |

---

## API Route Handlers

**Status: COMPLETE** — 7 endpoints.

| Route                                        | Method     | Auth               | Purpose                                                                                                           |
| -------------------------------------------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/api/payments/barion/callback`              | GET        | None (Barion S2S)  | Barion order payment callback. Always returns 200. Idempotent via order status check.                             |
| `/api/payments/barion/subscription-callback` | GET        | None (Barion S2S)  | Barion subscription payment callback. Processes initial payments and token capture. Returns 200. Idempotent.      |
| `/api/cron/subscription-renewals`            | GET        | CRON_SECRET header | Hourly cron job. Finds subscriptions due for renewal, processes each via `processSubscriptionRenewal()`.          |
| `/api/email/webhook/resend`                  | POST + GET | HMAC signature     | Resend webhook receiver. Processes bounce/complaint/delivered/opened/clicked. GET returns debug info in dev only. |
| `/api/email/abandoned-cart`                  | POST       | CRON_SECRET header | Triggered by Edge Function. Sends abandoned cart email for a specific order.                                      |
| `/api/newsletter/unsubscribe`                | GET        | Signed token       | One-click unsubscribe. Renders Hungarian HTML confirmation page. Idempotent.                                      |
| `/api/dev/test-emails`                       | GET        | Dev only           | Renders all email templates and sends to local Mailpit for visual QA. Returns 404 in production.                  |

### Edge Function

| Function         | Location                                                 | Purpose                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abandoned-cart` | `supabase/functions/abandoned-cart/index.ts` (132 lines) | Scheduled cron (30 min). Finds draft/awaiting_payment orders older than 2 hours with no abandoned_cart_sent_at. Posts to Next.js API for each (max 50/run). Stamps sent_at after success. |

### Vercel Cron Jobs

| Job                   | Schedule   | Route                             | Purpose                                                                                                                                                                    |
| --------------------- | ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subscription Renewals | Every hour | `/api/cron/subscription-renewals` | Finds subscriptions due for renewal (`current_period_end <= now()`), processes each via `processSubscriptionRenewal()`. Auth: `CRON_SECRET` header. Config: `vercel.json`. |

Configuration in `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/subscription-renewals", "schedule": "0 * * * *" }]
}
```

---

## Components Inventory

**Status: COMPLETE** — 66 component files total.

### Shared Components (12)

| Component             | File                                    | Type   | Purpose                                                                                                                                                                                                       |
| --------------------- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                | `shared/header.tsx`                     | Server | Auth-aware. Shows role-appropriate account link: Login (guest), Fiókom (customer), Admin (admin/viewer). CartDrawer trigger. Mobile nav.                                                                      |
| Footer                | `shared/footer.tsx`                     | Server | Site links, legal links, newsletter signup, copyright.                                                                                                                                                        |
| MobileNav             | `shared/mobile-nav.tsx`                 | Client | Extracted from header.tsx (FE-009). Mobile sheet nav with hamburger trigger. Cart link opens CartDrawer (closes mobile sheet first).                                                                          |
| AdminSidebar          | `shared/admin-sidebar.tsx`              | Client | 260px collapsible sidebar. Feature-flag-driven nav items. Agency viewer badge. Conditional "Ügynökségi kezelő" link (when `enableAgencyMode` + `isAgencyOwner`). Back to shop + sign out links. Mobile sheet. |
| AgencySidebar         | `shared/agency-sidebar.tsx`             | Client | `AgencyShell` component. 260px collapsible sidebar for agency route group. Nav items: Áttekintés, Ügyfelek, Csomagok. Back to admin + sign out links. Mobile sheet.                                           |
| Breadcrumbs           | `shared/breadcrumbs.tsx`                | Client | Configurable breadcrumb trail.                                                                                                                                                                                |
| CartCount             | `shared/cart-count.tsx`                 | Client | Cart item count badge in header. Uses `mounted` state guard to prevent Zustand persist hydration mismatch (server renders null, client defers real count to post-mount effect).                               |
| LoadingSkeleton       | `shared/loading-skeleton.tsx`           | Server | Reusable skeleton placeholders.                                                                                                                                                                               |
| NewsletterForm        | `shared/newsletter-form.tsx`            | Client | Email input + subscribe button. Calls subscribe server action. Toast feedback.                                                                                                                                |
| CookieConsent         | `cookie-consent.tsx`                    | Client | GDPR cookie consent banner with accept all, reject, and settings toggles. Slide-up animation. Persisted to localStorage.                                                                                      |
| CookieSettingsButton  | `shared/cookie-settings-button.tsx`     | Client | Floating button to reopen cookie consent settings. Used on cookie policy page.                                                                                                                                |
| CookieConsentProvider | `providers/cookie-consent-provider.tsx` | Client | Context provider for cookie consent state. Wraps app in root layout.                                                                                                                                          |

### Product Components (14)

| Component           | File                                | Type   | Purpose                                                                                                                                                                                              |
| ------------------- | ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ProductCard         | `product/product-card.tsx`          | Server | Card with image, title, price, compare-at price, category badges. Link to product detail.                                                                                                            |
| ProductGrid         | `product/product-grid.tsx`          | Server | Responsive grid of ProductCards.                                                                                                                                                                     |
| ProductDetailClient | `product/product-detail-client.tsx` | Client | Full product detail with variant state, price updates, extras checkboxes (FE-025), 30-day lowest price resolution per variant (FE-006), add to cart.                                                 |
| ProductFilters      | `product/product-filters.tsx`       | Client | Category select, price range, in-stock toggle, sort select. Updates URL params.                                                                                                                      |
| VariantSelector     | `product/variant-selector.tsx`      | Client | Button/chip-based variant selection. Updates parent state.                                                                                                                                           |
| Gallery             | `product/gallery.tsx`               | Client | Main image + thumbnail strip. Click to switch.                                                                                                                                                       |
| AddToCartButton     | `product/add-to-cart-button.tsx`    | Client | Button with loading state. Calls Zustand addItem + adds checked extras as separate cart items. CartDrawer auto-opens as add-to-cart confirmation (FE-009, replaces toast).                           |
| PriceDisplay        | `product/price-display.tsx`         | Server | Formats HUF price. Shows strikethrough for compare-at. EU Omnibus Directive: displays "Legalacsonyabb ár az elmúlt 30 napban" text with lowest 30-day price when product is discounted (FE-006).     |
| StockBadge          | `product/stock-badge.tsx`           | Server | Green/yellow/red badge based on stock level.                                                                                                                                                         |
| StarRating          | `product/star-rating.tsx`           | Client | Reusable star rating display with interactive and read-only modes. Supports half-star rendering. Configurable size and color. Used in review form (interactive) and review list/summary (read-only). |
| ReviewSummary       | `product/review-summary.tsx`        | Client | Review statistics panel: average rating with large star display, total review count, per-star distribution bar chart with percentages. Calls `getProductReviewStats`.                                |
| ReviewList          | `product/review-list.tsx`           | Client | Paginated review list with star ratings, verified purchase badges, reviewer names, dates, admin replies (indented). Calls `getProductReviews`. Load more pagination.                                 |
| ReviewForm          | `product/review-form.tsx`           | Client | Review submission form with interactive star rating, title, body textarea. Checks authentication, one-review-per-product, and plan gating. Edit/delete own review. Toast feedback.                   |
| ReviewSection       | `product/review-section.tsx`        | Server | Orchestrator component for the product review section. Renders ReviewSummary + ReviewList + ReviewForm. Gated by `siteConfig.features.enableReviews`.                                                |

### Cart/Checkout Components (5)

| Component           | File                             | Type   | Purpose                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CartDrawer          | `cart/cart-drawer.tsx`           | Client | Slide-out cart drawer (FE-009). Sheet trigger = cart icon + CartCount badge. Auto-opens when items added via Zustand subscribe. 3-second auto-close (cancelled on hover). Free shipping progress bar (15,000 Ft threshold). Empty state. Checkout + cart links. |
| CartLineItem        | `cart/cart-line-item.tsx`        | Client | Thumbnail, title, variant info, unit price, quantity controls, remove button, line total.                                                                                                                                                                       |
| CouponInput         | `cart/coupon-input.tsx`          | Client | Input + apply button. Calls applyCoupon server action. Shows discount amount or error.                                                                                                                                                                          |
| OrderSummary        | `cart/order-summary.tsx`         | Client | Subtotal, shipping fee, COD fee (optional, shown when > 0 as "Utánvét kezelési díj"), discount, total.                                                                                                                                                          |
| PickupPointSelector | `cart/pickup-point-selector.tsx` | Client | Dropdown selector for pickup points. Currently uses hardcoded mock data. Interface ready for real carrier API integration.                                                                                                                                      |

### Admin Components (9)

| Component            | File                               | Type   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DashboardCharts      | `admin/dashboard-charts.tsx`       | Client | Recharts bar charts for daily revenue + daily order count.                                                                                                                                                                                                                                                                                                                                               |
| OrderStatusBadge     | `admin/order-status-badge.tsx`     | Shared | Single source of truth for order status badge display. Uses `ORDER_STATUS_LABELS` and `ORDER_STATUS_BADGE_VARIANT` from `@/lib/constants/order-status`. Works in both Server Components and Client Components. Replaces 8+ inline StatusBadge duplications across admin/shop pages.                                                                                                                      |
| OrderNotes           | `admin/order-notes.tsx`            | Client | Internal notes panel for order detail. Add/delete notes (admin), read-only for agency viewers. 2000-char limit. Author name resolution. useReducer state management.                                                                                                                                                                                                                                     |
| ImageUpload          | `admin/image-upload.tsx`           | Client | `SingleImageUpload` + `GalleryImageUpload` — drag-and-drop / click-to-browse image upload. Uploads via `uploadProductImage` server action. Storage deletion on remove/replace via `deleteProductImage`. Gallery drag-and-drop reordering (HTML5 native) with position badges and visual drop indicator. Manual URL entry fallback. useReducer state.                                                     |
| PriceSparkline       | `admin/price-sparkline.tsx`        | Client | Lightweight SVG sparkline (~120px × 32px) for 30-day price history. Color-coded trend (green = decreasing, red = increasing, neutral = stable). Hover tooltip with price + date. Rendered next to base price input on admin product edit page. Uses `PriceHistoryPoint` type from `price-history-shared.ts`.                                                                                             |
| PlanComparisonTable  | `admin/plan-comparison-table.tsx`  | Server | Desktop full comparison table (>=1024px) with sticky header, plan columns, feature rows grouped by 7 categories. Current plan column highlighted. Accepts `currentPlanSortOrder`, `subscribingPlanId`, `onSubscribe` props for self-service subscription flow. FE-016.                                                                                                                                   |
| PlanComparisonMobile | `admin/plan-comparison-mobile.tsx` | Client | Mobile tabbed card view (<1024px) for plan comparison. One tab per plan, accordion-style collapsible feature categories. Uses shadcn Tabs component. Current plan tab highlighted. Accepts `currentPlanSortOrder`, `subscribingPlanId`, `onSubscribe` props. FE-016.                                                                                                                                     |
| PlanFeatureRow       | `admin/plan-feature-row.tsx`       | Server | Feature row component for comparison table. Renders feature label + per-plan values (checkmark/X for booleans, formatted number for numeric limits, "Korlátlan" for 0). Exports FEATURE_CATEGORIES, FEATURE_LABELS, and PlanFeatureListItem (mobile variant). FE-016.                                                                                                                                    |
| PlanColumnHeader     | `admin/plan-column-header.tsx`     | Client | Plan column header with name, description, price (monthly/annual), monthly equivalent, annual savings callout badge, "Jelenlegi csomagod" badge. **Self-service subscribe:** "Előfizetés" button triggers `onSubscribe` callback (replaces old mailto CTA). `subscribing` loading state. `isDowngrade` disables button with "Alacsonyabb csomag" label. Supports table and card layout variants. FE-016. |

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

**Status: COMPLETE** (base config + subscription payment config).

### `src/lib/config/site.config.ts` (~300 lines)

Fully typed `SiteConfig` with these sections:

| Section                   | Key Settings                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **store**                 | name: "Agency Store", legalName: "Agency Kft.", currency: HUF, Budapest address, phone, email                                                                                                                                                                                                                                                                                                                                                                         |
| **urls**                  | siteUrl (from env), supportEmail                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **features**              | enableAccounts: true, enableGuestCheckout: true, enableCoupons: true, enableReviews: true, enableMarketingModule: true, enableAbandonedCart: true, enableB2BWholesaleMode: false                                                                                                                                                                                                                                                                                      |
| **payments**              | provider: "barion", environment from env (test/prod), posKey env var name, redirectUrls. **COD config:** `cod.enabled: true`, `cod.fee: 590` (HUF surcharge), `cod.maxOrderAmount: 100_000` (orders above must pay online), `cod.allowedShippingMethods: ["home", "pickup"]`                                                                                                                                                                                          |
| **shipping.homeDelivery** | enabled: true, carriers: GLS, MPL, Express One                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **shipping.pickupPoint**  | enabled: true, carriers: Foxpost, GLS Automata, Packeta, MPL Automata, Easybox                                                                                                                                                                                                                                                                                                                                                                                        |
| **shipping.rules**        | baseFee: 1490, freeOver: 15000, defaultProductWeightGrams: 500, weightTiers: [{maxWeightKg:2, fee:1490}, {maxWeightKg:5, fee:1990}, {maxWeightKg:10, fee:2990}, {maxWeightKg:20, fee:4490}]                                                                                                                                                                                                                                                                           |
| **invoicing**             | provider from env (default "none"), mode: "manual"                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **admin**                 | agencyViewerEnabled: true, readonlyByDefaultForAgency: true, enableAgencyMode: true (toggles agency route group + agency server actions)                                                                                                                                                                                                                                                                                                                              |
| **email**                 | adminNotificationRecipients: [ADMIN_EMAIL env], sendSignupConfirmation: true, sendWelcomeEmail: true, sendAdminOrderNotification: true                                                                                                                                                                                                                                                                                                                                |
| **branding**              | logoText: "AGENCY", neutral black/white theme tokens                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **tax**                   | defaultVatRate: 27, availableRates: [5, 18, 27]. Used by product validators and invoicing adapters.                                                                                                                                                                                                                                                                                                                                                                   |
| **subscription**          | `defaultShopIdentifier` (from `SHOP_IDENTIFIER` env, default `"default"`), `enforceGating` (from `SUBSCRIPTION_ENFORCE_GATING` env, default `false`). `trialDays` (from `SUBSCRIPTION_TRIAL_DAYS` env, default `0`), `gracePeriodDays: 7`, `renewalRetryAttempts: 3`. `subscriptionRedirectUrls`: success → `/admin/subscription?payment=success`, cancel → `/admin/subscription?payment=cancel`. Used by `getPlanGate()` and self-service subscription payment flow. |

### Plan-Based Feature Gating

**Status: COMPLETE** — Implemented in `src/lib/security/plan-gate.ts` as part of FE-003.

`site.config.ts` remains the static base config. At runtime, `getPlanGate()` fetches the active `shop_subscriptions` record for the current shop (identified by `SHOP_IDENTIFIER` env var), merges the plan's `features` jsonb with `feature_overrides`, and returns a `PlanGate` object.

**API:**

- `gate.check(featureKey)` — returns `{ allowed: boolean, reason?: string }`. No subscription → `{ allowed: true }` (unlimited, dev-friendly).
- `gate.checkLimit(limitKey, currentCount)` — returns `{ allowed: boolean, limit?: number, current: number }`. No subscription → always allowed.

**Architecture:**

1. `site.config.ts` defines what the boilerplate supports (static booleans, deploy-time).
2. `getPlanGate()` resolves the dynamic plan layer at runtime per-request.
3. A feature must be enabled in BOTH static config AND active plan to be available.
4. A single codebase can be deployed for all clients — plan tier controls what each client can use.

**Per-client pricing model:**

- Plan prices are NOT hardcoded. They are stored in `shop_plans.base_monthly_price` / `base_annual_price`.
- Per-client overrides in `shop_subscriptions.custom_monthly_price` / `custom_annual_price`.
- Effective price: `subscription.custom_*_price ?? plan.base_*_price`.
- Annual billing: price set directly (discount is implicit).

**Feature gating UI pattern:**

- Locked features show a lock icon + "Premium" badge in sidebar/UI. Server actions validate plan limits before writes.
- Near-limit: yellow warning badge (e.g., "450/500 termék").
- Over-limit: hard block on creation — server action returns Hungarian error.

### `src/lib/config/hooks.ts` (118 lines)

| Hook              | Signature                           | Default                                              | Purpose                              |
| ----------------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `preCheckoutHook` | `(orderDraft) => orderDraft`        | Pass-through                                         | Mutate order before DB insert        |
| `postPaidHook`    | `(order) => void`                   | No-op                                                | Side effects after payment confirmed |
| `pricingHook`     | `(product, variant, user) => price` | Returns variant.price_override or product.base_price | Override pricing (e.g., wholesale)   |

API: `getHooks()`, `overrideHooks(partial)`, `resetHooks()`

### Zod Validators (8 files)

| File                         | Schemas                                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validators/blog.ts`         | slugSchema, postCreateSchema, postUpdateSchema, postListParamsSchema, adminPostListParamsSchema                                                                                                       |
| `validators/checkout.ts`     | addressSchema, contactSchema, homeDeliverySchema, pickupPointSchema, checkoutSchema (includes `paymentMethod: z.enum(["barion", "cod"])`)                                                             |
| `validators/coupon.ts`       | couponCreateSchema, couponApplySchema                                                                                                                                                                 |
| `validators/product.ts`      | vatRateSchema, variantSchema, productCreateSchema, productUpdateSchema                                                                                                                                |
| `validators/review.ts`       | reviewCreateSchema, reviewUpdateSchema (rating 1-5, title max 200, body max 2000)                                                                                                                     |
| `validators/subscriber.ts`   | subscribeSchema, unsubscribeSchema, tagSchema                                                                                                                                                         |
| `validators/subscription.ts` | planFeaturesSchema, planCreateSchema, planUpdateSchema, subscriptionCreateSchema, subscriptionUpdateSchema, subscriptionStatusSchema (includes `suspended`), invoiceCreateSchema, invoiceUpdateSchema |
| `validators/uuid.ts`         | uuidSchema                                                                                                                                                                                            |

Plus 15+ inline Zod schemas in individual action files.

---

## SEO & Performance

**Status: COMPLETE**

| Feature           | Status | Details                                                                                                                                                                                                                                 |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic sitemap   | DONE   | `src/app/sitemap.ts` — includes all active products (limit 5000, filtered by published_at), categories (limit 500), and 5 static pages. Priority weighting: home 1.0, products 0.9, individual products 0.8, categories 0.7, legal 0.3. |
| robots.txt        | DONE   | `src/app/robots.ts` — allows all crawlers on `/`. Disallows `/admin/`, `/agency/`, `/api/`, `/checkout/`, `/profile/`. Points to sitemap.                                                                                               |
| Per-page metadata | DONE   | Custom title/description on every route. Product pages have dynamic metadata from DB.                                                                                                                                                   |
| JSON-LD           | DONE   | Product structured data on `/products/[slug]` (Product schema with name, description, price, availability, image, AggregateRating from reviews when available).                                                                         |
| OpenGraph         | DONE   | Product pages include og:title, og:description, og:image.                                                                                                                                                                               |
| next/image        | DONE   | Used for product images with placeholder blur.                                                                                                                                                                                          |
| Loading skeletons | DONE   | `loading.tsx` files for products list and product detail pages.                                                                                                                                                                         |

---

## Testing

**Status: COMPLETE** — Unit, integration, and E2E tests.

### Unit Tests (Vitest) — 17 test files

| Test File                      | Location           | What it tests                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cart-math.test.ts`            | tests/unit/        | Cart subtotal calculation, quantity updates, item removal                                                                                                                                                                                                                                                                |
| `coupon-validation.test.ts`    | tests/unit/        | Coupon validity checks (dates, usage limits, min order, active status)                                                                                                                                                                                                                                                   |
| `order-totals.test.ts`         | tests/unit/        | Order total calculation with discounts and shipping                                                                                                                                                                                                                                                                      |
| `shipping.test.ts`             | tests/unit/        | Shipping fee calculation, free shipping threshold, weight tier lookup (getWeightTierFee), weight-based carrier fees, tier boundaries                                                                                                                                                                                     |
| `cart-store.test.ts`           | src/\_\_tests\_\_/ | Zustand cart store integration (add, remove, update, clear, persistence)                                                                                                                                                                                                                                                 |
| `coupon-schemas.test.ts`       | src/\_\_tests\_\_/ | Zod coupon schema validation                                                                                                                                                                                                                                                                                             |
| `order-shipping-utils.test.ts` | src/\_\_tests\_\_/ | Order and shipping utility functions                                                                                                                                                                                                                                                                                     |
| `checkout-validation.test.ts`  | src/\_\_tests\_\_/ | Checkout form Zod schema validation                                                                                                                                                                                                                                                                                      |
| `email-actions.test.ts`        | src/\_\_tests\_\_/ | Email action functions: signup confirmation, welcome, admin notification (15 tests)                                                                                                                                                                                                                                      |
| `order-notes.test.ts`          | src/\_\_tests\_\_/ | Order note CRUD actions: getOrderNotes, addOrderNote, deleteOrderNote (13 tests)                                                                                                                                                                                                                                         |
| `product-extras.test.ts`       | src/\_\_tests\_\_/ | Product extras CRUD: getProductExtras (6 tests), adminSetProductExtras (9 tests)                                                                                                                                                                                                                                         |
| `order-export.test.ts`         | src/\_\_tests\_\_/ | Order CSV export: filters, BOM, escaping, line items, empty results (16 tests)                                                                                                                                                                                                                                           |
| `vat-rate.test.ts`             | src/\_\_tests\_\_/ | VAT rate management: Zod validation, product create/update, invoicing helpers, TaxConfig, CSV export (21 tests)                                                                                                                                                                                                          |
| `scheduled-publishing.test.ts` | src/\_\_tests\_\_/ | Scheduled publishing: publishedAt parsing, create/update actions, public query filters, sitemap filter (15 tests)                                                                                                                                                                                                        |
| `price-history.test.ts`        | src/\_\_tests\_\_/ | 30-day price history (FE-006): resolveLowest30DayPrice pure function (6 tests), getLowest30DayPrice server query (6 tests), getLowest30DayPriceMap batch grouping (3 tests), getPriceHistory chronological retrieval (5 tests)                                                                                           |
| `plan-gate.test.ts`            | src/\_\_tests\_\_/ | Plan gate logic: unlimited gate when no subscription, check() per feature key, checkLimit() with count comparisons, feature_overrides merging, enforceGating flag behavior (15 tests)                                                                                                                                    |
| `subscriptions.test.ts`        | src/\_\_tests\_\_/ | Subscription CRUD actions: listPlans, getPlan, adminCreatePlan, adminUpdatePlan, listSubscriptions, getSubscription, adminCreateSubscription, adminUpdateSubscription, adminCancelSubscription, listInvoices, adminCreateInvoice, adminUpdateInvoice. Zod validation, requireAgencyOwner guard, audit logging (45 tests) |

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

### Environment Variables (19 total)

| Variable                        | Scope  | Purpose                                                                                |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public | Supabase project URL                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key                                                                 |
| `NEXT_PUBLIC_SITE_URL`          | Public | Site URL for client-side                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server | Supabase service role (bypasses RLS)                                                   |
| `BARION_POS_KEY`                | Server | Barion payment POS key                                                                 |
| `BARION_ENVIRONMENT`            | Server | `test` or `prod`                                                                       |
| `RESEND_API_KEY`                | Server | Resend email API key                                                                   |
| `RESEND_FROM_EMAIL`             | Server | Transactional sender address                                                           |
| `RESEND_MARKETING_FROM_EMAIL`   | Server | Marketing sender address                                                               |
| `RESEND_TEST_RECIPIENT`         | Server | Dev-only: redirect all emails to this address                                          |
| `RESEND_WEBHOOK_SECRET`         | Server | Resend webhook HMAC signing secret                                                     |
| `INVOICING_PROVIDER`            | Server | `billingo`, `szamlazz`, or `none`                                                      |
| `BILLINGO_API_KEY`              | Server | Billingo API key                                                                       |
| `SZAMLAZZ_AGENT_KEY`            | Server | Szamlazz.hu agent key                                                                  |
| `CRON_SECRET`                   | Server | Shared secret for cron-triggered API calls                                             |
| `UNSUBSCRIBE_SECRET`            | Server | HMAC key for newsletter unsubscribe tokens                                             |
| `ENABLE_ABANDONED_CART`         | Server | Edge Function toggle                                                                   |
| `SITE_URL`                      | Server | Edge Function callback URL                                                             |
| `SHOP_IDENTIFIER`               | Server | Identifies which shop's subscription to load in `getPlanGate()` (default: `"default"`) |
| `SUBSCRIPTION_ENFORCE_GATING`   | Server | Set to `"true"` to block when no subscription found; default is open access            |
| `SUBSCRIPTION_TRIAL_DAYS`       | Server | Number of free trial days for new subscriptions (default: `0` = no trial)              |

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
| Reviews                | 9     | 7 customer reviews (mix of approved/pending, 3-5 stars, verified/unverified) + 2 admin replies                                 |

---

## Known Issues & Minor Gaps

These are small issues or architectural notes. All former "spec gaps" and "planned features" have been moved to the **Feature Roadmap** below with full enterprise-level specifications (see FE-000 through FE-045).

### Bugs

1. **Broken link in `/checkout/success`:** Links to `/account/orders` but the actual route is `/profile/orders`. ? Fixed in **FE-000**.
2. **robots.ts disallows wrong path:** Disallows `/account/` which doesn't exist. Should be `/profile/`. ? Fixed in **FE-000**.

### Architecture Notes

3. **Checkout/admin components are inline:** ~~CheckoutStepper, AddressForm, ShippingMethodSelector, DataTable, StatusBadge, ConfirmDialog, ProductForm, OrderDetailPanel are built inline within their pages rather than extracted as reusable components.~~ → **Resolved in FE-005.** CheckoutStepper, AddressFields, FormField, ReviewSection, AdminPagination, StatusBadge (generic), StatusStepper, StatusTransitionButton, AddressDisplay, and toSlug() all extracted to standalone files. `ProductForm` extraction remains deferred (two 800–1000 line files with significant differences). `DataTable`, `ShippingMethodSelector`, and `ConfirmDialog` not yet extracted.
4. **Reviews FK — FIXED in migration 017:** The `reviews` table originally only referenced `auth.users(id)` for `user_id`. Migration `017_add_reviews_profiles_fk.sql` adds `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL`, enabling PostgREST to resolve `.select("*, profiles(full_name)")` joins natively. After applying the migration and regenerating types, the `as unknown as` casts in `reviews.ts` can be removed.
5. **Type system: generated types use `Json` for JSONB columns.** All JSONB columns (addresses, features, variant_snapshot, metadata, page content) are typed as `Json` in `database.generated.ts`. Small shape types (`AddressJson`, `PlanFeaturesJson`, `VariantSnapshotJson`, etc.) in `database.ts` are used for **casting at point of use** only. Supabase SDK `.select("*")` type inference may differ from `Row` types in generated types — explicit `as XxxRow` casts are used where needed.

### Documentation Inaccuracies

4. **Test file count mismatch:** ~~PROJECT_STATUS.md claims 8 unit test files, but only 5 unique test files exist.~~ → Fixed in **FE-000** (missing tests written) and **FE-007** (email-actions.test.ts added). Now 17 unit test files + 1 integration + 1 E2E = 19 Vitest/Playwright test suites, 429 total tests, 4 pre-existing failures in `checkout-validation.test.ts` (fixtures lack `paymentMethod` field, unrelated to any FE-003 work).

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
18. **FE-005 (Component Extraction Refactor):** Extracted 8+ inline components into standalone reusable files. **New component files:** `src/lib/utils/slug.ts` (`toSlug()` utility); `src/components/admin/pagination.tsx` (`AdminPagination` with `onPageChange` callback, `suffix` prop); `src/components/admin/status-badge.tsx` (generic `StatusBadge<T>` + `SUBSCRIBER_STATUS_CONFIG`); `src/components/checkout/checkout-stepper.tsx` (`CheckoutStepper`); `src/components/checkout/address-form.tsx` (`FormField`, `AddressFields`, `ReviewSection`); `src/components/admin/order-detail-components.tsx` (`StatusStepper`, `StatusTransitionButton`, `AddressDisplay`). **Pages updated:** checkout/page.tsx, admin/orders/[id]/page.tsx, orders-client.tsx, products-client.tsx, coupons/page.tsx, marketing/page.tsx, audit/page.tsx, products/new/page.tsx, categories/page.tsx. **ProductForm extraction deferred** (two 800–1000 line files with significant differences). `npm run build` passes with zero errors.
19. **FE-009 (CartDrawer — Slide-out Cart):** Replaces full-page `/cart` navigation from header with a slide-out Sheet drawer (Base UI Dialog). **New files:** `src/lib/store/ui.ts` (Zustand store, no persist: `cartDrawerOpen`, `openCartDrawer`, `closeCartDrawer`, `toggleCartDrawer`); `src/components/cart/cart-drawer.tsx` (controlled Sheet, `w-full sm:w-[420px]`, auto-opens via `useCartStore.subscribe` when item count increases, 3-second auto-close cancelled on hover, free shipping progress bar at 15,000 Ft, empty state, checkout + cart links, reuses `CartLineItem`); `src/components/shared/mobile-nav.tsx` (extracted from `header.tsx` to support `useUIStore` — cart link now closes mobile sheet then opens CartDrawer). **Modified files:** `header.tsx` (cart `<Link>` replaced with `<CartDrawer />`, inline `MobileNav` replaced with import); `add-to-cart-button.tsx` (toast removed — drawer opening IS the confirmation). Full `/cart` page remains intact as secondary path.
20. **FE-003 (Plan Subscription Management System):** Full agency SaaS billing backbone. **Database:** 3 new tables (`shop_plans`, `shop_subscriptions`, `subscription_invoices`), 1 new enum (`subscription_status`), `is_agency_owner boolean` column on `profiles`, migration `013_plan_subscription_system.sql`. **Security:** `src/lib/security/plan-gate.ts` — `getPlanGate()` factory with `check()` and `checkLimit()`; no subscription → unlimited (dev-friendly). `requireAgencyOwner()` and `isAgencyOwner()` added to `roles.ts`. **Middleware:** `/agency/*` routes protected by `is_agency_owner` flag in session (`src/proxy.ts`). **Validators:** `src/lib/validators/subscription.ts` — 7 Zod schemas (planFeatures, planCreate/Update, subscriptionCreate/Update, invoiceCreate/Update). **Server actions:** `src/lib/actions/subscriptions.ts` — 14 exported functions (full CRUD for plans, subscriptions, invoices + `getMySubscription()` and `getMyInvoices()` for shop owners). **Agency mode guard:** `isAgencyModeEnabled()` checks `siteConfig.admin.enableAgencyMode`; all 10 agency-owner actions return error when disabled. **Existing actions updated:** `adminCreateProduct` and `adminCreateCategory` now check plan limits via `getPlanGate().checkLimit()`. **Config:** `subscription` key + `admin.enableAgencyMode` added to `site.config.ts`. **Agency route group:** Dedicated `(agency)` route group with own layout + `AgencyShell` sidebar component. 4 agency pages: dashboard (`/agency`), clients list (`/agency/clients`), client detail (`/agency/clients/[id]`), plans CRUD (`/agency/plans`). **Admin changes:** `/admin/subscription` rewritten as read-only (uses `getMySubscription()` + `getMyInvoices()`); `/admin/subscription/plans` rewritten as read-only comparison cards with monthly/annual toggle; admin sidebar updated with conditional "Ügynökségi kezelő" link (visible when `enableAgencyMode && isAgencyOwner`). Old `/admin/agency/` directory deleted. **Seed:** `admin@agency.test` marked `is_agency_owner = true`, demo subscription for `demo-bolt`, 2 demo invoices. **Tests:** 60 new unit tests — `plan-gate.test.ts` (15) + `subscriptions.test.ts` (45), all passing. 425/429 total (4 pre-existing failures unrelated).

---

### Reviews & Type System

21. **FE-010 (Reviews System):** Full customer review system with moderation. **Database:** `reviews` table (uuid PK, product_id FK CASCADE, user_id FK to auth.users SET NULL, rating 1-5, title max 200, body max 2000, status enum `review_status` (pending/approved/rejected), is_verified boolean, admin_reply, admin_reply_at, timestamps). UNIQUE(product_id, user_id) — one review per user per product. 3 indexes. RLS: public SELECT (approved only), authenticated INSERT (own), admin full. `product_review_stats` regular VIEW aggregating average_rating, review_count, per-star distribution from approved reviews. Migration: `014_reviews.sql`. **Validators:** `src/lib/validators/review.ts` — reviewCreateSchema, reviewUpdateSchema. **Server actions:** `src/lib/actions/reviews.ts` — 11 exported functions (getProductReviews, getProductReviewStats, getUserReview, createReview with verified-purchase auto-detection and plan gating, updateReview, deleteReview, adminListReviews, adminGetReviewStats, adminUpdateReviewStatus, adminReplyToReview, adminBulkUpdateStatus). **Components:** 5 new files in `src/components/product/`: `star-rating.tsx` (interactive + read-only, half-star), `review-summary.tsx` (stats panel with bar chart), `review-list.tsx` (paginated with verified badges), `review-form.tsx` (submit/edit/delete with auth checks), `review-section.tsx` (orchestrator, feature-gated). **Admin page:** `/admin/reviews` — moderation dashboard with stats cards, tab filtering, per-review approve/reject/reply, bulk actions. "Értékelések" nav in admin sidebar (gated by `enableReviews`). **Product page integration:** ReviewSection rendered below product detail. JSON-LD AggregateRating added when reviews exist. **Config:** `enableReviews: true` in siteConfig.features. Plan gating via `enable_reviews` in plan features JSON. **Seed:** 9 reviews (7 customer reviews with mix of ratings/statuses/verified + 2 admin replies). `pnpm build` passes cleanly.
22. **Type System Overhaul:** Migrated all TypeScript types from hand-coded definitions to auto-generated types from `supabase gen types`. **Database migration 016** (`016_convert_text_checks_to_pg_enums.sql`): converted 5 text+CHECK columns to proper PostgreSQL enums — `payment_method` (orders), `discount_type` (coupons), `invoice_status` (subscription_invoices), `billing_cycle` (shop_subscriptions), `shipping_method` (orders). Plus created `review_status` enum for the reviews table. **Generated types:** `src/lib/types/database.generated.ts` is now the auto-generated source of truth (via `supabase gen types typescript`). **Convenience aliases:** `src/lib/types/database.ts` rewritten as a minimal re-export file (~265 lines) using `Tables<'table_name'>`, `TablesInsert<'table_name'>`, `TablesUpdate<'table_name'>`, and `Enums<'enum_name'>` helpers. Manual JSONB shape types kept for casting: `AddressJson`, `PlanFeaturesJson`, `VariantSnapshotJson`, `PickupPointJson`, `AboutUsContent`, `ReviewStats`. **Codebase-wide type fixes:** ~25 files updated with proper casts for JSONB fields (`as AddressJson`, `as PlanFeaturesJson`, `as Json`), explicit `as XxxRow` casts where SDK inference differs from generated types, and updated test fixtures. All 10 new PostgreSQL enums properly typed. `pnpm build` passes with zero TypeScript errors and zero ESLint errors.

### Bug Fixes

23. **CartCount hydration mismatch fix:** `CartCount` (`src/components/shared/cart-count.tsx`) had a React hydration error caused by Zustand's `persist` middleware. Server rendered `null` (cart count 0), but client immediately rendered the visible badge after localStorage rehydration. Fixed by adding a `mounted` state guard (`useState(false)` + `useEffect`) that defers rendering the persisted count until after the first client render, ensuring server/client output matches exactly.

### Tooling

24. **Prettier configuration:** Complete Prettier setup with `prettier-plugin-tailwindcss` for automatic Tailwind class sorting. Config: `semi: false`, `singleQuote: false`, `trailingComma: "all"`, `tabWidth: 2`, `printWidth: 100`, `endOfLine: "lf"`. Scripts: `pnpm format` (write) and `pnpm format:check` (CI check). `.prettierignore` excludes `.next/`, `node_modules/`, `pnpm-lock.yaml`, and build artifacts. ESLint integration via `eslint-config-prettier` (already installed).

### Blog

25. **FE-022 (Blog System):** Full blog with admin CRUD, public pages, Markdown editor, SEO, and tag filtering. **Database:** `posts` table (uuid PK, slug UNIQUE, title, excerpt, content_html, cover_image_url, author_id FK to auth.users, is_published, published_at, tags text[], meta_title, meta_description, timestamps). Indexes on slug, is_published, published_at, tags (GIN). RLS: public SELECT (published only), admin full CRUD. `updated_at` trigger. Migration: `015_blog.sql`. **Types:** `PostRow`, `PostInsert`, `PostUpdate` + enriched `PostSummary`, `PostDetail`, `PostAdmin` in `database.ts`. `enable_blog` added to `PlanFeaturesJson`. **Config:** `enableBlog: boolean` in `siteConfig.features`. `enable_blog: "blog"` in plan-gate `FEATURE_LABELS`. **Validators:** `src/lib/validators/blog.ts` — `slugSchema`, `postCreateSchema`, `postUpdateSchema`, `postListParamsSchema`, `adminPostListParamsSchema`. **Server actions:** `src/lib/actions/blog.ts` — 9 exported functions (getPublishedPosts, getPostBySlug, getRelatedPosts, adminGetPosts, adminGetPost, adminCreatePost, adminUpdatePost, adminDeletePost, adminTogglePostPublished). Two-tier feature gate: `siteConfig.features.enableBlog` (static) + `getPlanGate().check("enable_blog")` (dynamic). Collision-safe slug generation with `-2, -3` suffixes. Author name enrichment via profiles join. **Admin pages:** `/admin/blog` (list with stats cards, search, status filter, pagination, toggle publish, delete), `/admin/blog/new` (3-column form with `@uiw/react-md-editor` lazy-loaded Markdown editor, cover image upload, tag input, SEO fields), `/admin/blog/[id]` (pre-populated edit form with delete, success feedback). "Blog" nav item (`Newspaper` icon) in admin sidebar, gated by `enableBlog` + `enable_blog`. **Public pages:** `/blog` (card grid with cover images, tag filtering via `?tag=` param, pagination, generateMetadata), `/blog/[slug]` (full post with cover hero, breadcrumbs, author, date, tags, `react-markdown` + `remark-gfm` rendering, related posts by tag overlap, OpenGraph metadata), `/blog/loading.tsx` (skeleton). **Navigation:** "Blog" added to header navLinks, footer shopLinks, and mobile nav. **Sitemap:** published posts added to `sitemap.ts` with blog static entry. **Dependencies:** `@uiw/react-md-editor`, `react-markdown`, `remark-gfm`, `@tailwindcss/typography` (prose styles). **Markdown flow:** Admin writes in Markdown editor → stored in `content_html` column → rendered via `react-markdown` with GFM on public page. `pnpm build` passes cleanly.

---

## Plan Tiers & Pricing

> **Key change:** Plan pricing is **NOT hardcoded** in the codebase. Prices are stored in the `shop_plans` table and can be overridden per client in `shop_subscriptions`. The values listed below are **recommended defaults** — the agency sets actual prices during client onboarding. Annual billing is supported with configurable discounts.

### Pricing Model

| Aspect                   | How it works                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base prices**          | Stored in `shop_plans.base_monthly_price` and `shop_plans.base_annual_price`. Set by agency admin.                                                                                                                              |
| **Per-client overrides** | `shop_subscriptions.custom_monthly_price` / `custom_annual_price` override the base plan price for a specific client.                                                                                                           |
| **Annual discount**      | Annual price is set directly (not a percentage). Discount is implicit: savings = (12 \* monthly) - annual. Typical range: 10-20% off.                                                                                           |
| **Billing cycle**        | Monthly or annual. Stored on `shop_subscriptions.billing_cycle`. Can be switched by agency admin.                                                                                                                               |
| **Effective price**      | `subscription.custom_*_price ?? plan.base_*_price` depending on billing cycle.                                                                                                                                                  |
| **Invoicing**            | Agency generates invoices for clients via the existing Billingo/Szamlazz adapter. Recorded in `subscription_invoices`.                                                                                                          |
| **Feature gating**       | Plan features are defined in `shop_plans.features` jsonb. Per-client overrides in `shop_subscriptions.feature_overrides`. Runtime resolution via `getPlanGate()` helper (returns `PlanGate` with `check()` and `checkLimit()`). |
| **UI enforcement**       | Locked features show a lock icon + "Premium" badge in sidebar/UI. Server actions validate plan limits before writes.                                                                                                            |

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

- `/admin/subscription` page: self-service subscription dashboard — view plan, usage, billing history, payment info, cancel subscription (with AlertDialog confirmation), payment redirect handling (Barion success/cancel)
- `/admin/subscription/plans` page: full plan comparison table with "Előfizetés" subscribe CTA (Barion recurring payment), downgrade prevention, cancelled subscription resubscribe flow

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
- Self-service subscription management pages (`/admin/subscription` with cancel, `/admin/subscription/plans` with subscribe via Barion)

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
