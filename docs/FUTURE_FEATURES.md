## Feature Roadmap

> **45 features** organized into 4 priority tiers. Each feature has a unique ID (FE-000 through FE-044) referenced throughout this document. Features are ordered by implementation priority within each tier.
>
> **Legend:** Status values are `NOT STARTED`, `IN PROGRESS`, `DONE`. Complexity is `XS` (< 1 day), `S` (1-2 days), `M` (3-5 days), `L` (1-2 weeks), `XL` (2+ weeks).

---

### P0 — Blocks Production (8 features)

These features MUST be completed before any client shop goes live.

---

#### FE-000: Bug Fixes & Documentation Corrections

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Priority**     | P0                                               |
| **Status**       | DONE                                             |
| **Plan Tier**    | N/A (internal)                                   |
| **Complexity**   | XS (< 1 day)                                     |
| **Dependencies** | None                                             |
| **Resolves**     | Known Issues #1, #2; Documentation Inaccuracy #4 |

**Business Justification:**
Two functional bugs exist in the codebase and the documentation overstates test coverage. These must be fixed before any client deployment to avoid broken user experiences and misleading project records.

**Bug 1 — Checkout success page broken link:**
The `/checkout/success` page contains a "Vissza a boltba" (Back to shop) link that navigates to an incorrect or non-existent route. The link must point to `/` (storefront home).

**Bug 2 — `robots.ts` static export issue:**
The `src/app/robots.ts` file may not be generating correctly as a static metadata route. Verify it outputs valid `robots.txt` content and is accessible at `/robots.txt`. If the dynamic route approach causes issues, convert to a static `public/robots.txt` file.

**Bug 3 — Test file count mismatch:**
PROJECT_STATUS.md (Testing section) claims 8 unit test files exist. Only 5 exist in the codebase:

- `currency.test.ts` — EXISTS
- `date.test.ts` — EXISTS
- `phone.test.ts` — EXISTS
- `product-utils.test.ts` — EXISTS
- `validation-schemas.test.ts` — EXISTS
- `cart-store.test.ts` — MISSING
- `coupon-schemas.test.ts` — MISSING
- `order-shipping-utils.test.ts` — MISSING

**Resolution options (pick one per missing file):**
A) Write the missing test file with meaningful test cases.
B) Remove the claim from PROJECT_STATUS.md if the underlying code is trivial or untestable.

**User Stories:**

- As a customer, I want the "Back to shop" link on the success page to work so I can continue shopping.
- As a developer, I want accurate documentation so I can trust PROJECT_STATUS.md as the source of truth.

**Database Changes:** None.

**Server Actions:** None.

**UI/UX Specification:**

- Fix the href on `/checkout/success` — change to `href="/"` or `href="/products"` as appropriate.
- Verify `/robots.txt` returns valid content with `User-agent: *` and `Sitemap:` directives.

**Configuration Changes:** None.

**Testing Requirements:**

- If option A chosen for missing tests: write `cart-store.test.ts` (test add, remove, update quantity, clear, hydration), `coupon-schemas.test.ts` (test coupon validation schemas), `order-shipping-utils.test.ts` (test shipping fee calculation, free shipping threshold).
- Manual verification: visit `/checkout/success` and click "Back to shop" link.
- Manual verification: `curl /robots.txt` returns valid robots content.

**Acceptance Criteria:**

1. `/checkout/success` "Vissza a boltba" link navigates to `/` or `/products`.
2. `/robots.txt` is accessible and contains valid directives.
3. PROJECT_STATUS.md test file count matches reality (either files written or count corrected).
4. `npm test` passes with no regressions.

**Edge Cases & Error Handling:**

- If `robots.ts` dynamic route is fundamentally broken in the current Next.js version, fall back to `public/robots.txt`.
- Missing test files: if the source code being tested doesn't exist either (e.g., no `coupon-schemas.ts`), remove the test file claim rather than creating a test for nonexistent code.

---

#### FE-001: Supabase Storage Image Upload

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| **Priority**     | P0                                             |
| **Status**       | DONE                                           |
| **Plan Tier**    | All plans                                      |
| **Complexity**   | M (3-5 days)                                   |
| **Dependencies** | None (storage bucket + RLS already configured) |
| **Resolves**     | Spec Gap #4 — no upload UI                     |

**Business Justification:**
Product images are the #1 factor in e-commerce conversion. Currently, admins must manually paste image URLs — there is no upload interface despite the `product-images` Supabase Storage bucket and RLS policies already being configured. Without this, no client can realistically manage their product catalog.

**User Stories:**

- As an admin, I want to drag-and-drop product images so I can quickly add visual content.
- As an admin, I want to reorder images so the primary/hero image appears first.
- As an admin, I want to delete images I no longer need to keep the catalog clean.
- As an admin, I want image upload validation so I don't accidentally upload oversized files.

**Database Changes:**
None — the `product-images` bucket and RLS policies already exist. The `products.images` column (text array of URLs) is already used.

**Server Actions:**
New file: `src/lib/actions/storage.ts`

```typescript
// Upload a product image to Supabase Storage
export async function uploadProductImage(formData: FormData): Promise<{ url: string; path: string }>

// Delete a product image from Supabase Storage
export async function deleteProductImage(path: string): Promise<void>

// Reorder product images (updates the images[] array order)
export async function reorderProductImages(productId: string, imageUrls: string[]): Promise<void>
```

- `uploadProductImage`: Validates file (type, size), generates unique path `{shopId}/{productId}/{uuid}.{ext}`, uploads to `product-images` bucket, returns public URL.
- `deleteProductImage`: Removes file from storage. Validates the path belongs to the current shop.
- `reorderProductImages`: Updates `products.images` array order. Validates all URLs belong to the product.

**Modifications to existing actions:**

- `adminCreateProduct` in `src/lib/actions/products.ts`: Accept `images: string[]` from the new upload component instead of manual URL text inputs.
- `adminUpdateProduct`: Same — replace text URL inputs with uploaded image URLs.

**UI/UX Specification:**
New component: `src/components/admin/image-upload.tsx` (`"use client"`)

- **Drop zone:** Dashed border area with "Huzd ide a kepeket vagy kattints a feltolteshez" (Drag images here or click to upload). Accepts click to open file picker.
- **Drag-and-drop reordering:** Use `@dnd-kit/sortable` for reordering thumbnails. First image = hero image (shown larger with "Fo kep" badge).
- **Thumbnail grid:** 4 columns on desktop, 2 on mobile. Each thumbnail shows:
  - Image preview (object-cover, rounded-md)
  - Delete button (X icon, top-right corner, with confirm)
  - Drag handle (grip icon, top-left corner)
  - Upload progress bar (during upload)
- **Constraints:**
  - Max 10 images per product
  - Max 5 MB per image
  - Accepted formats: JPEG, PNG, WebP
  - Client-side resize to max 2048px on longest edge before upload (use canvas API)
- **Loading state:** Skeleton placeholders during upload. Optimistic UI — thumbnail appears immediately with progress overlay.
- **Error state:** Red border on failed uploads with retry button. Toast notification with error message.

**Integration with ProductForm:**

- Replace the current manual URL text input fields in the product create/edit form with the `ImageUpload` component.
- The component manages its own state and calls server actions directly.
- On form submit, the parent form reads the current `imageUrls` from the component state.

**Configuration Changes:**
Add to `FeaturesConfig` in `site.config.ts`:

```typescript
imageUpload: {
  maxImages: 10,
  maxFileSizeMB: 5,
  maxResolution: 2048,
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
}
```

**Environment Variables:** None new — Supabase Storage uses the existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

**Testing Requirements:**

- Unit test: `storage.test.ts` — mock Supabase client, test upload validation (file size, type, count limits), test path generation, test delete authorization.
- Integration test: upload an image via the server action, verify it appears in the bucket, verify the public URL is accessible, delete it and verify removal.
- E2E: Create a product with 3 images via the admin form, verify they appear on the product detail page in correct order, reorder them, verify new order persists.

**Acceptance Criteria:**

1. Admin can upload images by drag-and-drop or file picker in the product form.
2. Images are stored in `product-images` Supabase Storage bucket with shop-scoped paths.
3. Client-side resize to max 2048px before upload.
4. File size validation (max 5 MB) with clear error message.
5. File type validation (JPEG, PNG, WebP only).
6. Max 10 images per product enforced.
7. Images can be reordered via drag-and-drop; first image is the hero.
8. Images can be deleted with confirmation dialog.
9. Upload progress is visible per image.
10. Product detail page shows images in the saved order.
11. Old manual URL text inputs are removed from the product form.

**Edge Cases & Error Handling:**

- Network failure mid-upload: show retry button on the failed thumbnail, don't lose already-uploaded images.
- User uploads 11th image: show toast "Maximum 10 kep toltheto fel" and reject.
- User uploads a 6 MB file: show toast "A fajl merete maximum 5 MB lehet" before upload starts (client-side check).
- Corrupt/unreadable image file: catch canvas resize error, show "A kep nem olvasható, kerjuk próbáljon masik fajlt."
- RLS policy denial: catch Supabase error, show "Nincs jogosultsaga a kep feltoltesehez."
- Deleting an image that's already been deleted from storage: handle 404 gracefully, still remove URL from product.images array.
- Product with existing URL-based images (legacy): display them as thumbnails but without the storage path — delete removes from images array only, not from storage.

---

#### FE-002: Cookie Consent & GDPR Compliance

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| **Priority**     | P0                                      |
| **Status**       | DONE                                    |
| **Plan Tier**    | All plans (legally mandatory)           |
| **Complexity**   | S (1-2 days)                            |
| **Dependencies** | None                                    |
| **Resolves**     | N/A (new feature, EU legal requirement) |

**Business Justification:**
EU ePrivacy Directive and GDPR require explicit consent before setting non-essential cookies or loading third-party tracking scripts. Every Hungarian webshop must have this. Without it, the shop is legally non-compliant from day one.

**User Stories:**

- As a visitor, I want to choose which cookie categories I consent to so my privacy is respected.
- As a visitor, I want to change my cookie preferences later via a footer link.
- As a shop owner, I want my webshop to be GDPR-compliant so I avoid fines.
- As a developer integrating analytics (FE-011), I want a consent API so I can conditionally load scripts.

**Database Changes:** None — consent is stored client-side in a cookie.

**Server Actions:** None — this is entirely client-side.

**UI/UX Specification:**
New component: `src/components/cookie-consent.tsx` (`"use client"`)

**Banner (first visit, no consent cookie):**

- Fixed position at bottom of viewport, full width, `z-50`.
- Background: `bg-background` with `border-t border-border`. Subtle `shadow-lg` upward.
- Content: "Ez a weboldal sutiket hasznal a legjobb felhasznaloi elmeny erdekeben." (This website uses cookies for the best user experience.)
- Three buttons:
  - "Osszes elfogadasa" (Accept all) — primary button, accepts all categories.
  - "Csak a szuksegesek" (Only necessary) — secondary/outline button, accepts necessary only.
  - "Testreszabas" (Customize) — text/link button, expands detail panel.
- **Customize panel** (expanded below the message):
  - Toggle switches for each category:
    - **Szukseges** (Necessary) — locked ON, disabled toggle, explanation: "A weboldal mukodesehez elengedhetetlen sutik."
    - **Analitika** (Analytics) — default OFF, explanation: "Segitenek megerteni, hogyan hasznaljak a latogatok az oldalt."
    - **Marketing** — default OFF, explanation: "Szemelyre szabott hirdetesek megjeleniteset teszik lehetove."
  - "Kivalasztottak mentese" (Save selections) button.
- **Animation:** Slide up from bottom, `transition-transform duration-500 ease-out`.
- **Mobile:** Same layout, buttons stack vertically.

**Cookie structure:**

```json
{
  "necessary": true,
  "analytics": false,
  "marketing": false,
  "timestamp": "2026-03-24T12:00:00Z"
}
```

- Cookie name: `cookie_consent`
- Expiry: 365 days
- SameSite: Lax
- Path: /

**Context provider:** `src/components/providers/cookie-consent-provider.tsx` (`"use client"`)

```typescript
interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}
const CookieConsentContext = createContext<{
  consent: CookieConsent | null;
  hasConsented: boolean;
  updateConsent: (consent: Partial<CookieConsent>) => void;
  openPreferences: () => void;
}>(...);
```

- Wrap the app layout with this provider.
- Other components (e.g., analytics scripts from FE-011) use `useCookieConsent()` to check consent before loading.

**Footer link:**

- Add "Cookie beallitasok" (Cookie settings) link to the storefront footer.
- Clicking it calls `openPreferences()` which re-shows the banner in customize mode.

**New page:** `/cookie-policy` (server component)

- Hungarian-language cookie policy page.
- Table listing all cookies used: name, purpose, category, duration, provider.
- Linked from the cookie consent banner and footer.
- Add to `src/app/(shop)/cookie-policy/page.tsx`.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
// In SiteConfig
cookieConsent: {
  enabled: true, // Can be disabled for development
  categories: ['necessary', 'analytics', 'marketing'],
}
```

**Testing Requirements:**

- Unit test: `cookie-consent.test.ts` — test consent state management, cookie read/write, default values.
- E2E: First visit shows banner ? click "Accept all" ? banner disappears ? cookie is set with all categories true ? refresh ? banner does not reappear.
- E2E: First visit ? click "Customize" ? toggle analytics ON, leave marketing OFF ? save ? cookie has analytics true, marketing false.
- E2E: Click footer "Cookie beallitasok" ? banner reappears in customize mode with current selections pre-filled.

**Acceptance Criteria:**

1. Cookie consent banner appears on first visit (no existing consent cookie).
2. "Accept all" sets all categories to true and dismisses the banner.
3. "Only necessary" sets analytics and marketing to false and dismisses the banner.
4. "Customize" reveals toggle switches for each category.
5. Necessary category is always ON and cannot be toggled off.
6. Selections are persisted in `cookie_consent` cookie for 365 days.
7. Banner does not reappear on subsequent visits if consent cookie exists.
8. Footer "Cookie beallitasok" link reopens the banner in customize mode.
9. `/cookie-policy` page exists with a table of all cookies.
10. `useCookieConsent()` hook returns current consent state for other components.
11. No third-party scripts (analytics, marketing) load before consent is given for their category.

**Edge Cases & Error Handling:**

- JavaScript disabled: banner won't render (acceptable — server-rendered pages still work, no non-essential cookies are set by default).
- Cookie blocked by browser: consent state falls back to necessary-only. Log a console warning.
- User clears cookies: banner reappears on next visit (correct behavior).
- Consent cookie is malformed/tampered: treat as no consent, show banner again.
- Multiple tabs: consent update in one tab may not reflect in others until refresh (acceptable).

---

#### FE-003: Plan Subscription Management System

| Field            | Value                                           |
| ---------------- | ----------------------------------------------- |
| **Priority**     | P0                                              |
| **Status**       | DONE                                            |
| **Plan Tier**    | Infrastructure (the billing system itself)      |
| **Complexity**   | XL (2+ weeks)                                   |
| **Dependencies** | None (builds on existing invoicing integration) |
| **Resolves**     | N/A (new core feature)                          |

**Business Justification:**
This is the SaaS business model backbone. Without plan management, the agency cannot onboard clients, bill them, or gate features by tier. Every other plan-gated feature depends on this system existing.

**User Stories:**

- As an agency admin, I want to create and manage plan tiers so I can offer different service levels.
- As an agency admin, I want to onboard new client shops with a specific plan and custom pricing.
- As an agency admin, I want to view all client subscriptions in one dashboard.
- As an agency admin, I want to upgrade/downgrade a client's plan, change pricing, or cancel their subscription.
- As an agency admin, I want to generate invoices for client subscriptions using our existing invoicing system.
- As a shop owner (admin), I want to see my current plan, usage, and billing history.
- As a shop owner, I want to see what features I'd get by upgrading.

**Database Changes:**
Migration: `005_plan_subscription_system.sql`

**New enum:**

```sql
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
```

**New table: `shop_plans`**

```sql
CREATE TABLE shop_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                          -- e.g., 'Basic', 'Premium'
  slug text NOT NULL UNIQUE,                   -- e.g., 'basic', 'premium'
  description text,
  base_monthly_price int NOT NULL,             -- HUF
  base_annual_price int NOT NULL,              -- HUF
  features jsonb NOT NULL DEFAULT '{}',        -- feature flags + limits
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

`features` jsonb structure:

```json
{
  "max_products": 500,
  "max_admins": 1,
  "max_categories": 50,
  "delivery_options": 2,
  "search": true,
  "search_analytics": false,
  "reviews": true,
  "wishlist": true,
  "wishlist_analytics": false,
  "blog": true,
  "about_page": true,
  "csv_export": true,
  "csv_import": false,
  "csv_import_limit": 0,
  "flash_sales": false,
  "bundles": false,
  "gift_cards": false,
  "customer_segmentation": false,
  "loyalty_points": false,
  "multi_language": false,
  "social_proof": false,
  "bulk_actions": false,
  "scheduled_publishing": false,
  "webhooks": false,
  "meta_pixel": false,
  "barion_refund_api": false,
  "manual_product_relations": false,
  "cross_sell_in_cart": false,
  "multiple_notification_recipients": false,
  "daily_digest": false,
  "theme_customization": false,
  "b2b_wholesale": false,
  "weight_based_shipping": false,
  "auto_review_email": false,
  "back_in_stock": true,
  "order_export": true,
  "low_stock_alerts": true,
  "order_notes": true,
  "packing_slips": true,
  "vat_management": true,
  "guest_order_tracking": true,
  "cookie_consent": true,
  "price_history": true,
  "product_extras": true,
  "ga4_analytics": true
}
```

**New table: `shop_subscriptions`**

```sql
CREATE TABLE shop_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES profiles(id),          -- the shop owner
  plan_id uuid NOT NULL REFERENCES shop_plans(id),
  status subscription_status NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  custom_monthly_price int,                                -- NULL = use plan base price
  custom_annual_price int,                                 -- NULL = use plan base price
  feature_overrides jsonb DEFAULT '{}',                    -- per-client feature overrides
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  notes text,                                              -- agency internal notes about this client
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id)                                          -- one active subscription per shop
);
```

**New table: `subscription_invoices`**

```sql
CREATE TABLE subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES shop_subscriptions(id),
  amount int NOT NULL,                                     -- HUF
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  external_invoice_id text,                                -- Billingo/Szamlazz invoice ID
  external_invoice_url text,                               -- PDF download URL
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**New column on `profiles`:**

```sql
ALTER TABLE profiles ADD COLUMN is_agency_owner boolean NOT NULL DEFAULT false;
```

**RLS Policies:**

- `shop_plans`: SELECT for authenticated users (all can read plans). INSERT/UPDATE/DELETE for `is_agency_owner = true` only.
- `shop_subscriptions`: SELECT for own subscription (`shop_id = auth.uid()`) or `is_agency_owner = true`. INSERT/UPDATE/DELETE for `is_agency_owner = true` only.
- `subscription_invoices`: SELECT for own subscription's invoices or `is_agency_owner = true`. INSERT/UPDATE for `is_agency_owner = true` only.

**Seed data:**

```sql
-- Two default plans
INSERT INTO shop_plans (name, slug, base_monthly_price, base_annual_price, sort_order, features)
VALUES
  ('Basic', 'basic', 9900, 99900, 1, '{ ... }'),
  ('Premium', 'premium', 24900, 249900, 2, '{ ... }');
```

**Server Actions:**
New file: `src/lib/actions/subscriptions.ts`

```typescript
// Shop owner actions
export async function getShopSubscription(): Promise<ShopSubscription & { plan: ShopPlan }>
export async function getSubscriptionInvoices(
  filters: InvoiceFilters,
): Promise<PaginatedResult<SubscriptionInvoice>>
export async function getAvailablePlans(): Promise<ShopPlan[]>

// Agency admin actions (all require is_agency_owner = true)
export async function agencyListClients(
  filters: ClientFilters,
): Promise<PaginatedResult<ClientSubscription>>
export async function agencyGetClient(subscriptionId: string): Promise<ClientDetail>
export async function agencyCreateSubscription(
  input: CreateSubscriptionInput,
): Promise<ShopSubscription>
export async function agencyUpdateSubscription(
  id: string,
  input: UpdateSubscriptionInput,
): Promise<ShopSubscription>
export async function agencyPauseSubscription(id: string): Promise<void>
export async function agencyResumeSubscription(id: string): Promise<void>
export async function agencyCancelSubscription(id: string, reason: string): Promise<void>
export async function agencyCreateSubscriptionInvoice(
  subscriptionId: string,
): Promise<SubscriptionInvoice>

// Feature gating (used by other server actions)
export async function getPlanFeatures(shopId?: string): Promise<ResolvedFeatures>
export async function checkPlanLimit(
  feature: string,
  currentCount?: number,
): Promise<{ allowed: boolean; limit: number; current: number }>
```

**New file: `src/lib/security/plan-gate.ts`**

```typescript
export function getPlanFeatures(): Promise<PlanFeatures>
export function checkPlanLimit(feature: PlanLimitKey, currentCount?: number): Promise<void> // throws if limit exceeded
export function isPlanFeatureEnabled(feature: PlanFeatureKey): Promise<boolean>
export function getEffectivePrice(subscription: ShopSubscription, plan: ShopPlan): number
```

- `getPlanFeatures()`: Fetches plan features from `shop_plans.features`, merges with `shop_subscriptions.feature_overrides`. Subscription overrides take precedence.
- `checkPlanLimit()`: Called by write actions (e.g., `adminCreateProduct` calls `checkPlanLimit('max_products', currentProductCount)`). Throws `PlanLimitError` if exceeded.
- `isPlanFeatureEnabled()`: Boolean check for feature flags.
- `getEffectivePrice()`: Returns `custom_*_price ?? base_*_price` based on billing cycle.

**Modifications to existing actions:**

- `adminCreateProduct`: Add `await checkPlanLimit('max_products')` before insert.
- `adminCreateCategory`: Add `await checkPlanLimit('max_categories')` before insert.
- Any Premium-only action: Add `await isPlanFeatureEnabled('feature_name')` check.

**UI/UX Specification:**

**Page 1: `/admin/subscription` (shop owner view)**

- Server component. Shows current plan details.
- **Plan card:** Plan name, status badge (active/past_due/cancelled/trialing), billing cycle, next billing date.
- **Usage meters:** Visual progress bars for limited features (products: 142/500, admins: 1/1, categories: 12/50).
- **Billing history table:** Date, amount, period, status, download invoice PDF link.
- **"Tervek megtekintese" (View plans)** button ? links to `/admin/subscription/plans`.

**Page 2: `/admin/agency/clients` (agency admin only)**

- Server component. Paginated table of all client subscriptions.
- Columns: Shop name, plan, status, billing cycle, monthly amount, next billing, actions.
- Search by shop name/email.
- Filter by plan, status.
- "Uj ugyfel" (New client) button ? create subscription modal/page.
- Row click ? `/admin/agency/clients/[id]`.

**Page 3: `/admin/agency/clients/[id]` (agency admin only)**

- Server component. Single client detail.
- **Subscription section:** Current plan, status, pricing (base vs custom), billing cycle, dates.
- **Edit form:** Change plan, custom pricing, billing cycle, feature overrides, notes.
- **Action buttons:** Pause, Resume, Cancel (with confirmation dialog and reason field).
- **Billing history:** Same invoice table as shop owner view, plus "Szamla keszitese" (Generate invoice) button.

**Middleware changes:**

- `/admin/agency/*` routes: Require `role === 'admin' AND is_agency_owner === true`. Regular admins see 404.
- Implement in `src/middleware.ts` or in a server-side layout guard.

**Sidebar changes:**

- Add "Elofizetes" (Subscription) nav item for all admins ? `/admin/subscription`.
- Add "Ugyfelek" (Clients) nav item for agency admins only ? `/admin/agency/clients`. Show only if `is_agency_owner`.
- Non-available features show lock icon + "Premium" badge. Clicking locked items opens upsell modal pointing to `/admin/subscription/plans`.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
subscription: {
  trialDays: 14,               // Default trial period
  gracePeriodDays: 7,          // Days after payment due before suspension
}
```

**Environment Variables:** None new — uses existing Supabase and invoicing credentials.

**Testing Requirements:**

- Unit test: `plan-gate.test.ts` — test feature resolution (plan features, overrides, merge logic), limit checking (at limit, over limit, no limit set), price calculation.
- Unit test: `subscriptions.test.ts` — test authorization (agency admin vs regular admin), test CRUD validation schemas.
- Integration: Create a subscription via agency action, verify it appears in shop owner's view, generate an invoice, verify it links to invoicing adapter.
- E2E: Agency admin creates client ? client logs in and sees their plan ? agency admin upgrades plan ? client sees updated features.

**Acceptance Criteria:**

1. `shop_plans`, `shop_subscriptions`, `subscription_invoices` tables created with correct schema.
2. `is_agency_owner` column added to `profiles`.
3. RLS policies enforce proper access control.
4. Agency admin can CRUD subscriptions for any client.
5. Agency admin can set custom pricing per client.
6. Agency admin can set feature overrides per client.
7. Agency admin can generate invoices via existing invoicing adapter.
8. Shop owner can view their plan, usage, and billing history.
9. `checkPlanLimit()` blocks writes when limits are exceeded.
10. `isPlanFeatureEnabled()` correctly resolves plan + override features.
11. Locked sidebar items show lock icon and "Premium" badge.
12. Clicking locked items shows upsell modal.
13. `/admin/agency/*` routes are inaccessible to non-agency admins.
14. Seed data includes Basic and Premium plans with correct feature sets.

**Edge Cases & Error Handling:**

- Shop with no subscription: treat as "no plan" — all features locked except viewing the plans page. Show "Nincs aktiv elofizetes" (No active subscription) banner.
- Expired trial: status changes to `past_due`. Grace period begins. After grace period, features lock but data is preserved.
- Agency admin tries to delete a plan that has active subscriptions: block with error "X aktiv elofizetes van ezen a terven" (X active subscriptions on this plan).
- Concurrent plan limit check: use SELECT...FOR UPDATE or optimistic check + constraint to prevent race conditions on product count.
- Feature override conflicts: subscription override always wins over plan default. If override is `null`, fall back to plan default.
- Invoice generation fails (Billingo/Szamlazz API error): save invoice as `draft` status, show error toast, allow retry.

---

#### FE-004: Product Cost Price & Profit Tracking

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| **Priority**     | P0                                                  |
| **Status**       | NOT STARTED                                         |
| **Plan Tier**    | All plans                                           |
| **Complexity**   | M (3-5 days)                                        |
| **Dependencies** | None                                                |
| **Resolves**     | N/A (planned feature, detailed in original roadmap) |

**Business Justification:**
Shop owners need to understand their profit margins to make informed pricing and stocking decisions. Revenue alone is meaningless without cost data. This is a core differentiator — most low-end e-commerce platforms don't offer profit tracking.

**User Stories:**

- As a shop owner, I want to enter cost prices for my products so I can track profit margins.
- As a shop owner, I want to see gross profit and margin on my dashboard so I know if my business is healthy.
- As a shop owner, I want variant-level cost prices because different variants may have different sourcing costs.

**Database Changes:**
Migration: `006_add_cost_price.sql`

```sql
ALTER TABLE products ADD COLUMN cost_price int;
ALTER TABLE product_variants ADD COLUMN cost_price int;

COMMENT ON COLUMN products.cost_price IS 'Wholesale/sourcing cost in HUF. Admin-only, never shown to customers.';
COMMENT ON COLUMN product_variants.cost_price IS 'Variant-level cost override. Takes precedence over product.cost_price when set.';
```

No new RLS — inherits existing product/variant policies (admin-only write).

**Server Actions:**
Modify `src/lib/actions/products.ts`:

- `adminCreateProduct`: Add `cost_price?: number` to input schema. Validate: positive integer if provided.
- `adminUpdateProduct`: Same.
- `adminCreateVariant` / `adminUpdateVariant` (if separate): Add `cost_price?: number`.

New helpers in `src/lib/actions/dashboard.ts` (or new file `src/lib/utils/profit.ts`):

```typescript
// Calculate profit for a single order
export function calculateOrderProfit(order: OrderWithItems): {
  profit: number
  hasFullCostData: boolean // true if ALL items had cost_price
  itemsWithCostData: number
  totalItems: number
}

// Dashboard KPIs
export async function getDashboardProfitKPIs(days: number): Promise<{
  grossProfit: number
  profitMargin: number // percentage
  itemsWithCostData: number
  totalItems: number
  dailyProfit: Array<{ date: string; profit: number; revenue: number }>
}>
```

**Profit calculation logic:**

1. For each order line item, resolve cost: `variant.cost_price ?? product.cost_price ?? null`.
2. If cost is null for an item, that item is excluded from profit calculation (not zero — excluded).
3. Item profit = `(item.unit_price - resolved_cost) * item.quantity`.
4. Order profit = sum of all item profits where cost is known.
5. `hasFullCostData` = true only if ALL items in the order had cost data.

**UI/UX Specification:**

**Product form changes:**

- New collapsible section "Koltseginformaciok" (Cost Information) in the product create/edit form, positioned after pricing section.
- Product-level field: "Beszerzesi ar (HUF)" — optional number input.
- In the variant builder rows: additional column "Beszerz. ar" — optional, per-variant override.
- Validation: if provided, must be positive integer. Show warning (yellow, not red) if `cost_price >= base_price` with text "Figyelem: a beszerzesi ar megegyezik vagy meghaladja az eladasi arat" (Warning: cost price equals or exceeds selling price).
- **Admin-only:** This section is never visible to customers. No cost data appears on storefront.

**Dashboard changes:**

- 2 new KPI cards (conditional — only shown if at least 1 product has `cost_price` set):
  - **"Brutto profit (30 nap)"** (Gross Profit 30d): formatted as HUF integer.
  - **"Profit marzs"** (Profit Margin %): percentage with 1 decimal.
- Both cards show an info tooltip: "A profit szamitas csak azokra a termékekre vonatkozik, amelyekhez van beszerzesi ar megadva." (Profit calculation only applies to products with cost price set.)
- Coverage indicator: "87/102 termeknel van beszerzesi ar" (87/102 products have cost price).
- Daily profit overlay line on the existing revenue bar chart (Recharts `ComposedChart` with `Bar` for revenue + `Line` for profit).

**Configuration Changes:** None.

**Testing Requirements:**

- Unit test: `profit.test.ts` — test `calculateOrderProfit` with: all items have cost, some items missing cost, no items have cost, variant cost overrides product cost, zero-margin items.
- Unit test: test `getDashboardProfitKPIs` aggregation logic.
- E2E: Set cost price on a product, place an order, verify dashboard shows profit KPI cards.

**Acceptance Criteria:**

1. `cost_price` column exists on both `products` and `product_variants`.
2. Admin product form has "Cost Information" section with product-level and variant-level cost fields.
3. Cost price is never visible on the storefront or in any customer-facing response.
4. Dashboard shows "Gross Profit" and "Profit Margin" KPI cards when cost data exists.
5. Profit calculation correctly uses variant cost override when available.
6. Items without cost data are excluded from profit calculation (not treated as zero cost).
7. Dashboard shows coverage indicator (X/Y products have cost price).
8. Revenue chart includes profit overlay line.
9. Warning shown when cost >= selling price.

**Edge Cases & Error Handling:**

- All products have no cost price: KPI cards are hidden entirely, no empty/zero state.
- Only 1 product has cost price: KPI cards appear but show a note about low coverage.
- Cost price > selling price (negative margin): display negative profit in red. Don't block — it's valid data (e.g., loss leaders).
- Bulk import (FE-020): CSV import must support `cost_price` column.
- Variant deleted: historical order profit is unaffected (uses snapshot data in order_items, not live product data).

---

#### FE-005: Component Extraction Refactor

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Priority**     | P0                                               |
| **Status**       | DONE                                             |
| **Plan Tier**    | N/A (internal, DX improvement)                   |
| **Complexity**   | M (3-5 days)                                     |
| **Dependencies** | None                                             |
| **Resolves**     | Architecture Gap #10 — inline components not DRY |

**Business Justification:**
Eight components are built inline within their respective page files rather than extracted as reusable standalone components. This makes the codebase harder to maintain, test, and iterate on. As more features are added, inline components become increasingly problematic for code reuse and consistency.

**User Stories:**

- As a developer, I want reusable components so I can build new features faster.
- As a developer, I want testable components so I can write unit tests for UI logic.
- As a developer, I want consistent UI patterns so the admin panel feels cohesive.

**Database Changes:** None.

**Server Actions:** None.

**Components to Extract:**

1. **`CheckoutStepper`** — Extract from checkout page flow.
   - Target: `src/components/checkout/checkout-stepper.tsx`
   - Props: `steps: string[]`, `currentStep: number`, `completedSteps: number[]`
   - Visual: horizontal step indicator with labels, numbered circles, connecting lines.

2. **`AddressForm`** — Extract from checkout address step.
   - Target: `src/components/checkout/address-form.tsx`
   - Props: `defaultValues?: Address`, `onSubmit: (address: Address) => void`, `isLoading?: boolean`
   - Fields: name, phone, zip, city, address line 1, address line 2 (optional).
   - Validation: Hungarian phone format, required fields.

3. **`ShippingMethodSelector`** — Extract from checkout shipping step.
   - Target: `src/components/checkout/shipping-method-selector.tsx`
   - Props: `methods: ShippingMethod[]`, `selected: string | null`, `onSelect: (id: string) => void`, `cartTotal: number`
   - Shows available shipping methods with prices, free shipping indicator.

4. **`DataTable`** — Extract from admin list pages (orders, products, customers).
   - Target: `src/components/admin/data-table.tsx`
   - Generic component: `DataTable<T>` with column definitions, sorting, pagination, optional search, optional row selection.
   - Props: `columns: ColumnDef<T>[]`, `data: T[]`, `pagination?: PaginationProps`, `searchPlaceholder?: string`, `onSearch?: (query: string) => void`, `selectable?: boolean`, `onSelectionChange?: (ids: string[]) => void`

5. **`StatusBadge`** — Extract from order detail/list pages.
   - Target: `src/components/admin/status-badge.tsx`
   - Props: `status: OrderStatus | SubscriptionStatus | string`, `size?: 'sm' | 'md'`
   - Maps status to color scheme (e.g., paid=green, pending=yellow, cancelled=red, shipped=blue).

6. **`ConfirmDialog`** — Extract from delete/cancel actions across admin.
   - Target: `src/components/admin/confirm-dialog.tsx`
   - Props: `open: boolean`, `onConfirm: () => void`, `onCancel: () => void`, `title: string`, `description: string`, `confirmText?: string`, `variant?: 'danger' | 'warning' | 'default'`, `isLoading?: boolean`
   - Uses shadcn `AlertDialog` under the hood.

7. **`ProductForm`** — Extract from product create/edit pages.
   - Target: `src/components/admin/product-form.tsx`
   - Props: `mode: 'create' | 'edit'`, `defaultValues?: Product`, `categories: Category[]`, `onSubmit: (data: ProductFormData) => Promise<void>`, `isLoading?: boolean`
   - Contains all product fields, variant builder, image upload (FE-001), cost price (FE-004).

8. **`OrderDetailPanel`** — Extract from order detail page.
   - Target: `src/components/admin/order-detail-panel.tsx`
   - Props: `order: OrderWithItems`, `onStatusChange?: (status: OrderStatus) => void`, `onPrint?: () => void`
   - Displays order summary, line items, customer info, shipping details, status controls.

**UI/UX Specification:**

- No visual changes — extraction must be pixel-perfect identical to current inline implementations.
- Each component gets its own file with TypeScript props interface exported.
- Components use absolute imports (`@/components/...`).
- Client components marked with `"use client"` only if they use hooks, event handlers, or browser APIs.
- Server components remain server components where possible (e.g., `StatusBadge` can be a server component).

**Configuration Changes:** None.

**Testing Requirements:**

- After extraction, run `npm run build` — zero type errors, zero build errors.
- Visual regression: manually verify each page that used inline components still looks identical.
- Write unit tests for extracted components that have logic: `StatusBadge` (status-to-color mapping), `ConfirmDialog` (open/close state), `DataTable` (sorting, pagination).

**Acceptance Criteria:**

1. All 8 components extracted to their own files in the correct directories.
2. Original pages updated to import from new component files.
3. TypeScript props interfaces are exported from each component file.
4. `npm run build` succeeds with zero errors.
5. No visual regressions on any page.
6. No inline component definitions remain in page files for these 8 components.
7. Components use absolute imports.
8. `"use client"` only where necessary.

**Edge Cases & Error Handling:**

- Component uses page-level state/context: pass as props or create a small context provider within the component.
- Component has server action calls inline: move action imports to the component file, ensure server actions are called correctly from client components (via form actions or `useTransition`).
- Circular imports: if a component imports something from its parent page, refactor to break the cycle.

---

#### FE-006: 30-Day Price History Tracking

| Field            | Value                                 |
| ---------------- | ------------------------------------- |
| **Priority**     | P0                                    |
| **Status**       | Done                                  |
| **Plan Tier**    | All plans (legal compliance)          |
| **Complexity**   | M (3-5 days)                          |
| **Dependencies** | None                                  |
| **Resolves**     | N/A (EU Omnibus Directive compliance) |

**Business Justification:**
The EU Omnibus Directive (potentially mandatory in Hungary from July 2026) requires online shops to show the lowest price from the last 30 days when a product is discounted. Non-compliance can result in fines. This must be built into every shop instance.

**User Stories:**

- As a customer, I want to see the lowest price in the last 30 days when a product is on sale so I know the discount is genuine.
- As a shop owner, I want automatic price history tracking so I'm legally compliant without manual effort.
- As an admin, I want to see a price history sparkline on the product form so I can review price trends.

**Database Changes:**
Migration: `007_price_history.sql`

```sql
CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  price int NOT NULL,
  compare_at_price int,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_lookup
  ON price_history (product_id, variant_id, recorded_at DESC);

-- Trigger: record price on product insert/update
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.base_price IS DISTINCT FROM OLD.base_price OR NEW.compare_at_price IS DISTINCT FROM OLD.compare_at_price THEN
    INSERT INTO price_history (product_id, variant_id, price, compare_at_price)
    VALUES (NEW.id, NULL, NEW.base_price, NEW.compare_at_price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_price_change
  AFTER INSERT OR UPDATE OF base_price, compare_at_price ON products
  FOR EACH ROW EXECUTE FUNCTION record_price_change();

-- Similar trigger for product_variants
CREATE OR REPLACE FUNCTION record_variant_price_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO price_history (product_id, variant_id, price)
    VALUES (NEW.product_id, NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_variant_price_change
  AFTER INSERT OR UPDATE OF price ON product_variants
  FOR EACH ROW EXECUTE FUNCTION record_variant_price_change();
```

**RLS Policies:**

- SELECT: public (anyone can read price history — it's shown on product pages).
- INSERT: none (only triggers insert).
- UPDATE/DELETE: admin only (for cleanup).

**Server Actions:**
New helper in `src/lib/utils/price-history.ts`:

```typescript
export async function getLowest30DayPrice(
  productId: string,
  variantId?: string,
): Promise<{ lowestPrice: number; date: string } | null>

export async function getPriceHistory(
  productId: string,
  variantId?: string,
  days?: number,
): Promise<Array<{ price: number; date: string }>>
```

**UI/UX Specification:**

**Product detail page (storefront):**

- When a product has `compare_at_price` > `base_price` (i.e., it's discounted):
  - Show: "Legalacsonyabb ar az elmult 30 napban: **X Ft**" below the price.
  - Font: text-sm text-muted-foreground.
  - Only shown when the product is currently discounted.
- When the product is NOT discounted: don't show anything.

**Admin product form:**

- Read-only price history sparkline (small inline chart, ~100px wide x 30px tall) next to the price field.
- Shows last 30 days of prices. Hover tooltip shows date + price.
- Uses a minimal SVG sparkline (no heavy chart library needed for this).

**Configuration Changes:** None.

**Testing Requirements:**

- Unit test: `price-history.test.ts` — test `getLowest30DayPrice` with: multiple prices in 30 days (returns lowest), no history (returns null), prices older than 30 days excluded, variant-specific vs product-level.
- Integration: Update product price ? verify trigger creates price_history record ? query lowest 30-day price ? verify correct value.
- E2E: Set compare_at_price on a product, verify storefront shows "Legalacsonyabb ar" text.

**Acceptance Criteria:**

1. `price_history` table created with correct schema and indexes.
2. Database trigger automatically records price changes for products and variants.
3. `getLowest30DayPrice()` returns the lowest price within the last 30 days.
4. Product detail page shows lowest 30-day price text when product is discounted.
5. Text is NOT shown when product is not discounted.
6. Admin product form shows price history sparkline.
7. Price history respects variant-level prices.
8. Old price records (>30 days) are excluded from the calculation but retained in the table.

**Edge Cases & Error Handling:**

- New product with no price history: `getLowest30DayPrice` returns null, no text shown.
- Product price changed multiple times in one day: all changes recorded, lowest is still correct.
- Variant with no price history but product has history: use product-level history for that variant.
- Price set to 0 (free product): record it, but don't show "lowest price" text for free products.
- Bulk price update (CSV import): triggers fire for each row — may generate many records. Acceptable; consider a cleanup job for records older than 90 days.
- Clock skew: use `now()` from database server, not client timestamp.

---

#### FE-007: Email Flow Completion

| Field            | Value                                                 |
| ---------------- | ----------------------------------------------------- |
| **Priority**     | P0                                                    |
| **Status**       | DONE                                                  |
| **Plan Tier**    | All plans                                             |
| **Complexity**   | S (1-2 days)                                          |
| **Dependencies** | None (email infrastructure via Resend already exists) |
| **Resolves**     | N/A (completing gaps in existing email system)        |

**Business Justification:**
The email system has templates and actions for some flows but is missing critical transactional emails: signup confirmation, welcome email, and admin order notification. These are table-stakes for any e-commerce platform — customers expect a confirmation when they register, and admins need to know when orders come in.

**User Stories:**

- As a new user, I want a confirmation email when I register so I know my account was created.
- As a new user, I want a welcome email after my first sign-in so I feel onboarded.
- As an admin, I want an email when a new order is paid so I can start fulfillment promptly.

**Database Changes:** None.

**Server Actions:**
Modify `src/lib/actions/email.ts` (or wherever email sending is handled):

```typescript
// New email sending functions
export async function sendSignupConfirmationEmail(params: {
  to: string
  name: string
}): Promise<void>

export async function sendWelcomeEmail(params: { to: string; name: string }): Promise<void>

export async function sendAdminOrderNotification(params: {
  orderId: string
  orderNumber: string
  customerName: string
  itemCount: number
  total: number
  shippingMethod: string
}): Promise<void>
```

**Trigger points:**

- `sendSignupConfirmationEmail`: Called after successful email/password signup (in the auth signup action or Supabase Auth webhook).
- `sendWelcomeEmail`: Called on first sign-in (check if `profiles.last_sign_in_at` was null before this sign-in).
- `sendAdminOrderNotification`: Called in the Barion callback handler when order status changes to `paid`. Sends to `siteConfig.store.email` (or a configurable admin notification email list from FE-012).

**Email Templates:**
New React Email templates in `src/lib/integrations/email/templates/`:

1. **`signup-confirmation.tsx`** — "Sikeres regisztracio" (Successful registration)
   - Content: Greeting, confirmation that account was created, link to login, link to start shopping.
   - CTA button: "Belepes" (Log in) ? `/login`

2. **`welcome.tsx`** — "Udvozoljuk!" (Welcome!)
   - Content: Friendly welcome, brief overview of what they can do (browse, order, track), support email.
   - CTA button: "Vasarlas megkezdese" (Start shopping) ? `/products`

3. **`admin-order-notification.tsx`** — "Uj rendeles erkezett" (New order received)
   - Content: Order number, customer name, item count, total, shipping method, direct link to admin order detail.
   - CTA button: "Rendeles megtekintese" (View order) ? `/admin/orders/[id]`
   - Style: minimal, information-dense (this is for admins, not marketing).

**UI/UX Specification:**
No new UI pages. These are backend email triggers.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
// In a new EmailConfig section or existing config
email: {
  adminNotificationRecipients: ['info@agency.hu'],  // FE-012 will make this configurable via admin UI
  sendSignupConfirmation: true,
  sendWelcomeEmail: true,
  sendAdminOrderNotification: true,
}
```

**Environment Variables:** None new — uses existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

**Testing Requirements:**

- Unit test: test that each email function calls the Resend API with correct template and parameters (mock Resend).
- Integration test: trigger a signup ? verify confirmation email was sent (check Resend logs or mock).
- Manual: register a new account, verify both signup confirmation and welcome emails are received.
- Manual: complete a test order through Barion, verify admin receives order notification email.

**Acceptance Criteria:**

1. Signup confirmation email sent after successful registration.
2. Welcome email sent on first sign-in.
3. Admin order notification email sent when order is paid.
4. All three email templates follow existing template styling/branding.
5. Admin notification includes order number, customer, items, total, and direct admin link.
6. Emails use the configured `RESEND_FROM_EMAIL` sender.
7. Email sending is non-blocking (don't delay the user's action if email fails).
8. Failed email sends are logged but don't throw errors to the user.

**Edge Cases & Error Handling:**

- User registers with OAuth (Google/GitHub): signup confirmation email may not be needed (they already confirmed via OAuth). Send welcome email on first sign-in instead.
- Resend API rate limit: queue emails or retry with backoff. Don't lose the email.
- Admin notification email fails: log the error, don't affect order processing. The order is still valid.
- User registers but never signs in: they get signup confirmation but not welcome email (correct behavior).
- Multiple admins: initially sends to single email from config. FE-012 will add configurable recipient list.

---

### P1 — First Client Launch (11 features)

## These features are needed for a competitive first client launch. Without them, the shop feels incomplete compared to Shopify/WooCommerce alternatives.

#### FE-008: Product Search with Autocomplete

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Priority**     | P1                                         |
| **Status**       | NOT STARTED                                |
| **Plan Tier**    | Basic = search, Premium = search analytics |
| **Complexity**   | L (1-2 weeks)                              |
| **Dependencies** | FE-003 (plan gating for analytics)         |
| **Resolves**     | N/A                                        |

**Business Justification:**
Search is the highest-intent navigation action in e-commerce. Visitors who use search convert 2-3x more than browsers. Without search, customers with a specific product in mind have no efficient way to find it.

**User Stories:**

- As a customer, I want to search for products by name so I can quickly find what I'm looking for.
- As a customer, I want autocomplete suggestions as I type so I don't have to finish typing or remember exact names.
- As a customer, I want a search results page with filters so I can narrow down results.
- As a shop owner (Premium), I want to see what customers search for so I can optimize my catalog.

**Database Changes:**
Migration: `008_product_search.sql`

```sql
-- Add tsvector column for full-text search
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Generate search vector from title + description using Hungarian config
-- (Falls back to 'simple' if 'hungarian' is not installed)
CREATE OR REPLACE FUNCTION products_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- GIN index for fast full-text search
CREATE INDEX idx_products_search_vector ON products USING gin(search_vector);

-- Backfill existing products
UPDATE products SET search_vector =
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'B');

-- Search logs table (Premium analytics)
CREATE TABLE search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  result_count int NOT NULL DEFAULT 0,
  user_id uuid REFERENCES profiles(id),
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_logs_query ON search_logs (query, created_at DESC);
```

**RLS Policies:**

- `search_logs`: INSERT for authenticated users (or public if guest search logging is desired). SELECT for admin only (analytics).

**Server Actions:**
New file: `src/lib/actions/search.ts`

```typescript
export async function searchProducts(params: {
  query: string
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest"
  page?: number
  limit?: number
}): Promise<{
  products: ProductCard[]
  totalCount: number
  query: string
}>

export async function searchAutocomplete(query: string): Promise<{
  products: Array<{ id: string; title: string; slug: string; price: number; image: string | null }>
}>

// Premium only
export async function getSearchAnalytics(days: number): Promise<{
  topQueries: Array<{ query: string; count: number; avgResults: number }>
  zeroResultQueries: Array<{ query: string; count: number }>
  totalSearches: number
  avgResultsPerSearch: number
}>
```

**Search logic:**

1. Parse query ? `plainto_tsquery('simple', query)`.
2. Match against `search_vector` using `@@` operator.
3. Rank by `ts_rank(search_vector, query)`.
4. If full-text returns < 3 results, fall back to `ILIKE '%query%'` on title for fuzzy matching.
5. Apply category/price filters, sorting, pagination.
6. Log the search query + result count to `search_logs` (non-blocking, fire-and-forget).
7. Autocomplete: same search but `LIMIT 5`, returns minimal fields.

**UI/UX Specification:**

**Header search (all pages):**

- Desktop: Search icon in header. Click expands an input field with smooth animation (`transition-all duration-300`). Input has focus ring.
- Mobile: Search icon in header. Click opens a fullscreen overlay with search input at top, results below.
- Input placeholder: "Keresés..." (Search...)
- Debounce: 300ms after last keystroke before firing autocomplete request.

**Autocomplete dropdown:**

- Max 5 results. Each result shows: product thumbnail (40x40), title, formatted price.
- Click result ? navigate to `/products/[slug]`.
- "Összes találat megtekintése" (View all results) link at bottom ? `/search?q=...`.
- Empty state (no results): "Nincs találat. Próbáljon más keresőszavakat." (No results. Try different search terms.)
- Loading state: 3 skeleton rows with shimmer.

**Search results page: `/search`**

- Query parameter: `?q=searchterm`.
- Reuses the existing product grid layout from `/products`.
- Filters: category, price range, sort by (relevance, price asc/desc, newest).
- Pagination (same as `/products`).
- Header: "Keresési eredmények: "searchterm" (X találat)" (Search results: "searchterm" (X results)).
- No results: friendly empty state with suggestions.

**Admin search analytics page: `/admin/search-analytics` (Premium only)**

- Top 20 search queries (last 30 days) — bar chart + table.
- Zero-result queries — table with count, sorted by frequency.
- Total searches, average results per search — KPI cards.
- Date range selector.

**Configuration Changes:** None (plan gating handles Premium restriction).

**Testing Requirements:**

- Unit test: `search.test.ts` — test query parsing, filter application, fallback to ILIKE, result count logging.
- Integration: insert products with known titles, search for them, verify correct results and ranking.
- E2E: type in header search ? see autocomplete ? click result ? navigate to product. Search for non-existent term ? see empty state.

**Acceptance Criteria:**

1. Products have `search_vector` column with GIN index.
2. Trigger automatically updates search vector on title/description change.
3. Header search with autocomplete works on all pages.
4. Autocomplete shows max 5 results with thumbnails, debounced at 300ms.
5. `/search` results page with filters and pagination.
6. Fallback to ILIKE when full-text returns < 3 results.
7. Search queries logged to `search_logs` table.
8. Admin search analytics page shows top queries and zero-result queries (Premium).
9. Mobile: fullscreen search overlay.
10. Empty state with helpful message when no results found.

**Edge Cases & Error Handling:**

- Very short query (1-2 chars): don't fire autocomplete, show "Írjon legalább 3 karaktert" (Type at least 3 characters).
- SQL injection via search query: parameterized queries prevent this. `plainto_tsquery` sanitizes input.
- Special characters in query (quotes, slashes): `plainto_tsquery` handles these gracefully.
- Hungarian characters (é, á, í, ó, ú, ö, ü, ő, ű): full-text search with 'simple' config handles these. Consider adding unaccented variant for better matching.
- Product marked as inactive (`is_active = false`): exclude from search results.
- Rate limiting: autocomplete fires frequently — consider caching recent queries for 60 seconds.

---

#### FE-009: CartDrawer (Slide-out Cart)

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| **Priority**     | P1                                                  |
| **Status**       | NOT STARTED                                         |
| **Plan Tier**    | All plans                                           |
| **Complexity**   | S (1-2 days)                                        |
| **Dependencies** | FE-005 (component extraction — cleaner integration) |
| **Resolves**     | Spec Gap #6                                         |

**Business Justification:**
A slide-out cart drawer (instead of navigating to a full cart page) reduces friction and keeps customers in the shopping flow. It's standard UX in modern e-commerce. The current implementation requires a full page navigation to `/cart`, which interrupts browsing.

**User Stories:**

- As a customer, I want to see my cart without leaving the current page so I can keep browsing.
- As a customer, I want to quickly update quantities or remove items from the cart overlay.
- As a customer, I want a "Go to checkout" button in the cart drawer for a fast path to purchase.

**Database Changes:** None (cart is managed via Zustand store in localStorage).

**Server Actions:** None (cart is client-side only).

**UI/UX Specification:**
New component: `src/components/cart/cart-drawer.tsx` (`"use client"`)

**Trigger:**

- Cart icon in header already exists. Change its behavior: instead of navigating to `/cart`, it opens the CartDrawer.
- Also triggered after "Kosárba" (Add to cart) button click on product pages — brief open + auto-close after 3 seconds, or stays open if user interacts.

**Drawer layout:**

- Slides in from the right side of the viewport. Width: `w-full sm:w-[420px]`. Full height.
- Background overlay: `bg-black/50` with click-to-close.
- **Header:** "Kosár (X)" (Cart (X)) with item count, close (X) button.
- **Body (scrollable):**
  - Each cart item: product thumbnail (64x64), title, variant info, unit price, quantity selector (- / input / +), remove button (trash icon).
  - Quantity changes update in real-time via Zustand store.
- **Footer (sticky):**
  - Subtotal: "Összesen: XX XXX Ft" formatted.
  - Free shipping indicator: "Még X Ft és ingyenes a szállítás!" if below threshold, or "Ingyenes szállítás!" checkmark if above.
  - "Pénztárhoz" (Checkout) button — navigates to `/checkout`.
  - "Kosár megtekintése" (View cart) link — navigates to full `/cart` page (which still exists for full cart management).
- **Empty state:** "A kosarad üres" (Your cart is empty) with "Vásárlás" (Shop) button ? `/products`.

**Animation:**

- Slide in: `translate-x-full ? translate-x-0`, `transition-transform duration-300 ease-out`.
- Slide out: reverse. Backdrop fades in/out.

**Integration with existing cart page:**

- `/cart` page continues to exist for customers who prefer a full-page view or share the URL.
- CartDrawer is the primary interaction; `/cart` is secondary.

**Accessibility:**

- Focus trap when drawer is open.
- Escape key closes drawer.
- `role="dialog"`, `aria-modal="true"`, `aria-label="Kosár"`.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit test: CartDrawer renders with items from Zustand store, quantity updates work, remove works.
- E2E: Add product to cart ? drawer opens ? verify item shows ? update quantity ? verify subtotal updates ? click checkout ? navigates to `/checkout`.

**Acceptance Criteria:**

1. Cart icon in header opens a slide-out drawer instead of navigating to `/cart`.
2. Drawer shows all cart items with thumbnails, prices, quantity selectors.
3. Quantity can be updated inline (minimum 1).
4. Items can be removed from the drawer.
5. Subtotal updates in real-time.
6. Free shipping threshold indicator is visible.
7. "Checkout" button navigates to `/checkout`.
8. "View cart" link navigates to full `/cart` page.
9. Empty state shown when cart is empty.
10. Drawer closes on backdrop click, Escape key, or X button.
11. Adding a product to cart auto-opens the drawer briefly.
12. Drawer is accessible (focus trap, aria attributes).

**Edge Cases & Error Handling:**

- Cart has 20+ items: body section scrolls independently, footer stays sticky.
- Product in cart is deleted/deactivated by admin: show item with "Ez a termék már nem elérhető" (This product is no longer available) label, allow removal but not quantity increase.
- Variant goes out of stock after being added to cart: show "Elfogyott" (Out of stock) label next to that item.
- Very long product title: truncate with ellipsis after 2 lines.
- Mobile: drawer takes full width. Close button is prominent.

---

#### FE-010: Reviews System

| Field            | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| **Priority**     | P1                                                       |
| **Status**       | NOT STARTED                                              |
| **Plan Tier**    | Basic (core reviews), Premium (admin analytics)          |
| **Complexity**   | L (1-2 weeks)                                            |
| **Dependencies** | FE-003 (plan gating)                                     |
| **Resolves**     | Feature flag `enableReviews` exists but nothing is built |

**Business Justification:**
Reviews build trust and increase conversion by 15-30% (industry average). The feature flag already exists in the codebase (`enableReviews: false`) but no review system is implemented. This is expected functionality for any e-commerce platform.

**User Stories:**

- As a customer, I want to read reviews before buying so I can make an informed decision.
- As a customer who purchased a product, I want to leave a review with a star rating and text.
- As an admin, I want to moderate reviews before they appear publicly.
- As an admin, I want to reply to reviews to address concerns or thank customers.
- As a customer, I want to see an average rating and rating distribution on product pages.

**Database Changes:**
Migration: `009_reviews.sql`

```sql
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  order_id uuid REFERENCES orders(id),               -- NULL if not tied to a verified purchase
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_verified_purchase boolean NOT NULL DEFAULT false, -- true if order_id is a completed order
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)                         -- one review per user per product
);

CREATE INDEX idx_reviews_product_status ON reviews (product_id, status, created_at DESC);
CREATE INDEX idx_reviews_user ON reviews (user_id);

-- Materialized view for review stats (or use a regular view)
CREATE VIEW product_review_stats AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE status = 'approved') AS review_count,
  ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 1) AS average_rating,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 5) AS five_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 4) AS four_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 3) AS three_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 2) AS two_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 1) AS one_star
FROM reviews
GROUP BY product_id;
```

**RLS Policies:**

- SELECT: public for approved reviews. Users can see their own pending/rejected reviews.
- INSERT: authenticated users only. Validate `user_id = auth.uid()`.
- UPDATE: users can update their own review (only body, title, rating). Admins can update status, admin_reply.
- DELETE: admin only.

**Server Actions:**
New file: `src/lib/actions/reviews.ts`

```typescript
export async function submitReview(input: {
  productId: string
  rating: number // 1-5
  title?: string
  body: string
}): Promise<Review>

export async function updateReview(
  id: string,
  input: {
    rating?: number
    title?: string
    body?: string
  },
): Promise<Review>

export async function deleteReview(id: string): Promise<void>

export async function getProductReviews(
  productId: string,
  params: {
    page?: number
    limit?: number
    sortBy?: "newest" | "highest" | "lowest"
  },
): Promise<{ reviews: ReviewWithUser[]; stats: ReviewStats; totalCount: number }>

// Admin actions
export async function adminModerateReview(
  id: string,
  status: "approved" | "rejected",
): Promise<void>
export async function adminReplyToReview(id: string, reply: string): Promise<void>
export async function adminGetPendingReviews(params: {
  page?: number
  limit?: number
}): Promise<PaginatedResult<ReviewWithProduct>>
export async function adminGetReviewStats(): Promise<{
  pending: number
  approved: number
  rejected: number
  avgRating: number
}>
```

**Verified purchase logic:**

- When submitting a review, check if the user has a completed order (`status IN ('paid', 'shipped', 'delivered')`) containing that product.
- If yes: set `is_verified_purchase = true` and link `order_id`.
- If no: allow the review but `is_verified_purchase = false`.

**UI/UX Specification:**

**Product detail page — reviews section:**

- **Review summary:** Average rating (large star display, e.g., "4.2"), total review count, rating distribution bar chart (5 horizontal bars for 5-1 stars).
- **Review list:** Paginated (10 per page). Each review shows:
  - Star rating (filled/empty stars).
  - Title (bold) + body text.
  - Author name + date.
  - "Ellenőrzött vásárlás" (Verified purchase) badge if `is_verified_purchase`.
  - Admin reply (if exists): indented, prefixed with shop name, different background.
- **Sort:** Newest, Highest rated, Lowest rated.
- **Write review button:** "Véleményt írok" (Write a review) ? expand inline form or modal.
  - Star rating selector (clickable stars).
  - Title input (optional).
  - Body textarea (required, min 10 characters).
  - Submit button. Only shown to logged-in users. If not logged in: "Jelentkezzen be a véleménye megadásához" (Log in to write a review) with link.
  - If user already reviewed this product: show "Véleménye már elküldve" with edit option.

**Product card (grid/list):**

- Show average rating stars + review count below the price: "????? (24)" style.
- Only if product has at least 1 approved review.

**Admin moderation page: `/admin/reviews`**

- Tabs: Függőben (Pending) | Elfogadva (Approved) | Elutasítva (Rejected)
- Table: Product name, customer, rating, title, date, actions.
- Actions per review: Approve (checkmark), Reject (X), Reply (message icon), Delete (trash).
- Bulk actions: approve selected, reject selected.
- Review detail modal: full review text, customer info, order link (if verified), reply form.

**Feature flag integration:**

- All review UI is gated behind `siteConfig.features.enableReviews`.
- Set to `true` when this feature is built and plan-gated via FE-003.

**Configuration Changes:**
Change in `site.config.ts`: `enableReviews: false` ? `enableReviews: true` (after implementation).

**Testing Requirements:**

- Unit test: `reviews.test.ts` — test rating validation (1-5 only), one review per user per product constraint, verified purchase logic, moderation state transitions.
- Integration: submit review ? verify pending status ? admin approves ? verify review appears in product stats view.
- E2E: logged-in user submits review on product page ? review shows as pending ? admin approves from `/admin/reviews` ? review appears publicly on product page with correct rating.

**Acceptance Criteria:**

1. `reviews` table created with correct schema and constraints.
2. `product_review_stats` view provides aggregated rating data.
3. Users can submit reviews with 1-5 star rating and text.
4. One review per user per product enforced.
5. Verified purchase badge shown for reviews linked to completed orders.
6. Reviews default to 'pending' status and require admin moderation.
7. Approved reviews appear on product detail page with rating summary.
8. Product cards show average rating and review count.
9. Admin moderation page at `/admin/reviews` with approve/reject/reply actions.
10. Admin can reply to reviews; reply shown publicly under the review.
11. Review list is sorted and paginated.
12. Feature gated behind `enableReviews` flag.

**Edge Cases & Error Handling:**

- User tries to review a product they haven't bought: allow, but don't show verified badge.
- User tries to submit a second review for same product: show existing review with edit option, prevent duplicate.
- Admin deletes a product: reviews are cascade-deleted.
- User deletes their account: reviews remain but author shown as "Törölt felhasználó" (Deleted user).
- Review body contains HTML/scripts: sanitize on server, render as plain text.
- Review with only 1-star and no text: require minimum body text (10 chars) regardless of rating.
- Rapid-fire review submissions: rate limit to 5 reviews per user per hour.

---

#### FE-011: Analytics Integration (GA4 + Meta Pixel)

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| **Priority**     | P1                                                                           |
| **Status**       | NOT STARTED                                                                  |
| **Plan Tier**    | Basic = GA4 only, Premium = GA4 + Meta Pixel + custom events                 |
| **Complexity**   | M (3-5 days)                                                                 |
| **Dependencies** | FE-002 (cookie consent — scripts must respect consent), FE-003 (plan gating) |
| **Resolves**     | N/A                                                                          |

**Business Justification:**
Shop owners need analytics to understand customer behavior, measure marketing ROI, and optimize their store. GA4 is industry standard; Meta Pixel is essential for Facebook/Instagram ad targeting. These must only load after cookie consent.

**User Stories:**

- As a shop owner, I want GA4 tracking so I can see traffic, conversion funnels, and revenue data in Google Analytics.
- As a shop owner (Premium), I want Meta Pixel tracking so I can run targeted Facebook/Instagram ads.
- As a shop owner, I want e-commerce events (view item, add to cart, purchase) tracked automatically.
- As a visitor, I want tracking scripts to respect my cookie preferences.

**Database Changes:** None (analytics IDs stored in admin settings or config).

**Server Actions:**
New or modify: `src/lib/actions/settings.ts` (if admin settings page exists):

```typescript
export async function updateAnalyticsSettings(input: {
  ga4MeasurementId?: string
  metaPixelId?: string
}): Promise<void>
```

Alternatively, store in `shop_settings` table or environment variables.

**UI/UX Specification:**

**Analytics helper:** `src/lib/analytics/tracker.ts`

```typescript
interface EcommerceEvent {
  event:
    | "page_view"
    | "view_item"
    | "add_to_cart"
    | "remove_from_cart"
    | "begin_checkout"
    | "purchase"
  data?: Record<string, unknown>
}

export function trackEvent(event: EcommerceEvent): void
// Dispatches to GA4 and/or Meta Pixel based on consent + plan
```

**Script injection:** `src/components/analytics/analytics-scripts.tsx` (`"use client"`)

- Uses `useCookieConsent()` from FE-002 to check analytics/marketing consent.
- If analytics consent: inject GA4 `<Script>` tag with measurement ID.
- If marketing consent AND Premium plan: inject Meta Pixel `<Script>` tag.
- Uses Next.js `<Script strategy="afterInteractive">`.

**Events tracked automatically:**

| Event            | Trigger             | GA4 Event          | Meta Pixel Event   | Data                               |
| ---------------- | ------------------- | ------------------ | ------------------ | ---------------------------------- |
| Page view        | Every page load     | `page_view`        | `PageView`         | path, title                        |
| View item        | Product detail page | `view_item`        | `ViewContent`      | product_id, title, price, category |
| Add to cart      | "Kosárba" button    | `add_to_cart`      | `AddToCart`        | product_id, title, price, quantity |
| Remove from cart | Cart remove button  | `remove_from_cart` | —                  | product_id, title                  |
| Begin checkout   | `/checkout` load    | `begin_checkout`   | `InitiateCheckout` | cart total, item count             |
| Purchase         | `/checkout/success` | `purchase`         | `Purchase`         | order_id, total, items             |

**Admin settings:**

- New section in `/admin/settings` or new page `/admin/settings/analytics`:
  - GA4 Measurement ID: text input (format: `G-XXXXXXXXXX`). Validation regex.
  - Meta Pixel ID: text input (format: numeric string). Premium badge + lock if not Premium plan.
  - Test mode toggle (sends events to debug endpoint).

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
analytics: {
  ga4MeasurementId: '',       // Set via admin UI or env var
  metaPixelId: '',            // Set via admin UI or env var (Premium only)
  debugMode: false,
}
```

Environment variables: `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`.

**Testing Requirements:**

- Unit test: `tracker.test.ts` — test event dispatch respects consent state, test GA4 event format, test Meta Pixel event format.
- Manual: enable GA4 debug mode, navigate through the store, verify events appear in GA4 DebugView.
- E2E: set cookie consent to analytics-only ? verify GA4 loads, Meta Pixel does NOT load. Set marketing consent ? verify Meta Pixel loads.

**Acceptance Criteria:**

1. GA4 script loads only after analytics cookie consent.
2. Meta Pixel script loads only after marketing cookie consent AND Premium plan.
3. All 6 e-commerce events are tracked automatically.
4. Events contain correct product/order data.
5. Admin can configure GA4 Measurement ID and Meta Pixel ID.
6. Scripts use `next/script` with `afterInteractive` strategy.
7. No scripts load if consent is not given.
8. Analytics helper provides a clean `trackEvent()` API for future custom events.

**Edge Cases & Error Handling:**

- GA4 ID not configured: don't inject script, don't throw errors.
- Invalid GA4 ID format: validate on save, show error "Érvénytelen GA4 Measurement ID formátum" (Invalid GA4 Measurement ID format).
- Ad blocker blocks the script: catch errors gracefully, don't break the page.
- Consent revoked mid-session: stop sending events but don't remove already-loaded scripts (they persist until page refresh).
- Server-side rendering: analytics scripts are client-only. Don't import in server components.
- Purchase event on `/checkout/success`: only fire once per order. Use session/localStorage flag with order ID to prevent duplicate events on page refresh.

---

#### FE-012: Enhanced Admin Order Notifications

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Priority**     | P1                                                          |
| **Status**       | NOT STARTED                                                 |
| **Plan Tier**    | Basic = single recipient, Premium = multiple + daily digest |
| **Complexity**   | S (1-2 days)                                                |
| **Dependencies** | FE-007 (base admin notification email)                      |
| **Resolves**     | N/A                                                         |

**Business Justification:**
FE-007 adds the basic admin notification email. This feature extends it with configurable recipients and a daily digest, which are essential for teams where multiple people handle fulfillment.

**User Stories:**

- As a shop owner, I want to configure who receives order notifications so the right team members are alerted.
- As a shop owner (Premium), I want multiple email recipients for order notifications.
- As a shop owner (Premium), I want a daily order digest summary instead of individual emails.

**Database Changes:**
Add to `shop_settings` or admin settings (if a settings table exists):

```sql
-- Option A: column on profiles or a shop_settings table
-- Option B: store in site.config.ts / env vars initially, move to DB with admin settings page later
```

For now, use admin settings stored in a `shop_settings` table or as part of the subscription/plan configuration.

**Server Actions:**
Modify/extend `src/lib/actions/email.ts`:

```typescript
export async function updateNotificationSettings(input: {
  orderNotificationEmails: string[] // Array of email addresses
  enableDailyDigest: boolean // Premium only
  digestTime: string // "08:00" format, Premium only
}): Promise<void>

export async function sendDailyOrderDigest(): Promise<void> // Called by cron/Edge Function
```

**UI/UX Specification:**

**Admin settings — Notifications section:**

- **Rendelésértesítések** (Order notifications) card:
  - Email list: tag-style input. Type email ? press Enter ? added as tag. X to remove.
  - Basic plan: max 1 email (show "Premium csomaggal több címet is megadhat" hint).
  - Premium plan: unlimited emails.
  - "Napi összefoglaló" (Daily digest) toggle — Premium only (locked for Basic).
  - Digest time picker (hour selector, default 08:00).

**Daily digest email template:** `src/lib/integrations/email/templates/daily-order-digest.tsx`

- Summary: order count, total revenue, new customers count.
- Table: order number, customer, total, status, time.
- "Adminba" (To admin) CTA ? `/admin/orders`.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
notifications: {
  orderNotificationEmails: ['info@agency.hu'],
  enableDailyDigest: false,
  dailyDigestTime: '08:00',
}
```

**Testing Requirements:**

- Unit: test multi-recipient email sending, test digest aggregation.
- E2E: configure 2 notification emails ? place order ? verify both receive notification.

**Acceptance Criteria:**

1. Admin can configure order notification email recipients.
2. Basic plan: single recipient. Premium: multiple recipients.
3. Premium: daily digest email option with configurable send time.
4. Digest includes order count, revenue, and order table.
5. Settings are persisted and survive restarts.

**Edge Cases & Error Handling:**

- Invalid email format: validate before adding to list, show error.
- All emails removed: fallback to `siteConfig.store.email`.
- Digest with 0 orders: don't send (no empty digests).
- Email delivery fails to one recipient: still send to others, log failure.

---

#### FE-013: Guest Order Tracking

| Field            | Value        |
| ---------------- | ------------ |
| **Priority**     | P1           |
| **Status**       | DONE         |
| **Plan Tier**    | All plans    |
| **Complexity**   | S (1-2 days) |
| **Dependencies** | None         |
| **Resolves**     | N/A          |

**Business Justification:**
Guest checkout is enabled, but guests have no way to check their order status after closing the confirmation page. This causes support inquiries. A simple public tracking page reduces support load and improves customer experience.

**User Stories:**

- As a guest customer, I want to track my order status using my order number and email so I don't need to create an account.
- As a guest customer, I want a link in my confirmation email that takes me directly to my order status.

**Database Changes:** None (uses existing `orders` table — queried by `order_number` + `guest_email`).

**Server Actions:**
New or add to `src/lib/actions/orders.ts`:

```typescript
export async function trackGuestOrder(input: { orderNumber: string; email: string }): Promise<{
  status: OrderStatus
  createdAt: string
  shippingMethod: string
  trackingNumber?: string
  timeline: Array<{ status: string; date: string }>
} | null>
```

- Validates `orderNumber` + `email` pair.
- Returns order status + timeline if match found, `null` if not.
- Rate limited: 5 lookups per IP per hour (via API route with rate limiting, or server action with IP check).

**UI/UX Specification:**

**Page: `/order-tracking`**

- Clean, centered form: "Rendeléskövetés" (Order tracking) heading.
- Two fields: "Rendelesszam" (Order number) text input, "E-mail cim" (Email address) email input.
- "Kereses" (Search) button.
- On success: display order status card with:
  - Order number + date.
  - Current status with colored badge.
  - Timeline of status changes (vertical, with dots and lines).
  - Shipping method + tracking number (if available, as clickable link).
- On failure: "Nem talaltunk rendelest ezzel az adatokkal" (No order found with this data).
- Rate limit exceeded: "Tul sok lekerdezes. Kerjuk, próbálja ujra kesobb." (Too many requests. Please try again later.)

**Links to this page:**

- `/checkout/success` page: "Rendelese kovetese" link.
- Order confirmation email: "Rendeles kovetese" button ? `/order-tracking?order=XXXXX&email=xxx@xxx.xx` (pre-filled).
- Footer: "Rendeléskövetés" link (alongside existing footer links).

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test order lookup with valid/invalid pairs, test rate limiting.
- E2E: complete guest checkout ? click tracking link in success page ? see order status.

**Acceptance Criteria:**

1. `/order-tracking` page exists with order number + email form.
2. Valid lookup returns order status with timeline.
3. Invalid lookup returns clear error message.
4. Rate limited to 5 lookups per IP per hour.
5. Link on `/checkout/success` and in confirmation email.
6. Tracking number shown as link if available.
7. Footer includes "Rendeléskövetés" link.

**Edge Cases & Error Handling:**

- Order number with wrong email: return same "not found" message (don't reveal that the order exists to prevent enumeration).
- Multiple orders with same email: lookup uses order number as primary key, so only one result.
- Order doesn't exist: same "not found" message.
- Rate limit: show friendly message with retry time.

---

#### FE-014: Packing Slip & Order Summary Printing

| Field            | Value                                |
| ---------------- | ------------------------------------ |
| **Priority**     | P1                                   |
| **Status**       | NOT STARTED                          |
| **Plan Tier**    | All plans                            |
| **Complexity**   | S (1-2 days)                         |
| **Dependencies** | FE-005 (OrderDetailPanel extraction) |
| **Resolves**     | N/A                                  |

**Business Justification:**
Physical packing slips are needed for every shipped order. Without a print-optimized view, admins must manually create packing documents, which is error-prone and time-consuming.

**User Stories:**

- As an admin, I want to print a packing slip for each order so I can include it in the package.
- As an admin, I want to bulk-print packing slips for multiple orders at once.
- As an admin, I want the packing slip to include only necessary information (no prices if configured).

**Database Changes:** None.

**Server Actions:**
Add to `src/lib/actions/orders.ts`:

```typescript
export async function getOrderPrintData(orderId: string): Promise<OrderPrintData>
export async function getMultipleOrderPrintData(orderIds: string[]): Promise<OrderPrintData[]>
```

**UI/UX Specification:**

**Print button on `/admin/orders/[id]`:**

- "Nyomtatás" (Print) icon button in the order detail header.
- Opens new tab/window to `/admin/orders/[id]/print`.

**Print page: `/admin/orders/[id]/print`**

- Server component. No navigation, no sidebar — print-only layout.
- `@media print` styles: hide browser chrome, set A4 paper size.
- Content:
  - Shop logo + name + address (from `siteConfig.store`).
  - "Szallitólevel" (Packing slip) heading.
  - Order number, date, order status.
  - **Customer section:** name, shipping address, phone.
  - **Line items table:** product title, variant (size/color), SKU (if exists), quantity. Optionally: unit price + line total (configurable).
  - **Order total** (optional, configurable — some shops don't want prices on packing slips).
  - Notes field (from FE-018 order internal notes, if available).
  - Footer: "Koszonjuk a vasarlast!" (Thank you for your purchase!) + return address.
- Page break between orders for bulk printing.

**Bulk print from order list:**

- Checkbox selection on `/admin/orders` table (requires FE-005 DataTable with selection).
- "Nyomtatás" button in bulk action toolbar.
- Opens `/admin/orders/print?ids=id1,id2,id3` with page breaks between orders.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
packingSlip: {
  showPrices: true,          // Whether to show prices on packing slip
  showLogo: true,
  footerMessage: 'Koszonjuk a vasarlast!',
}
```

**Testing Requirements:**

- Manual: print a packing slip, verify it fits on A4, verify all order data is correct.
- E2E: navigate to print page ? verify all order fields rendered ? trigger print ? verify `@media print` styles applied.

**Acceptance Criteria:**

1. Print button exists on order detail page.
2. Print page renders clean, print-optimized layout.
3. All order information is correctly displayed.
4. `@media print` styles hide non-essential elements and set A4 size.
5. Bulk print works with page breaks between orders.
6. Prices can be hidden via configuration.
7. Shop logo and branding appear on the packing slip.

**Edge Cases & Error Handling:**

- Order has many line items (>20): items continue on next page with proper page-break handling.
- Very long product title: truncate to prevent layout breakage.
- No shipping address (pickup point order): show pickup point name/address instead.
- Missing shop logo: skip logo, show shop name text only.

---

#### FE-015: Related Products / Cross-sell

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| **Priority**     | P1                                                                           |
| **Status**       | NOT STARTED                                                                  |
| **Plan Tier**    | Basic = same-category fallback, Premium = manual relations + cart cross-sell |
| **Complexity**   | M (3-5 days)                                                                 |
| **Dependencies** | FE-003 (plan gating), FE-009 (CartDrawer for cross-sell display)             |
| **Resolves**     | N/A                                                                          |

**Business Justification:**
Related product recommendations increase average order value by 10-30%. Even a simple "same category" fallback is better than nothing. Manual curation (Premium) allows shop owners to create strategic upsell/cross-sell relationships.

**User Stories:**

- As a customer, I want to see related products so I can discover items I might also like.
- As a shop owner (Premium), I want to manually set which products are related to each other.
- As a shop owner (Premium), I want cross-sell suggestions to appear in the cart.

**Database Changes:**
Migration: `010_product_relations.sql`

```sql
CREATE TABLE product_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('related', 'upsell', 'cross_sell')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, related_product_id, relation_type),
  CHECK(product_id != related_product_id)
);

CREATE INDEX idx_product_relations_product ON product_relations (product_id, relation_type, sort_order);
```

**RLS Policies:**

- SELECT: public (relations are shown on storefront).
- INSERT/UPDATE/DELETE: admin only.

**Server Actions:**
New file: `src/lib/actions/product-relations.ts`

```typescript
export async function getRelatedProducts(
  productId: string,
  type?: RelationType,
): Promise<ProductCard[]>
export async function adminSetProductRelations(
  productId: string,
  relations: Array<{
    relatedProductId: string
    relationType: "related" | "upsell" | "cross_sell"
    sortOrder: number
  }>,
): Promise<void>
export async function getCartCrossSellProducts(productIds: string[]): Promise<ProductCard[]>
```

**Fallback logic (Basic plan or no manual relations):**

1. Query `product_relations` for the given product.
2. If no manual relations exist (or Basic plan), fall back to: same-category products, excluding current product, ordered by newest, limit 4.
3. If no same-category products, fall back to: newest products, excluding current product, limit 4.

**UI/UX Specification:**

**Product detail page — "Neked is tetszhet" section:**

- Below product description / reviews section.
- Heading: "Neked is tetszhet" (You might also like).
- 4 product cards in a horizontal row. Mobile: horizontal scroll with snap.
- Uses existing `ProductCard` component.

**Admin product form — Relations section (Premium only):**

- "Kapcsolodo termékek" (Related products) collapsible section.
- Multi-select product picker: search/filter products, add as related/upsell/cross-sell.
- Drag to reorder.
- Three tabs or grouped sections: Kapcsolodo (Related), Upsell, Cross-sell.

**Cart page / CartDrawer — Cross-sell section (Premium only):**

- "Kiegészítők" (Accessories) section below cart items.
- Shows cross-sell products from ALL products currently in the cart (deduplicated).
- Max 3 products. Each with "Kosárba" button (adds directly to cart without page navigation).

**Configuration Changes:** None (plan-gated via FE-003).

**Testing Requirements:**

- Unit: test fallback logic (no relations ? same category ? newest).
- Integration: set manual relations on a product ? verify they appear on the product page ? remove relations ? verify fallback to same-category.
- E2E: add products to cart ? verify cross-sell section shows related products (Premium).

**Acceptance Criteria:**

1. `product_relations` table created.
2. Product detail shows "Neked is tetszhet" section with 4 related products.
3. Basic plan: same-category fallback works.
4. Premium: manual relations configurable in admin product form.
5. Premium: cross-sell products shown in cart/CartDrawer.
6. Fallback chain works: manual ? same category ? newest.
7. No duplicate products in suggestions.
8. Self-reference prevention (product can't be related to itself).

**Edge Cases & Error Handling:**

- Product has no category and no relations: fall back to newest products globally.
- Related product is inactive/deleted: exclude from results.
- All related products are inactive: fall back to category ? newest.
- Cross-sell in cart with 10 products: deduplicate and limit to 3 suggestions.
- Admin adds relation then deletes the related product: cascade delete removes the relation row.

---

#### FE-016: Plan Comparison Page

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Priority**     | P1                                         |
| **Status**       | NOT STARTED                                |
| **Plan Tier**    | Infrastructure (ships with every instance) |
| **Complexity**   | M (3-5 days)                               |
| **Dependencies** | FE-003 (plan data in database)             |
| **Resolves**     | N/A (detailed in original roadmap)         |

**Business Justification:**
Shop owners need a comprehensive comparison of what their current plan includes vs. what they'd get by upgrading. This is the primary upsell mechanism and the canonical reference for plan features.

**User Stories:**

- As a shop owner, I want to compare all available plans in detail so I can decide whether to upgrade.
- As a shop owner, I want to see what features are locked on my plan vs. available on Premium.
- As a shop owner, I want to request an upgrade quote easily.

**Database Changes:** None (reads from `shop_plans` and `shop_subscriptions` created by FE-003).

**Server Actions:**
Uses existing actions from FE-003: `getAvailablePlans()`, `getShopSubscription()`.

**UI/UX Specification:**

**Page: `/admin/subscription/plans`**

- Server component for data fetching, client components for interactivity.

**Desktop layout (=1024px):** Full comparison table.

- Columns: feature name + one column per plan (Basic, Premium, or whatever plans exist).
- Current plan column highlighted: colored border, light background tint, "Jelenlegi csomag" (Current plan) badge.
- Feature rows grouped by category with section headers:
  1. Termekek & Katalogus (Products & Catalog)
  2. Rendelesek & Fizetes (Orders & Payments)
  3. Szallitas (Shipping)
  4. Marketing & Kommunikacio (Marketing & Communication)
  5. SEO & Megjelenes (SEO & Appearance)
  6. Analitika & Riportok (Analytics & Reports)
  7. Integraciok (Integrations)
  8. Felhasznalokezeles (User Management)
  9. Jogi Megfelelosseg (Compliance)
- Cell values: checkmark (included), X (not included), or specific value (e.g., "500 termek", "Korlatlan").
- Sticky header with plan names and prices.

**Mobile layout (<1024px):** Tabbed card view.

- Tab per plan. Each tab shows all features as a vertical list with check/X/value.
- Current plan tab has badge.

**Pricing section (top of page):**

- Plan cards with name, monthly price, annual price (with savings callout).
- Billing cycle toggle: "Havi" (Monthly) / "Eves" (Annual).
- Annual savings: "Megtakarítás: XX XXX Ft/ev" (Savings: XX XXX Ft/year).

**CTA buttons:**

- Current plan: "Jelenlegi csomag" badge (no button).
- Other plans: "Kerd ajanlatunkat" (Request a quote) button ? opens mailto or contact form. Upgrades are agency-mediated, not self-service.

**Components:**

- `src/components/admin/plan-comparison-table.tsx` (server component)
- `src/components/admin/plan-comparison-mobile.tsx` (`"use client"`, tabbed)
- `src/components/admin/plan-feature-row.tsx`
- `src/components/admin/plan-column-header.tsx`

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test feature-to-cell-value mapping (boolean ? checkmark/X, number ? formatted value).
- E2E: load plan comparison page ? verify current plan highlighted ? toggle billing cycle ? verify prices update ? click "Request quote" ? verify action.

**Acceptance Criteria:**

1. Plan comparison page at `/admin/subscription/plans`.
2. Desktop: full comparison table with all feature categories.
3. Mobile: tabbed card view per plan.
4. Current plan visually highlighted.
5. Billing cycle toggle switches between monthly and annual pricing.
6. Annual savings amount displayed.
7. "Request a quote" CTA for non-current plans.
8. All feature data loaded from `shop_plans.features` (not hardcoded).

**Edge Cases & Error Handling:**

- Only one plan exists: show single column with all features listed. Hide comparison aspects.
- No active subscription: don't highlight any plan. Show "Nincs aktív csomag" message.
- Plan features JSON missing a key: treat as `false` / not included.
- Very long feature list: use accordion per category on mobile.

---

#### FE-017: Storefront Theme Customization Admin

| Field            | Value                                       |
| ---------------- | ------------------------------------------- |
| **Priority**     | P1                                          |
| **Status**       | NOT STARTED                                 |
| **Plan Tier**    | Premium                                     |
| **Complexity**   | M (3-5 days)                                |
| **Dependencies** | FE-003 (plan gating)                        |
| **Resolves**     | N/A (BrandingConfig exists but no admin UI) |

**Business Justification:**
`BrandingConfig` already exists in `site.config.ts` with theme colors, logo text, and logo URL — but there's no admin interface to change these values. Shop owners on the Premium plan should be able to customize their storefront branding without code changes.

**User Stories:**

- As a shop owner (Premium), I want to change my store's colors so it matches my brand identity.
- As a shop owner (Premium), I want to upload my logo so it appears in the header and emails.
- As a shop owner (Premium), I want to preview theme changes before publishing.

**Database Changes:**
Migration: `011_shop_branding.sql`

```sql
CREATE TABLE shop_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES profiles(id) UNIQUE,
  logo_text text NOT NULL DEFAULT 'AGENCY',
  logo_url text,
  theme jsonb NOT NULL DEFAULT '{
    "background": "#ffffff",
    "foreground": "#0a0a0a",
    "muted": "#f5f5f5",
    "mutedForeground": "#737373",
    "accent": "#0a0a0a",
    "accentForeground": "#ffffff",
    "border": "#e5e5e5"
  }',
  custom_css text,                    -- Optional advanced custom CSS (Premium+)
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS Policies:**

- SELECT: public (storefront needs to read branding).
- INSERT/UPDATE: admin of the shop only.

**Server Actions:**
New file: `src/lib/actions/branding.ts`

```typescript
export async function getShopBranding(): Promise<ShopBranding>
export async function updateShopBranding(input: {
  logoText?: string
  logoUrl?: string
  theme?: Partial<ThemeConfig>
  customCss?: string
}): Promise<ShopBranding>
```

**UI/UX Specification:**

**Page: `/admin/settings/branding` (Premium only)**

- **Logo section:**
  - Logo text input: "Logo szöveg" (Logo text) — the text shown in the header.
  - Logo upload: uses FE-001 image upload component (single image). Uploaded to `branding/` folder in Supabase Storage.
  - Logo preview: shows how the header will look with current logo.
- **Color theme section:**
  - Color pickers for each theme variable (background, foreground, muted, accent, border, etc.).
  - Each picker shows the color name in Hungarian + current value + color swatch.
  - Live preview panel on the right (desktop) showing a mini storefront mockup that updates in real-time as colors change.
- **Advanced section (collapsible):**
  - Custom CSS textarea — for advanced users who want to override specific styles.
  - Warning: "Az egyedi CSS felülírhatja a sablon stílusait. Használat saját felelősségre." (Custom CSS may override template styles. Use at your own risk.)
- **Actions:**
  - "Előnézet" (Preview) button — opens storefront in new tab with `?preview_branding=true` query param that applies unsaved changes.
  - "Mentés" (Save) button — persists changes.
  - "Visszaállítás" (Reset) button — reverts to default BrandingConfig values.

**Theme application:**

- Create `src/lib/utils/get-branding.ts` — server-side helper that reads `shop_branding` from DB (or falls back to `siteConfig.branding` defaults).
- Root layout applies theme colors as CSS custom properties on `<html>` element.
- Components use CSS custom properties (e.g., `var(--color-accent)`) instead of hardcoded Tailwind colors.

**Configuration Changes:** None (DB replaces config for customized shops).

**Testing Requirements:**

- Unit: test branding resolution (DB values > config defaults), test color validation.
- E2E: change accent color in admin ? save ? verify storefront header uses new color ? reset ? verify default restored.

**Acceptance Criteria:**

1. `shop_branding` table created.
2. Admin branding page at `/admin/settings/branding` (Premium only).
3. Logo text and logo image configurable.
4. All 7 theme colors configurable via color pickers.
5. Live preview updates as colors are changed.
6. Changes persist to database.
7. Storefront reads branding from DB, falls back to config defaults.
8. Reset button restores default branding.
9. Page is locked for Basic plan with upsell prompt.

**Edge Cases & Error Handling:**

- Invalid color value: validate hex format on save.
- Very long logo text: truncate in preview, show character limit (max 30 chars).
- Logo image upload fails: keep existing logo, show error toast.
- Custom CSS with syntax errors: save anyway (CSS is fault-tolerant), but show a warning.
- Shop has no `shop_branding` row: fall back to `siteConfig.branding` defaults.
- Preview mode: don't persist preview changes. Use query param + session storage.

---

#### FE-018: Order Internal Notes

| Field            | Value             |
| ---------------- | ----------------- |
| **Priority**     | P1                |
| **Status**       | DONE              |
| **Plan Tier**    | All plans         |
| **Complexity**   | XS (< 1 day)      |
| **Dependencies** | None              |
| **Resolves**     | N/A (new feature) |

**Business Justification:**
Admins need to attach internal notes to orders for fulfillment coordination (e.g., "Customer called to change address", "Waiting for restock", "VIP customer — include free sample"). This is basic order management functionality.

**User Stories:**

- As an admin, I want to add notes to orders so my team knows about special instructions.
- As an admin, I want to see a history of notes with timestamps so I can track communication.

**Database Changes:**
Migration: `012_order_notes.sql`

```sql
CREATE TABLE order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_notes_order ON order_notes (order_id, created_at DESC);
```

**RLS Policies:**

- SELECT/INSERT: admin only.
- UPDATE/DELETE: author only or admin.

**Server Actions:**
Add to `src/lib/actions/orders.ts`:

```typescript
export async function addOrderNote(orderId: string, content: string): Promise<OrderNote>
export async function getOrderNotes(orderId: string): Promise<OrderNote[]>
export async function deleteOrderNote(noteId: string): Promise<void>
```

**UI/UX Specification:**

- New section on `/admin/orders/[id]` — "Belso megjegyzések" (Internal notes).
- Notes displayed in reverse chronological order (newest first).
- Each note: author name, timestamp, content text, delete button (own notes only).
- Text area + "Hozzáadás" (Add) button to create new note.
- Notes are admin-only — never visible to customers.
- Include notes on packing slip printout (FE-014) if configured.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test note creation, ordering, author validation.
- E2E: add note to order ? refresh ? note persists ? add second note ? verify chronological order.

**Acceptance Criteria:**

1. `order_notes` table created.
2. Notes section visible on order detail page.
3. Admin can add, view, and delete (own) notes.
4. Notes shown in reverse chronological order with author and timestamp.
5. Notes are admin-only, never exposed to customers.
6. Notes included on packing slip if configured.

**Edge Cases & Error Handling:**

- Empty note text: validate minimum 1 character, show error.
- Very long note: allow up to 2000 characters, show remaining count.
- Delete confirmation: simple confirm dialog before deleting a note.
- Author deleted: show "Törölt felhasználó" for notes by deleted users.

---

### P2 — Growth Phase (13 features)

## Features that differentiate plans, serve common needs, and help shops scale beyond their initial launch.

#### FE-019: Wishlist / Favorites

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| **Priority**     | P2                                                        |
| **Status**       | NOT STARTED                                               |
| **Plan Tier**    | Basic = core wishlist, Premium = admin wishlist analytics |
| **Complexity**   | M (3-5 days)                                              |
| **Dependencies** | FE-003 (plan gating for analytics)                        |
| **Resolves**     | N/A                                                       |

**Business Justification:**
Wishlists increase return visits and conversion. Customers who save items are signaling purchase intent — they come back 40% more often. Basic wishlisting is expected functionality; analytics on wishlist data (Premium) helps shop owners stock and promote the right products.

**User Stories:**

- As a customer, I want to save products to a wishlist so I can buy them later.
- As a guest, I want my wishlist to persist in my browser until I create an account.
- As a logged-in customer, I want my wishlist synced across devices.
- As a shop owner (Premium), I want to see which products are most wishlisted so I can prioritize promotions.

**Database Changes:**
Migration: `013_wishlists.sql`

```sql
CREATE TABLE wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON wishlists (user_id, created_at DESC);
CREATE INDEX idx_wishlists_product ON wishlists (product_id);
```

**RLS Policies:**

- SELECT/INSERT/DELETE: own wishlist only (`user_id = auth.uid()`).
- Admin SELECT: all wishlists (for analytics).

**Server Actions:**
New file: `src/lib/actions/wishlist.ts`

```typescript
export async function addToWishlist(productId: string): Promise<void>
export async function removeFromWishlist(productId: string): Promise<void>
export async function getWishlist(): Promise<WishlistItem[]>
export async function isInWishlist(productId: string): Promise<boolean>
export async function syncGuestWishlist(productIds: string[]): Promise<void> // Merge localStorage wishlist on login

// Premium analytics
export async function getWishlistAnalytics(): Promise<{
  topWishlistedProducts: Array<{ product: ProductCard; count: number }>
  totalWishlistItems: number
  uniqueUsers: number
}>
```

**Guest wishlist (Zustand):**

- Extend the existing Zustand store (or create `src/lib/stores/wishlist-store.ts`).
- Guest: wishlist stored in localStorage via Zustand `persist` middleware.
- On login: call `syncGuestWishlist(localProductIds)` to merge guest wishlist into DB, then clear localStorage wishlist.

**UI/UX Specification:**

**Heart icon on ProductCard:**

- Positioned top-right of the product card image.
- Empty heart = not in wishlist. Filled red heart = in wishlist.
- Click toggles wishlist state with optimistic UI + scale animation.
- If not logged in: toggle works (localStorage), but show tooltip "Jelentkezzen be a mentéshez" after 3rd add.

**Heart icon on product detail page:**

- Next to the "Kosárba" button. "Kedvencekhez adom" (Add to favorites) text + heart icon.
- Toggle behavior same as ProductCard.

**Wishlist count badge in header:**

- Heart icon in header with count badge (like cart count).
- Click navigates to `/profile/wishlist`.

**Wishlist page: `/profile/wishlist`**

- Grid of wishlisted products using ProductCard component.
- Each card has: "Kosárba" (Add to cart) button, "Eltávolítás" (Remove) button.
- Empty state: "Még nincs kedvenc terméke" (You have no favorite products yet) with "Vásárlás" (Shop) button.
- Sort: newest added, price low-high, price high-low.

**Admin wishlist analytics: `/admin/analytics/wishlists` (Premium only)**

- Top 10 most wishlisted products — table with product name, wishlist count, conversion to purchase.
- Total wishlist items, unique users — KPI cards.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test add/remove/toggle, test sync logic (guest ? logged in merge, deduplication).
- E2E: add product to wishlist as guest ? login ? verify wishlist merged ? remove product ? verify removed from DB.

**Acceptance Criteria:**

1. `wishlists` table created with unique constraint.
2. Heart icon on ProductCard and product detail page.
3. Toggle adds/removes from wishlist with optimistic UI.
4. Guest wishlist stored in localStorage.
5. Guest wishlist synced to DB on login.
6. Header wishlist count badge.
7. `/profile/wishlist` page with product grid.
8. Admin wishlist analytics (Premium).
9. Products can be added to cart directly from wishlist page.

**Edge Cases & Error Handling:**

- Product deleted after being wishlisted: cascade delete removes wishlist entry. If using localStorage, filter out non-existent products on next load.
- User adds same product twice (race condition): UNIQUE constraint prevents duplicate. Catch error, treat as success.
- Wishlist with 100+ items: paginate the wishlist page.
- Sync conflict (product in both guest and DB wishlist): deduplicate, keep the earliest `created_at`.

---

#### FE-020: Product CSV Import / Export

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Priority**     | P2                                                          |
| **Status**       | NOT STARTED                                                 |
| **Plan Tier**    | Basic = export only, Premium = export + import (unlimited)  |
| **Complexity**   | L (1-2 weeks)                                               |
| **Dependencies** | FE-003 (plan gating), FE-004 (cost_price column for import) |
| **Resolves**     | N/A                                                         |

**Business Justification:**
Bulk product management is essential for shops with large catalogs. CSV import lets shop owners migrate from other platforms or update prices in bulk. Export is useful for backups, analysis, and integration with external tools.

**User Stories:**

- As a shop owner, I want to export my product catalog as CSV for backup or analysis.
- As a shop owner (Premium), I want to import products from a CSV to bulk-add or update my catalog.
- As a shop owner (Premium), I want to see validation errors before committing an import.

**Database Changes:** None (operates on existing `products` and `product_variants` tables).

**Server Actions:**
New file: `src/lib/actions/csv.ts`

```typescript
export async function exportProductsCsv(): Promise<string> // Returns CSV string

export async function validateCsvImport(formData: FormData): Promise<{
  validRows: number
  errorRows: Array<{ line: number; field: string; error: string }>
  preview: ProductPreview[] // First 10 rows for preview
  totalRows: number
}>

export async function commitCsvImport(formData: FormData): Promise<{
  created: number
  updated: number
  skipped: number
  errors: Array<{ line: number; error: string }>
}>
```

**CSV format:**

```csv
slug,title,description,category_slug,base_price,compare_at_price,cost_price,sku,stock,is_active,images,variant_name,variant_price,variant_stock,variant_sku
my-product,My Product,Description...,category-1,4990,5990,2500,SKU001,100,true,https://...|https://...,,,
my-product,,,,,,,,,,,M,5490,50,SKU001-M
my-product,,,,,,,,,,,L,5490,50,SKU001-L
```

- Same `slug` = same product. First row with a slug defines the product. Subsequent rows with same slug define variants.
- Empty fields on variant rows inherit from the product row.
- Multiple images separated by `|`.
- `cost_price` column included (from FE-004).

**UI/UX Specification:**

**Export button on `/admin/products`:**

- "Exportálás (CSV)" button in the page header toolbar.
- Downloads a `.csv` file immediately (server action generates and returns as blob).
- Includes all products and variants, all fields.

**Import page: `/admin/products/import` (Premium only)**

- Step 1 — Upload: drag-and-drop zone for CSV file. "Sablon letöltése" (Download template) link to get an empty CSV with correct headers.
- Step 2 — Validation: automatic on upload. Shows:
  - Summary: "X sor OK, Y hiba" (X rows OK, Y errors).
  - Error table: line number, field name, error description.
  - Preview table: first 10 valid rows with product data.
- Step 3 — Confirmation: "Importálás" (Import) button (only enabled if valid rows > 0). Shows what will happen: "X új termék, Y frissítés, Z kihagyva" (X new products, Y updates, Z skipped).
- Step 4 — Result: success/failure summary with downloadable error report.

**Validation rules (per-row Zod):**

- `slug`: required, URL-safe format.
- `title`: required on first occurrence of a slug.
- `base_price`: required, positive integer.
- `compare_at_price`: if provided, must be > `base_price`.
- `cost_price`: optional, positive integer.
- `stock`: required, non-negative integer.
- `category_slug`: must match existing category.
- `images`: valid URL format, max 10 per product.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test CSV parsing, validation (valid rows, invalid rows, mixed), Zod schemas, slug grouping logic.
- Integration: export products ? reimport the same CSV ? verify products unchanged (idempotent round-trip).
- E2E: upload valid CSV ? preview ? confirm ? verify products created in DB and visible on storefront.

**Acceptance Criteria:**

1. Export button on products page generates CSV with all products and variants.
2. Template CSV downloadable with correct headers.
3. Import page with upload, validation, preview, and confirmation steps.
4. Per-row Zod validation with detailed error reporting.
5. Dry-run preview before committing.
6. Creates new products and updates existing ones (matched by slug).
7. Variants handled correctly (grouped by slug).
8. Import respects plan limits (max_products).
9. Basic plan: export only. Premium: export + import.

**Edge Cases & Error Handling:**

- Empty CSV: show "A fájl üres" (File is empty) error.
- CSV with wrong headers: show "Érvénytelen fejléc" (Invalid headers) with expected vs actual header list.
- CSV with BOM (byte order mark): strip BOM before parsing.
- Encoding issues (UTF-8 vs Windows-1250): detect and handle Hungarian characters (é, á, í, ó, ú, ö, ü, ő, ű).
- CSV with 10,000+ rows: process in batches of 100, show progress bar. Consider background job for very large imports.
- Duplicate slugs in CSV (not variants, but actual duplicates): merge — last row wins for product-level fields.
- Import exceeds plan product limit: import up to the limit, report remaining as "Terv limit elérve" (Plan limit reached).

---

#### FE-021: Back in Stock Notifications

| Field            | Value                         |
| ---------------- | ----------------------------- |
| **Priority**     | P2                            |
| **Status**       | NOT STARTED                   |
| **Plan Tier**    | Basic                         |
| **Complexity**   | S (1-2 days)                  |
| **Dependencies** | FE-007 (email infrastructure) |
| **Resolves**     | N/A                           |

**Business Justification:**
When a product is out of stock, you lose potential sales. Back-in-stock notifications capture that demand and convert it when inventory is replenished. This recovers otherwise lost revenue.

**User Stories:**

- As a customer, I want to be notified when an out-of-stock product is available again so I can buy it.
- As an admin, I want to see how many people are waiting for a product so I can prioritize restocking.

**Database Changes:**
Migration: `014_stock_notifications.sql`

```sql
CREATE TABLE stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  notified_at timestamptz,                -- NULL if not yet notified
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_stock_notifications_product ON stock_notifications (product_id, variant_id) WHERE notified_at IS NULL;
```

**RLS Policies:**

- INSERT: public (guests can subscribe).
- SELECT: admin only (to see notification counts).
- UPDATE: service role only (for setting `notified_at`).
- DELETE: admin or own email.

**Server Actions:**
New file: `src/lib/actions/stock-notifications.ts`

```typescript
export async function subscribeStockNotification(input: {
  email: string
  productId: string
  variantId?: string
}): Promise<void>

export async function sendStockNotifications(
  productId: string,
  variantId?: string,
): Promise<{
  sent: number
}>

export async function getStockNotificationCount(
  productId: string,
  variantId?: string,
): Promise<number>
```

**Trigger:** When admin updates stock from 0 to >0 (in `adminUpdateProduct` or `adminUpdateVariant`), call `sendStockNotifications()`. This sends emails to all subscribers for that product/variant and sets `notified_at`.

**Email template:** `src/lib/integrations/email/templates/back-in-stock.tsx`

- "újra kapható!" (Back in stock!) subject.
- Content: product name, image, price, "Vásárlás most" (Buy now) CTA ? product page.

**UI/UX Specification:**

**Product detail page (when stock = 0):**

- Replace "Kosárba" button with:
  - "Elfogyott" (Out of stock) label.
  - Email input + "Értesíts" (Notify me) button below.
  - If logged in: auto-fill email, show single "Értesíts" button.
  - After submission: "Értesítjük, ha újra elérhető!" (We'll notify you when it's back!) success message.

**Admin product page:**

- Show notification count badge next to stock field: "12 fo vár erre a termékre" (12 people waiting for this product).

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test subscription creation, deduplication, notification sending, notified_at flagging.
- Integration: subscribe ? update stock to >0 ? verify email sent ? verify notified_at set.
- E2E: visit out-of-stock product ? enter email ? submit ? admin restocks ? email received.

**Acceptance Criteria:**

1. `stock_notifications` table created.
2. "Notify me" form appears on out-of-stock product pages.
3. Guests and logged-in users can subscribe.
4. Email sent when stock goes from 0 to >0.
5. `notified_at` set after sending to prevent duplicate notifications.
6. Admin sees waiting count on product form.
7. Rate limit: max 10 subscriptions per email per day.

**Edge Cases & Error Handling:**

- Same email subscribes twice for same product: UNIQUE constraint, show "Már feliratkozott" (Already subscribed).
- Stock updated but back to 0 quickly: emails already sent, users buy, stock depletes. Correct behavior.
- 1000 subscribers for one product: batch email sending (max 50 per batch, with delays).
- Email delivery fails: log error, mark as notified anyway (prevent retry spam).
- Product deleted: cascade deletes notifications.

---

#### FE-022: Blog System

| Field            | Value         |
| ---------------- | ------------- |
| **Priority**     | P2            |
| **Status**       | NOT STARTED   |
| **Plan Tier**    | Basic         |
| **Complexity**   | L (1-2 weeks) |
| **Dependencies** | None          |
| **Resolves**     | N/A           |

**Business Justification:**
A blog improves SEO (fresh content, internal linking, keyword targeting), establishes authority, and drives organic traffic. It's a standard feature for e-commerce platforms and a significant differentiator for shops competing on search rankings.

**User Stories:**

- As a shop owner, I want to publish blog posts to improve my store's SEO.
- As a shop owner, I want a simple editor (not a full CMS) to write and format posts.
- As a customer, I want to read blog posts related to the shop's products and industry.

**Database Changes:**
Migration: `015_blog.sql`

```sql
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content_html text NOT NULL,
  cover_image_url text,
  author_id uuid NOT NULL REFERENCES profiles(id),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_published ON posts (is_published, published_at DESC) WHERE is_published = true;
CREATE INDEX idx_posts_slug ON posts (slug);
```

**RLS Policies:**

- SELECT: published posts are public. Drafts visible to admin only.
- INSERT/UPDATE/DELETE: admin only.

**Server Actions:**
New file: `src/lib/actions/blog.ts`

```typescript
export async function getPublishedPosts(params: {
  page?: number
  limit?: number
  tag?: string
}): Promise<PaginatedResult<PostSummary>>
export async function getPostBySlug(slug: string): Promise<PostDetail | null>
export async function adminGetPosts(params: {
  page?: number
  status?: "all" | "published" | "draft"
}): Promise<PaginatedResult<PostAdmin>>
export async function adminCreatePost(input: CreatePostInput): Promise<Post>
export async function adminUpdatePost(id: string, input: UpdatePostInput): Promise<Post>
export async function adminDeletePost(id: string): Promise<void>
```

**UI/UX Specification:**

**Public pages:**

- `/blog` — paginated post list. Card layout: cover image, title, excerpt, date, tags. 6 posts per page.
- `/blog/[slug]` — single post. Full-width cover image, title, author, date, content. Related posts at bottom (same tags).
- SEO: `generateMetadata()` with `meta_title`, `meta_description`, OG tags from cover image.
- Sitemap: include published posts.

**Admin pages:**

- `/admin/blog` — post list table. Columns: title, status (draft/published), date, actions (edit, delete, toggle publish).
- `/admin/blog/new` — create post form.
- `/admin/blog/[id]` — edit post form.

**Post editor form:**

- Title input.
- Slug input (auto-generated from title, editable).
- Excerpt textarea (optional, used in post list cards).
- Cover image upload (uses FE-001 image upload, single image).
- Content editor: lightweight Markdown editor with preview. Use a simple library like `@uiw/react-md-editor` or a basic textarea with Markdown preview toggle. Convert Markdown to HTML on save.
- Tags: tag input (type + Enter to add, X to remove).
- SEO section (collapsible): meta title, meta description.
- Publish toggle: draft / published. If published, set `published_at` to now.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test slug generation, HTML sanitization, post filtering.
- Integration: create post ? publish ? verify appears on `/blog` ? visit `/blog/[slug]` ? verify content.
- E2E: admin creates post with Markdown ? publishes ? customer sees formatted post on blog.

**Acceptance Criteria:**

1. `posts` table created.
2. Admin CRUD for blog posts.
3. Markdown editor with preview.
4. Auto-slug generation from title.
5. Draft/published status with publish date.
6. Public `/blog` page with paginated post list.
7. Public `/blog/[slug]` page with full post content.
8. Cover image support.
9. Tag system for categorization.
10. SEO metadata (title, description, OG) on post pages.
11. Published posts included in sitemap.

**Edge Cases & Error Handling:**

- Duplicate slug: append `-2`, `-3` etc. automatically.
- HTML injection in content: sanitize HTML output (use `DOMPurify` or similar on render).
- Very long post: content renders correctly, no layout breaking.
- Post with no cover image: show placeholder or no image area.
- Delete published post: show confirm dialog with warning that the URL will return 404.
- Unpublish post: keep content but remove from public listing and return 404 on public slug.

---

#### FE-023: About Us Page Builder

| Field            | Value        |
| ---------------- | ------------ |
| **Priority**     | P2           |
| **Status**       | DONE         |
| **Plan Tier**    | Basic        |
| **Complexity**   | S (1-2 days) |
| **Dependencies** | None         |
| **Resolves**     | N/A          |

**Business Justification:**
An About Us page builds trust and brand identity. Rather than a free-form page builder (complex, out of scope), this provides structured sections that shop owners fill in via the admin panel.

**User Stories:**

- As a shop owner, I want an About Us page so customers can learn about my business.
- As a shop owner, I want to fill in structured fields so the page always looks professional.

**Database Changes:**
Reuse or extend a `shop_settings` table (or `shop_pages` if creating a pages system):

```sql
-- Option: store in shop_settings jsonb, keyed by page name
-- Or create a dedicated table:
CREATE TABLE shop_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES profiles(id),
  page_key text NOT NULL,                           -- 'about', 'contact', etc.
  content jsonb NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, page_key)
);
```

**RLS Policies:**

- SELECT: public (published pages).
- INSERT/UPDATE: admin only.

**Server Actions:**

```typescript
export async function getPageContent(pageKey: string): Promise<PageContent | null>
export async function adminUpdatePageContent(
  pageKey: string,
  content: AboutUsContent,
): Promise<void>
```

**About Us content structure:**

```typescript
interface AboutUsContent {
  hero: { title: string; subtitle: string; imageUrl: string | null }
  story: { title: string; body: string } // Markdown body
  team: Array<{ name: string; role: string; imageUrl: string | null; bio: string }>
  values: Array<{ title: string; description: string; icon: string }>
  contact: { address: string; phone: string; email: string; mapEmbedUrl: string | null }
}
```

**UI/UX Specification:**

**Admin page: `/admin/pages/about`**

- Structured form with collapsible sections for each content block (hero, story, team, values, contact).
- Image uploads for hero and team member photos.
- "Előnézet" (Preview) and "Mentés" (Save) buttons.

**Public page: `/about`**

- Renders sections in order: Hero ? Story ? Team ? Values ? Contact.
- Each section is a server component with responsive layout.
- Sections with empty content are hidden.

**Configuration Changes:** None.

**Testing Requirements:**

- E2E: admin fills in about page ? saves ? public `/about` page renders content.

**Acceptance Criteria:**

1. Admin page for editing About Us content.
2. Structured sections (hero, story, team, values, contact).
3. Public `/about` page renders the content.
4. Sections with no content are hidden.
5. Images supported for hero and team members.

**Edge Cases & Error Handling:**

- No content saved yet: `/about` shows a placeholder or returns 404 (configurable).
- Team section with 0 members: hide the entire team section.
- Very long story text: render correctly, allow Markdown formatting.

---

#### FE-024: Refund Management

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| **Priority**     | P2                                                               |
| **Status**       | NOT STARTED                                                      |
| **Plan Tier**    | Basic = manual recording, Premium = Barion API + partial refunds |
| **Complexity**   | M (3-5 days)                                                     |
| **Dependencies** | FE-003 (plan gating)                                             |
| **Resolves**     | N/A                                                              |

**Business Justification:**
Orders can currently be marked as "refunded" but there's no structured tracking — no amount, reason, partial refund support, or integration with Barion's refund API. Proper refund management is essential for accounting, customer service, and legal compliance.

**User Stories:**

- As an admin, I want to record a refund with the amount and reason so I have an audit trail.
- As an admin (Premium), I want to initiate a refund through Barion's API so the customer gets money back automatically.
- As an admin, I want to do partial refunds for individual line items.
- As a customer, I want to receive an email when my refund is processed.

**Database Changes:**
Migration: `016_refunds.sql`

```sql
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  amount int NOT NULL,                              -- HUF amount refunded
  reason text NOT NULL,
  refund_method text NOT NULL CHECK (refund_method IN ('barion_api', 'manual_transfer', 'store_credit', 'other')),
  barion_refund_id text,                            -- Barion API refund ID if applicable
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  line_items jsonb,                                 -- Optional: which items were refunded [{product_id, variant_id, quantity, amount}]
  refunded_by uuid NOT NULL REFERENCES profiles(id),
  restore_stock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_order ON refunds (order_id);
```

**RLS Policies:**

- SELECT/INSERT/UPDATE: admin only.

**Server Actions:**
New file: `src/lib/actions/refunds.ts`

```typescript
export async function createRefund(input: {
  orderId: string
  amount: number
  reason: string
  refundMethod: "barion_api" | "manual_transfer" | "store_credit" | "other"
  lineItems?: Array<{ productId: string; variantId?: string; quantity: number; amount: number }>
  restoreStock: boolean
}): Promise<Refund>

export async function getOrderRefunds(orderId: string): Promise<Refund[]>
export async function getRefundSummary(
  orderId: string,
): Promise<{ totalRefunded: number; orderTotal: number; remainingRefundable: number }>
```

**Barion API refund (Premium):**

- Call Barion Refund API with payment ID + amount.
- Store `barion_refund_id` on success.
- Mark status as `processed` on API success, `failed` on API error.

**Stock restoration:**

- If `restoreStock = true`: for each line item in the refund, increment product/variant stock by the refunded quantity.

**UI/UX Specification:**

**Order detail page — Refund section:**

- "Visszatérítés" (Refund) button on order detail.
- Opens modal/drawer:
  - Amount input (default: order total — previous refunds).
  - Reason textarea (required).
  - Method selector: Barion API (Premium, if order was paid via Barion), manual transfer, store credit, other.
  - Line item selection (Premium): checkboxes for each order item with quantity input for partial item refunds.
  - Restore stock checkbox.
  - "Visszatérítés indítása" (Process refund) button.
- Refund history on order detail: table of all refunds with date, amount, method, status, reason.

**Customer notification:**

- Email sent after refund processed: "Visszatérítés feldolgozva" (Refund processed) with amount, method, order reference.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test amount validation (can't exceed order total, can't exceed remaining refundable), stock restoration logic.
- Integration: create refund ? verify refund record ? verify order status updated ? verify stock restored.
- E2E (Premium): initiate Barion refund ? verify API called ? verify status updated.

**Acceptance Criteria:**

1. `refunds` table created.
2. Refund modal on order detail page.
3. Full and partial refund amounts supported.
4. Reason required for every refund.
5. Barion API refund (Premium) sends refund request and stores response.
6. Manual recording for non-Barion refunds (Basic).
7. Stock restoration option.
8. Refund history visible on order detail.
9. Customer email notification after refund.
10. Can't refund more than order total (accounting for previous refunds).

**Edge Cases & Error Handling:**

- Barion API fails: set refund status to `failed`, show error, allow retry or switch to manual.
- Refund amount exceeds remaining: validate on client and server, show "A visszatérítés összege meghaladja a visszatéríthető összeget."
- Order already fully refunded: hide refund button, show "Teljesen visszatérített" badge.
- Partial refund then full refund: calculate remaining correctly.
- Stock restoration on a deleted product/variant: skip silently, log warning.

---

#### FE-025: Extra Product Selection Checkbox

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **Priority**     | P2                                                           |
| **Status**       | DONE                                                         |
| **Plan Tier**    | All plans                                                    |
| **Complexity**   | S (1-2 days)                                                 |
| **Dependencies** | None                                                         |
| **Resolves**     | N/A (originally in "Must Have" but more of a differentiator) |

**Business Justification:**
Allows attaching complementary products (fancy packaging, accessories, free gifts) to a product page with a single checkbox. This is a simple but effective upsell mechanism that increases average order value.

**User Stories:**

- As a shop owner, I want to offer complementary products as checkboxes on product pages so customers can easily add them.
- As a customer, I want to add extras (e.g., gift wrapping) with a single click.

**Database Changes:**
Migration: `017_product_extras.sql`

```sql
CREATE TABLE product_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  extra_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  extra_variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  label text NOT NULL,                               -- Display text (e.g., "Díszcsomag (+990 Ft)")
  is_default_checked boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, extra_product_id),
  CHECK(product_id != extra_product_id)
);

CREATE INDEX idx_product_extras_product ON product_extras (product_id, sort_order);
```

**RLS Policies:**

- SELECT: public.
- INSERT/UPDATE/DELETE: admin only.

**Server Actions:**
Add to product-related actions:

```typescript
export async function getProductExtras(productId: string): Promise<ProductExtra[]>
export async function adminSetProductExtras(
  productId: string,
  extras: Array<{
    extraProductId: string
    extraVariantId?: string
    label: string
    isDefaultChecked: boolean
    sortOrder: number
  }>,
): Promise<void>
```

**UI/UX Specification:**

**Product detail page:**

- Above the "Kosárba" button: list of checkboxes.
- Each checkbox: `[x] Díszcsomag (+990 Ft)` with extra product price.
- Default state: `is_default_checked` from DB.
- On "Kosárba" click: add main product + all checked extras as separate cart items.

**Admin product form:**

- "Kiegészítő termékek" (Extra products) collapsible section.
- Product picker: search and select extra products.
- Per-extra: label text input, default checked toggle, sort order.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test add-to-cart with extras, test extras rendering.
- E2E: configure extra on product ? customer checks extra ? add to cart ? cart contains both main and extra products.

**Acceptance Criteria:**

1. `product_extras` table created.
2. Checkbox extras shown on product detail page.
3. Extras added as separate cart items when checked.
4. Admin can configure extras per product.
5. Default checked state configurable.
6. Self-reference prevention.

**Edge Cases & Error Handling:**

- Extra product is out of stock: hide that extra or show as disabled with "Elfogyott" label.
- Extra product is deleted: cascade removes the extra relation.
- Extra product price changes: label text is static (set by admin), but actual cart price uses live product price. Consider auto-generating label if admin leaves it empty.

---

#### FE-026: Order Export (CSV/Excel)

| Field            | Value             |
| ---------------- | ----------------- |
| **Priority**     | P2                |
| **Status**       | DONE              |
| **Plan Tier**    | All plans         |
| **Complexity**   | S (1-2 days)      |
| **Dependencies** | None              |
| **Resolves**     | N/A (new feature) |

**Business Justification:**
Admins need to export order data for accounting, tax reporting, inventory planning, and external analysis. This is a basic admin feature expected by every shop owner.

**User Stories:**

- As an admin, I want to export orders as CSV for accounting and reporting.
- As an admin, I want to filter exports by date range and status.

**Database Changes:** None.

**Server Actions:**
Add to `src/lib/actions/orders.ts`:

```typescript
export async function exportOrdersCsv(filters: {
  dateFrom?: string
  dateTo?: string
  status?: OrderStatus
}): Promise<string> // CSV string
```

**CSV columns:**
`order_number, date, status, customer_name, customer_email, shipping_method, shipping_fee, subtotal, discount, total, payment_status, items_count, shipping_address, tracking_number`

Optionally a second CSV for order line items:
`order_number, product_title, variant, sku, quantity, unit_price, line_total`

**UI/UX Specification:**

- "Exportálás" (Export) button on `/admin/orders` page.
- Click opens a dropdown/modal with:
  - Date range picker (from — to).
  - Status filter (all, paid, shipped, delivered, etc.).
  - Format: CSV (default), optionally Excel (`.xlsx` using `xlsx` library).
  - "Letöltés" (Download) button.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test CSV generation with various order data, test date filtering.
- E2E: filter orders ? export ? verify CSV contains correct rows.

**Acceptance Criteria:**

1. Export button on admin orders page.
2. Date range and status filters.
3. CSV includes all relevant order fields.
4. Hungarian characters correctly encoded (UTF-8 with BOM for Excel compatibility).
5. Downloads as `.csv` file with timestamp in filename.

**Edge Cases & Error Handling:**

- No orders match filter: download empty CSV with headers only.
- Very large export (10,000+ orders): show progress indicator, consider server-side streaming.
- Special characters in customer names: properly escaped in CSV (quote fields containing commas).

---

#### FE-027: Inventory Low Stock Alerts

| Field            | Value                         |
| ---------------- | ----------------------------- |
| **Priority**     | P2                            |
| **Status**       | NOT STARTED                   |
| **Plan Tier**    | All plans                     |
| **Complexity**   | S (1-2 days)                  |
| **Dependencies** | FE-007 (email infrastructure) |
| **Resolves**     | N/A (new feature)             |

**Business Justification:**
Running out of stock means lost sales. Automated low stock alerts notify admins before products run out, enabling proactive restocking. This is essential for shops with large catalogs where manual monitoring is impractical.

**User Stories:**

- As an admin, I want to be emailed when a product's stock drops below a threshold so I can reorder in time.
- As an admin, I want to set different thresholds per product.
- As an admin, I want to see a low stock dashboard view.

**Database Changes:**

```sql
ALTER TABLE products ADD COLUMN low_stock_threshold int NOT NULL DEFAULT 5;
ALTER TABLE product_variants ADD COLUMN low_stock_threshold int;  -- Override product-level threshold

-- Table to prevent duplicate alerts
CREATE TABLE stock_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  stock_level int NOT NULL,
  alerted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);
```

**Server Actions:**

```typescript
export async function checkAndSendLowStockAlerts(): Promise<{ alertsSent: number }>
export async function getLowStockProducts(): Promise<
  Array<{
    product: ProductSummary
    variant?: VariantSummary
    currentStock: number
    threshold: number
  }>
>
```

**Trigger:** Run `checkAndSendLowStockAlerts()` when:

- Order is paid (stock decremented).
- Or via a scheduled cron/Edge Function (daily).

**Email template:** `src/lib/integrations/email/templates/low-stock-alert.tsx`

- Subject: "Alacsony készlet figyelmeztetés" (Low stock alert)
- Content: table of products below threshold with current stock, threshold, "Készlet frissítése" (Update stock) CTA.

**UI/UX Specification:**

- Admin dashboard: "Alacsony készlet" (Low stock) card with count of products below threshold. Click ? filtered product list.
- Product form: "Készlet figyelmeztetés küszöbérték" (Stock alert threshold) input field.
- `/admin/products` filter: "Alacsony készlet" quick filter.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
inventory: {
  defaultLowStockThreshold: 5,
  enableLowStockAlerts: true,
}
```

**Testing Requirements:**

- Unit: test threshold comparison logic, test alert deduplication.
- Integration: set threshold to 10 ? reduce stock to 8 ? verify alert sent ? reduce to 5 ? verify NO duplicate alert.

**Acceptance Criteria:**

1. `low_stock_threshold` column on products and variants.
2. Email alert sent when stock drops below threshold.
3. Alert deduplication (one alert per product until restocked).
4. Admin dashboard low stock card.
5. Configurable threshold per product.
6. Low stock filter on products list.

**Edge Cases & Error Handling:**

- Stock drops to 0 (already alerted at threshold): don't send duplicate. Only re-alert if stock was above threshold then drops below again.
- Product with no threshold set: use default from config (5).
- Variant-level threshold: override product-level. If variant threshold is NULL, inherit from product.
- 50 products below threshold at once: batch into single email with table of all low-stock items.

---

#### FE-028: Shipping Carrier API Integration

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| **Priority**     | P2                                         |
| **Status**       | NOT STARTED                                |
| **Plan Tier**    | Premium                                    |
| **Complexity**   | XL (2+ weeks)                              |
| **Dependencies** | FE-003 (plan gating)                       |
| **Resolves**     | Spec Gap #3 — hardcoded mock shipping data |

**Business Justification:**
Currently, shipping options use hardcoded mock data. Real carrier integration enables live pricing, label generation, and tracking — eliminating manual shipping workflows. This is the biggest operational efficiency gain for shop owners.

**User Stories:**

- As a shop owner, I want shipping prices calculated from carrier APIs so I charge accurate rates.
- As a shop owner, I want to generate shipping labels from my admin panel.
- As a customer, I want to select a pickup point from an interactive map.
- As a customer, I want real tracking information for my shipment.

**Database Changes:**
Migration: `018_shipping_integration.sql`

```sql
CREATE TABLE shipping_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES profiles(id),
  provider text NOT NULL CHECK (provider IN ('gls', 'mpl', 'foxpost', 'packeta', 'express_one')),
  api_key_encrypted text,
  api_secret_encrypted text,
  is_active boolean NOT NULL DEFAULT false,
  settings jsonb DEFAULT '{}',             -- Provider-specific settings
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);
```

**RLS Policies:**

- SELECT/INSERT/UPDATE: admin of the shop only.

**Server Actions:**
New file: `src/lib/actions/shipping.ts` (or extend existing):

```typescript
export async function getShippingRates(input: {
  destinationZip: string
  weightKg: number
  carrierType: "home_delivery" | "pickup_point"
}): Promise<ShippingRate[]>

export async function getPickupPoints(input: {
  provider: PickupPointProvider
  city?: string
  zip?: string
  lat?: number
  lng?: number
}): Promise<PickupPoint[]>

export async function generateShippingLabel(orderId: string): Promise<{
  labelUrl: string
  trackingNumber: string
}>

export async function getTrackingInfo(trackingNumber: string): Promise<TrackingEvent[]>
```

**Carrier adapter pattern:**

```typescript
// src/lib/integrations/shipping/adapter.ts
interface ShippingAdapter {
  getRates(params: RateRequest): Promise<ShippingRate[]>
  getPickupPoints(params: PickupPointRequest): Promise<PickupPoint[]>
  createShipment(params: ShipmentRequest): Promise<ShipmentResponse>
  getTracking(trackingNumber: string): Promise<TrackingEvent[]>
}

// Implementations:
// src/lib/integrations/shipping/gls-adapter.ts
// src/lib/integrations/shipping/foxpost-adapter.ts
// src/lib/integrations/shipping/mock-adapter.ts (fallback)
```

**UI/UX Specification:**

**Admin settings: `/admin/settings/shipping`**

- Per-carrier configuration cards: API key inputs, activate/deactivate toggle, test connection button.
- Only for Premium plan. Basic plan shows existing static config.

**Checkout — Shipping step (enhanced):**

- Home delivery: show real rates from carrier API (if configured), else static from config.
- Pickup point: interactive map/list of pickup points from carrier API. Search by city or zip.
- Selected pickup point name + address shown in order summary.

**Admin order detail — Shipping section:**

- "Címke generálás" (Generate label) button ? calls carrier API, returns PDF label.
- Tracking number auto-populated.
- "Követés" (Tracking) link ? shows tracking timeline from carrier API.

**Configuration Changes:**

```typescript
// In ShippingConfig
carrierApiEnabled: false,  // true when Premium + API configured
```

**Testing Requirements:**

- Unit: test adapter interface with mock adapter, test rate calculation, test pickup point filtering.
- Integration: configure GLS test API ? get rates ? generate label ? get tracking.
- E2E: checkout with real pickup point selection (using mock adapter in test env).

**Acceptance Criteria:**

1. Carrier adapter pattern implemented with at least 2 real adapters (GLS + Foxpost).
2. Mock adapter as fallback for Basic plan or unconfigured carriers.
3. Admin can configure carrier API credentials.
4. Live shipping rates in checkout.
5. Pickup point selection from carrier API.
6. Shipping label generation from admin.
7. Tracking number linked to carrier tracking.
8. Premium plan gated.

**Edge Cases & Error Handling:**

- Carrier API down: fall back to static rates from config. Show "Becsült szállítási költség" (Estimated shipping cost) label.
- Carrier API timeout (>5s): use cached rates or static fallback.
- Invalid API credentials: show clear error on admin settings page with "Teszt sikertelen" (Test failed) message.
- No pickup points in customer's area: show "Nincs elérhető átvevőhely a közelben" (No pickup points nearby).
- Weight not set on product: use default weight from config (e.g., 0.5 kg).

---

#### FE-029: VAT Rate Management

| Field            | Value             |
| ---------------- | ----------------- |
| **Priority**     | P2                |
| **Status**       | DONE              |
| **Plan Tier**    | All plans         |
| **Complexity**   | S (1-2 days)      |
| **Dependencies** | None              |
| **Resolves**     | N/A (new feature) |

**Business Justification:**
Hungary has three VAT rates: 27% (general), 18% (some food products), and 5% (basic foodstuffs, books, medicine). Invoicing adapters (Billingo/Szamlazz) require the correct VAT rate per line item. Currently, VAT is likely hardcoded or absent — this needs proper management.

**User Stories:**

- As a shop owner, I want to assign the correct VAT rate to each product so my invoices are legally correct.
- As a shop owner, I want the default VAT rate to be 27% (most common in Hungary) so I don't have to set it on every product.

**Database Changes:**
Migration: `019_vat_rates.sql`

```sql
-- Add VAT rate to products
ALTER TABLE products ADD COLUMN vat_rate int NOT NULL DEFAULT 27;
ALTER TABLE products ADD CONSTRAINT chk_vat_rate CHECK (vat_rate IN (5, 18, 27));

COMMENT ON COLUMN products.vat_rate IS 'Hungarian VAT rate: 5%, 18%, or 27%. Used for invoicing.';
```

**Server Actions:**
Modify product actions to accept `vat_rate` field.
Modify invoicing adapter calls to include the correct VAT rate per line item.

```typescript
// Modify adminCreateProduct / adminUpdateProduct input schema:
// Add: vat_rate: z.number().refine(v => [5, 18, 27].includes(v))
```

**UI/UX Specification:**

**Admin product form:**

- "ÁFA kulcs" (VAT rate) dropdown in the pricing section.
- Options: "27% (általános)" (27% general), "18% (élelmiszer)" (18% food), "5% (kedvezményes)" (5% reduced).
- Default: 27%.

**Invoice integration:**

- When generating an invoice (Billingo/Szamlazz), include `vat_rate` per line item.
- Invoice displays net price, VAT amount, and gross price correctly.

**Configuration Changes:**
Add to `site.config.ts`:

```typescript
tax: {
  defaultVatRate: 27,
  availableRates: [5, 18, 27],
}
```

**Testing Requirements:**

- Unit: test VAT rate validation, test invoice line item calculation with different rates.
- Integration: create product with 18% VAT ? place order ? generate invoice ? verify invoice shows 18% VAT.

**Acceptance Criteria:**

1. `vat_rate` column on products with default 27%.
2. VAT rate selector in admin product form.
3. Invoicing adapters pass correct VAT rate per line item.
4. Only valid Hungarian VAT rates allowed (5, 18, 27).
5. Default rate configurable in site config.

**Edge Cases & Error Handling:**

- Product with no VAT rate set (legacy): default to 27%.
- Mixed VAT rates in one order: each line item has its own rate. Invoice should separate by VAT rate group.
- Tax-exempt products: not currently supported. If needed, could add `0%` as a rate in the future.
- CSV import (FE-020): `vat_rate` column included, defaults to 27 if empty.

---

#### FE-030: Customer-Facing Component Variants

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| **Priority**     | P2                                             |
| **Status**       | NOT STARTED                                    |
| **Plan Tier**    | Premium (admin selects variants)               |
| **Complexity**   | L (1-2 weeks)                                  |
| **Dependencies** | FE-017 (theme customization as infrastructure) |
| **Resolves**     | N/A                                            |

**Business Justification:**
Different webshops need different visual layouts. A fashion store needs a full-width hero with video; a food store needs a trust-focused layout. Multiple component variants (selectable in admin) let each shop customize its look without code changes.

**User Stories:**

- As a shop owner (Premium), I want to choose from different hero section layouts so my homepage matches my brand.
- As a shop owner (Premium), I want different product listing layouts for different catalog sizes.

**Database Changes:**
Extend `shop_branding` (from FE-017) or create:

```sql
ALTER TABLE shop_branding ADD COLUMN component_variants jsonb DEFAULT '{}';
```

Structure:

```json
{
  "hero": "split-image", // Options: "full-width", "split-image", "video", "minimal"
  "categoryShowcase": "grid", // Options: "grid", "carousel", "featured"
  "trustBadges": "strip", // Options: "strip", "cards", "none"
  "testimonials": "carousel", // Options: "carousel", "grid", "none"
  "productHighlight": "tabs", // Options: "tabs", "sections", "carousel"
  "productListLayout": "standard", // Options: "minimal", "standard"
  "faq": "accordion", // Options: "accordion", "cards"
  "contactSection": "split", // Options: "split", "centered", "none"
  "brandLogos": "marquee" // Options: "marquee", "static-grid", "none"
}
```

**Server Actions:**

```typescript
export async function adminUpdateComponentVariants(
  variants: Partial<ComponentVariants>,
): Promise<void>
export async function getComponentVariants(): Promise<ComponentVariants>
```

**UI/UX Specification:**

**Components to build (each with 2-4 variants):**

1. **Hero section** — `src/components/storefront/hero/`
   - `hero-full-width.tsx` — full-width background image, centered text overlay.
   - `hero-split-image.tsx` — text left, image right (or reverse).
   - `hero-video.tsx` — background video with text overlay.
   - `hero-minimal.tsx` — text only, oversized typography, no image.

2. **Category showcase** — `src/components/storefront/category-showcase/`
   - `category-grid.tsx` — 2x2 or 3x2 grid of category cards with images.
   - `category-carousel.tsx` — horizontal scroll carousel.
   - `category-featured.tsx` — one large featured category + 3 smaller.

3. **Trust badges** — `src/components/storefront/trust-badges/`
   - `trust-strip.tsx` — horizontal strip of icons with text (free shipping, secure payment, etc.).
   - `trust-cards.tsx` — card layout with icons and descriptions.

4. **FAQ** — `src/components/storefront/faq/`
   - `faq-accordion.tsx` — classic accordion with expand/collapse.
   - `faq-cards.tsx` — grid of Q&A cards.

5. **Brand logos** — `src/components/storefront/brand-logos/`
   - `brand-marquee.tsx` — infinite horizontal scroll.
   - `brand-static-grid.tsx` — static logo grid.

**Admin page:** Part of `/admin/settings/branding` (FE-017).

- "Komponens változatok" (Component variants) section.
- Visual selector: thumbnail preview of each variant with radio selection.

**Configuration Changes:**
Default variants in `site.config.ts`:

```typescript
componentVariants: {
  hero: 'full-width',
  categoryShowcase: 'grid',
  trustBadges: 'strip',
  productListLayout: 'standard',
  faq: 'accordion',
  brandLogos: 'marquee',
}
```

**Testing Requirements:**

- Visual: each variant renders correctly in isolation.
- E2E: admin selects "split-image" hero ? storefront shows split-image hero.

**Acceptance Criteria:**

1. At least 2 variants per component type built.
2. Admin can select variants in branding settings (Premium).
3. Storefront dynamically renders selected variant.
4. Defaults work without any admin configuration.
5. All variants are responsive.

**Edge Cases & Error Handling:**

- Unknown variant value in DB: fall back to default.
- Missing component variant file: fall back to default, log warning.

---

#### FE-031: Product List Page Improvements

| Field            | Value                         |
| ---------------- | ----------------------------- |
| **Priority**     | P2                            |
| **Status**       | NOT STARTED                   |
| **Plan Tier**    | All plans                     |
| **Complexity**   | M (3-5 days)                  |
| **Dependencies** | FE-005 (component extraction) |
| **Resolves**     | N/A                           |

**Business Justification:**
The current product list page is one-size-fits-all. Shops with 5 products need a different layout than shops with 500 products. Config-driven layout selection lets each shop present its catalog optimally.

**User Stories:**

- As a shop owner with <10 products, I want larger product cards with more spacing so my few products don't look lost in a grid.
- As a shop owner with 20+ products, I want sidebar filters so customers can narrow down the catalog.
- As a customer, I want to filter products by category, price range, and availability.

**Database Changes:** None.

**Server Actions:**
Modify existing product listing action to support filters:

```typescript
export async function getProducts(params: {
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sortBy?: "newest" | "price_asc" | "price_desc" | "name_asc"
  page?: number
  limit?: number
}): Promise<PaginatedResult<ProductCard>>
```

**UI/UX Specification:**

**Minimal layout** (`productListLayout: 'minimal'`, for <10 products):

- No sidebar. Centered content.
- Larger product cards (1-2 per row on desktop, 1 on mobile).
- More generous padding/margins.
- Minimal sorting: dropdown only (newest, price, name).
- Category picker: horizontal pills/tabs above the grid.

**Standard layout** (`productListLayout: 'standard'`, for 20+ products):

- Sidebar (desktop) with collapsible filter groups:
  - Category (checkbox list or tree for nested categories).
  - Price range (min-max slider or inputs).
  - Availability (in stock only toggle).
- Top bar: sort dropdown + grid/list view toggle + active filter pills.
- Product cards: standard size, 3-4 per row on desktop, 2 on mobile.
- Pagination at bottom.

**Config selection:**
In `site.config.ts`:

```typescript
productList: {
  layout: 'standard',           // 'minimal' | 'standard'
  productsPerPage: 12,
  showOutOfStock: true,         // Whether to show out-of-stock products (greyed out)
}
```

**Configuration Changes:** See above.

**Testing Requirements:**

- E2E: test both layouts render correctly, test filter combinations, test sort options.
- Responsive: verify layout adapts correctly on mobile for both minimal and standard layouts.

**Acceptance Criteria:**

1. Two layout variants (minimal and standard) implemented.
2. Config-driven layout selection.
3. Standard layout: sidebar filters (category, price, availability).
4. Both layouts: sort dropdown.
5. Active filter pills with clear-all option.
6. Pagination on standard layout.
7. Responsive on all screen sizes.
8. Out-of-stock products shown greyed out (configurable).

**Edge Cases & Error Handling:**

- Zero products match filters: "Nincs találat a megadott szurokkel" (No results with selected filters) with clear filters button.
- Single category: hide category filter.
- Price range with no products: show empty state.
- URL-based filters (query params): support sharing filtered views via URL.

---

### P3 — Premium Differentiators (13 features)

## Advanced features that justify the Premium plan price and differentiate from competitors. Lower urgency but high value for established shops.

#### FE-032: Flash Sales / Countdown Timers

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | M (3-5 days)         |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Flash sales create urgency and drive impulse purchases. Countdown timers are proven to increase conversion by 8-14%. This is a Premium differentiator that helps shops run time-limited promotions effectively.

**User Stories:**

- As a shop owner, I want to create time-limited discount sales with countdown timers.
- As a shop owner, I want flash sales to auto-activate and auto-deactivate based on schedule.
- As a customer, I want to see a countdown timer so I know how long the deal lasts.

**Database Changes:**
Migration: `020_flash_sales.sql`

```sql
CREATE TABLE flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value int NOT NULL,                    -- Percentage (e.g., 20) or fixed HUF amount
  product_ids uuid[] NOT NULL DEFAULT '{}',       -- Products included in the sale
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at > starts_at),
  CHECK(discount_value > 0)
);

CREATE INDEX idx_flash_sales_active ON flash_sales (starts_at, ends_at) WHERE is_active = true;
```

**RLS Policies:**

- SELECT: public (storefront needs to read active sales for pricing).
- INSERT/UPDATE/DELETE: admin only.

**Server Actions:**
New file: `src/lib/actions/flash-sales.ts`

```typescript
export async function getActiveFlashSales(): Promise<FlashSale[]>
export async function getFlashSalePrice(
  productId: string,
): Promise<{ originalPrice: number; salePrice: number; endsAt: string } | null>
export async function adminCreateFlashSale(input: CreateFlashSaleInput): Promise<FlashSale>
export async function adminUpdateFlashSale(
  id: string,
  input: UpdateFlashSaleInput,
): Promise<FlashSale>
export async function adminDeleteFlashSale(id: string): Promise<void>
export async function adminGetFlashSales(params: {
  status?: "active" | "upcoming" | "ended" | "all"
}): Promise<FlashSale[]>
```

**Price resolution logic:**

1. Check if product is in any active flash sale (`starts_at <= now() AND ends_at > now() AND is_active`).
2. If yes: calculate sale price from discount. If multiple sales apply, use the best discount.
3. Flash sale price takes precedence over `compare_at_price` discount.
4. Server-side calculation — never trust client-side prices.

**UI/UX Specification:**

**Admin page: `/admin/flash-sales`**

- List of all flash sales: title, dates, discount, product count, status (upcoming/active/ended).
- Create/edit form: title, start/end datetime pickers, discount type + value, product multi-selector.

**Storefront — Product card + detail:**

- Countdown timer component: "Ajanlat vege: 02:14:33:07" (Offer ends: 2d 14h 33m 07s).
- Shown on product cards and detail pages for products in active flash sales.
- Original price crossed out, sale price highlighted in accent color.
- Client component with `useEffect` interval for live countdown.

**Homepage section:**

- "Akcios ajanlatok" (Special offers) section showing flash sale products.
- Only visible when at least one flash sale is active.
- Horizontal scroll of product cards with countdown overlays.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test price calculation (percentage, fixed), test time-range logic, test overlap handling.
- E2E: create flash sale ? verify countdown appears ? wait for end ? verify price reverts.

**Acceptance Criteria:**

1. `flash_sales` table created.
2. Admin CRUD for flash sales.
3. Countdown timer on product cards and detail pages.
4. Sale price correctly calculated (percentage and fixed amount).
5. Auto-activation/deactivation based on time range.
6. Homepage "Special offers" section.
7. Server-side price validation (cart/checkout uses sale price).
8. Flash sale price respects 30-day price history (FE-006).

**Edge Cases & Error Handling:**

- Flash sale ends during checkout: honor the sale price for the current session/cart. Don't change price mid-checkout.
- Overlapping sales on same product: apply the better discount.
- Flash sale with 0 products: valid (can add products later), but show warning.
- Countdown reaches 0: hide timer, revert to normal price on next page load.
- Timezone: all times in UTC, displayed in local timezone.

---

#### FE-033: Product Bundles / Package Deals

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | L (1-2 weeks)        |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Bundles increase average order value by encouraging customers to buy complementary products together at a discount. "Save 15% when you buy these 3 together" is a powerful sales technique.

**User Stories:**

- As a shop owner, I want to create product bundles with a bundle discount so customers buy more.
- As a customer, I want to see how much I save by buying the bundle vs. individual products.

**Database Changes:**
Migration: `021_bundles.sql`

```sql
CREATE TABLE bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'fixed_price')),
  discount_value int NOT NULL,                    -- Percentage, fixed HUF off, or total bundle price
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE(bundle_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_bundle_items_bundle ON bundle_items (bundle_id, sort_order);
```

**Server Actions:**
New file: `src/lib/actions/bundles.ts`

```typescript
export async function getActiveBundles(): Promise<BundleWithItems[]>
export async function getBundleBySlug(slug: string): Promise<BundleWithItems | null>
export async function getBundlePrice(bundleId: string): Promise<{
  originalTotal: number
  bundlePrice: number
  savings: number
  savingsPercent: number
}>
export async function addBundleToCart(bundleId: string): Promise<void>
export async function adminCreateBundle(input: CreateBundleInput): Promise<Bundle>
export async function adminUpdateBundle(id: string, input: UpdateBundleInput): Promise<Bundle>
export async function adminDeleteBundle(id: string): Promise<void>
```

**UI/UX Specification:**

**Admin page: `/admin/bundles`**

- Bundle list + create/edit form.
- Product selector for bundle items, with quantity per item.
- Discount configuration: percentage off total, fixed HUF off, or set a total bundle price.
- Price preview: shows calculated original total, discount, and final price.

**Storefront:**

- Bundle cards on homepage or dedicated `/bundles` page.
- Bundle card shows: included products as small thumbnails, original total (crossed out), bundle price, savings amount.
- "Csomag kosarba" (Add bundle to cart) button ? adds all items as separate cart entries with bundle discount applied.
- Product detail page: "Csomagban olcsobb" (Cheaper in a bundle) section if the product is part of any active bundle.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test price calculation for all 3 discount types, test bundle-to-cart logic.
- E2E: create bundle ? verify on storefront ? add to cart ? verify cart shows correct items and prices.

**Acceptance Criteria:**

1. `bundles` and `bundle_items` tables created.
2. Admin CRUD for bundles.
3. Three discount types supported.
4. Bundle card with savings display.
5. Add bundle adds all items to cart with correct pricing.
6. Product detail shows "Cheaper in bundle" when applicable.

**Edge Cases & Error Handling:**

- Bundle item out of stock: show bundle as unavailable or exclude that item with adjusted pricing.
- Product in bundle deleted: cascade removes bundle item. If bundle has <2 items, deactivate bundle.
- Bundle discount exceeds total: cap at 0 (free bundle). Show warning to admin.
- Customer adds bundle then adds individual items from the bundle: don't double-discount. Bundle discount is applied per bundle, not per item.

---

#### FE-034: Gift Cards / Digital Vouchers

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| **Priority**     | P3                                                |
| **Status**       | NOT STARTED                                       |
| **Plan Tier**    | Premium                                           |
| **Complexity**   | L (1-2 weeks)                                     |
| **Dependencies** | FE-003 (plan gating), FE-007 (email for delivery) |
| **Resolves**     | N/A                                               |

**Business Justification:**
Gift cards expand the customer base (gift recipients become new customers) and provide upfront revenue. They're especially popular during holidays and can be purchased last-minute since they're digital.

**User Stories:**

- As a customer, I want to buy a digital gift card and send it to someone's email.
- As a gift recipient, I want to redeem the gift card at checkout.
- As an admin, I want to see gift card sales and usage.

**Database Changes:**
Migration: `022_gift_cards.sql`

```sql
CREATE TABLE gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                       -- Unique redemption code
  initial_value int NOT NULL,                      -- HUF
  remaining_value int NOT NULL,                    -- HUF (decremented on use)
  currency text NOT NULL DEFAULT 'HUF',
  purchased_by uuid REFERENCES profiles(id),
  recipient_email text NOT NULL,
  recipient_name text,
  sender_name text,
  message text,                                    -- Personal message from sender
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,                          -- NULL = no expiry
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,                         -- First use timestamp
  CHECK(remaining_value >= 0),
  CHECK(remaining_value <= initial_value)
);

CREATE TABLE gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL REFERENCES gift_cards(id),
  order_id uuid REFERENCES orders(id),
  amount int NOT NULL,                             -- Amount used in this transaction
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gift_cards_code ON gift_cards (code) WHERE is_active = true;
```

**Server Actions:**
New file: `src/lib/actions/gift-cards.ts`

```typescript
export async function purchaseGiftCard(input: {
  value: number // Predefined values: 5000, 10000, 20000, 50000
  recipientEmail: string
  recipientName?: string
  senderName?: string
  message?: string
}): Promise<GiftCard>

export async function redeemGiftCard(
  code: string,
  orderTotal: number,
): Promise<{
  amountApplied: number
  remainingBalance: number
}>

export async function getGiftCardBalance(code: string): Promise<{
  initialValue: number
  remainingValue: number
  isActive: boolean
  expiresAt: string | null
}>

// Admin
export async function adminGetGiftCards(params: {
  status?: "active" | "used" | "expired" | "all"
}): Promise<PaginatedResult<GiftCard>>
export async function adminDeactivateGiftCard(id: string): Promise<void>
export async function adminCreateGiftCard(input: ManualGiftCardInput): Promise<GiftCard> // For manual/promotional cards
```

**Gift card code generation:** Random 16-character alphanumeric, formatted as `XXXX-XXXX-XXXX-XXXX`. Collision check before insert.

**Redemption logic:**

1. Customer enters gift card code at checkout.
2. Validate: code exists, is active, not expired, has remaining balance.
3. Apply: deduct `min(remaining_value, order_total)` from gift card.
4. If gift card covers entire order: no additional payment needed.
5. If partial: remaining amount charged via normal payment (Barion).
6. Record transaction in `gift_card_transactions`.

**UI/UX Specification:**

**Purchase page: `/gift-cards`**

- Predefined value buttons: 5 000 Ft, 10 000 Ft, 20 000 Ft, 50 000 Ft.
- Recipient form: email, name, personal message.
- Styled preview of the gift card email.
- "Vásárlás" (Purchase) button → standard checkout flow (no shipping needed).

**Email template:** `gift-card-delivery.tsx`

- Beautiful styled email with: gift card code, value, personal message, sender name, "Felhasználás" (Redeem) CTA → store homepage.

**Checkout integration:**

- "AjándÉkkártya kód" (Gift card code) input field on payment step.
- "Alkalmaz" (Apply) button → validates and shows applied amount.
- Shows remaining order amount to pay.

**Admin page: `/admin/gift-cards`**

- Table: code, value, remaining, recipient, status, created, used.
- Manual create button for promotional cards.
- Deactivate button.

**Configuration Changes:**

```typescript
giftCards: {
  enabled: false,          // Premium only
  predefinedValues: [5000, 10000, 20000, 50000],
  expiryMonths: 12,        // NULL = no expiry
}
```

**Testing Requirements:**

- Unit: test code generation uniqueness, redemption math (full, partial, zero balance), expiry check.
- E2E: purchase gift card ? recipient receives email ? redeem at checkout ? verify balance decremented.

**Acceptance Criteria:**

1. `gift_cards` and `gift_card_transactions` tables created.
2. Purchase page with predefined values.
3. Styled delivery email sent to recipient.
4. Redemption at checkout with code input.
5. Partial redemption supported (remaining balance tracked).
6. Admin management page.
7. Code validation (active, not expired, has balance).
8. No shipping required for gift card purchases.

**Edge Cases & Error Handling:**

- Gift card expired: "Ez az ajándÉkkártya lejárt" (This gift card has expired).
- Gift card already fully used: "Ennek az ajándÉkkártyának nincs egyenlege" (This gift card has no balance).
- Gift card code not found: "ÉrvÉnytelen ajándÉkkártya kód" (Invalid gift card code).
- Order cancelled after gift card applied: refund the applied amount back to the gift card balance.
- Multiple gift cards on one order: not supported initially. One gift card per order.

---

#### FE-035: Customer Segmentation & Tags

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | M (3-5 days)         |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Targeted marketing is significantly more effective than broadcast messaging. Customer tags and segments enable shop owners to send relevant emails to specific customer groups, improving open rates and reducing unsubscribes.

**User Stories:**

- As a shop owner, I want to see a customer list with tags so I can understand my customer base.
- As a shop owner, I want automatic tags based on purchase behavior.
- As a shop owner, I want to target specific segments when sending marketing emails.

**Database Changes:**
Migration: `023_customer_tags.sql`

```sql
ALTER TABLE profiles ADD COLUMN tags text[] DEFAULT '{}';

CREATE INDEX idx_profiles_tags ON profiles USING gin(tags);
```

**Auto-tag rules** (applied via trigger or server action after order completion):

- `first_purchase` — after first completed order.
- `repeat_buyer` — after 3+ completed orders.
- `high_value` — total lifetime spend > configurable threshold (default: 100,000 HUF).
- `inactive_90d` — no orders in last 90 days (run via scheduled job).
- `vip` — manual tag only.
- `newsletter_subscriber` — when subscribed to marketing emails.

**Server Actions:**
New file: `src/lib/actions/customers.ts`

```typescript
export async function adminGetCustomers(params: {
  search?: string
  tags?: string[]
  sortBy?: "name" | "orders" | "spent" | "last_order"
  page?: number
}): Promise<PaginatedResult<CustomerWithStats>>

export async function adminGetCustomer(userId: string): Promise<CustomerDetail>
export async function adminUpdateCustomerTags(userId: string, tags: string[]): Promise<void>
export async function adminRunAutoTagging(): Promise<{ updated: number }>
export async function getCustomerSegments(): Promise<Array<{ tag: string; count: number }>>
```

**UI/UX Specification:**

**Admin page: `/admin/customers`**

- Customer table: name, email, orders count, total spent, tags (as colored pills), last order date.
- Search by name/email.
- Filter by tag (multi-select).
- Click row ? customer detail page.

**Customer detail: `/admin/customers/[id]`**

- Profile info, order history, lifetime stats (orders, total spent, AOV).
- Tags: editable tag input (add/remove tags).
- Auto-tags shown with "Auto" badge (can be removed but will re-apply on next auto-tag run).

**Marketing integration:**

- When creating a marketing campaign (existing feature), add segment selector: target by tags.
- "KÜldÉs mindenkinek" (Send to all) or "Szegmens kiválasztása" (Select segment) with tag multi-select.

**Configuration Changes:**

```typescript
customerTags: {
  autoTagRules: {
    repeatBuyerThreshold: 3,       // orders
    highValueThreshold: 100000,    // HUF lifetime spend
    inactiveDays: 90,
  }
}
```

**Testing Requirements:**

- Unit: test auto-tag logic for each rule.
- Integration: customer places 3rd order ? verify `repeat_buyer` tag auto-applied.
- E2E: admin views customer list ? filters by tag ? clicks customer ? edits tags.

**Acceptance Criteria:**

1. `tags` column on profiles with GIN index.
2. Auto-tagging rules for first_purchase, repeat_buyer, high_value, inactive.
3. Admin customer list with search and tag filters.
4. Customer detail page with editable tags.
5. Tag filtering in marketing campaign targeting.
6. Auto-tags apply after relevant events.

**Edge Cases & Error Handling:**

- Customer with no orders: no auto-tags applied (except `newsletter_subscriber` if subscribed).
- Auto-tag re-run: idempotent. Doesn't duplicate tags.
- Manual tag conflicts with auto-tag: manual removal is respected until next auto-tag run re-applies it. Consider an `auto_tag_overrides` field to permanently exclude.
- Very large customer base (10,000+): paginated queries, async auto-tagging job.

---

#### FE-036: Bulk Admin Actions

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| **Priority**     | P3                                                      |
| **Status**       | NOT STARTED                                             |
| **Plan Tier**    | Premium                                                 |
| **Complexity**   | M (3-5 days)                                            |
| **Dependencies** | FE-005 (DataTable with selection), FE-003 (plan gating) |
| **Resolves**     | N/A                                                     |

**Business Justification:**
Managing orders and products one-by-one doesn't scale. Bulk actions (multi-select, batch update) save significant time for shops with daily order volumes of 20+. This is a key Premium differentiator.

**User Stories:**

- As an admin, I want to select multiple orders and update their status at once.
- As an admin, I want to select multiple products and toggle their active state at once.
- As an admin, I want to bulk-print packing slips for selected orders.

**Database Changes:** None.

**Server Actions:**
Add to existing action files:

```typescript
// Orders
export async function adminBulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<{ updated: number }>
export async function adminBulkPrintOrders(orderIds: string[]): Promise<string> // Returns print page URL

// Products
export async function adminBulkToggleProducts(
  productIds: string[],
  isActive: boolean,
): Promise<{ updated: number }>
export async function adminBulkDeleteProducts(productIds: string[]): Promise<{ deleted: number }>
export async function adminBulkUpdateCategory(
  productIds: string[],
  categoryId: string,
): Promise<{ updated: number }>
```

**UI/UX Specification:**

**DataTable enhancement (from FE-005):**

- Checkbox column (first column) for row selection.
- "Select all" checkbox in header (selects current page).
- Selected count indicator: "X elem kiválasztva" (X items selected).
- Bulk action toolbar (appears when 1+ items selected):
  - Orders: "Állapot frissítÉs" (Update status) dropdown, "Nyomtatás" (Print), "Exportálás" (Export).
  - Products: "Aktiválás/Inaktiválás" (Activate/Deactivate), "Kategória módosítás" (Change category), "TörlÉs" (Delete).
- Confirm dialog for destructive actions (delete).

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test bulk action with valid IDs, with mixed valid/invalid IDs.
- E2E: select 3 orders → bulk update to "shipped" → verify all 3 updated.

**Acceptance Criteria:**

1. Checkbox selection on order and product list tables.
2. Bulk action toolbar appears when items selected.
3. Orders: bulk status update, bulk print.
4. Products: bulk activate/deactivate, bulk delete, bulk category change.
5. Confirmation dialog for destructive actions.
6. Premium plan gated.

**Edge Cases & Error Handling:**

- Some items fail in bulk update: return partial result ("3/5 frissítve, 2 sikertelen" — 3/5 updated, 2 failed) with error details.
- Select all + navigate to page 2: selection is per-page only (clarify in UI).
- Bulk delete with orders linked to products: don't cascade delete orders. Block or warn.

---

#### FE-037: Scheduled Product Publishing

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | S (1-2 days)         |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Shop owners want to prepare products in advance and publish them at a specific time (e.g., for a coordinated launch or marketing campaign). This is especially useful for seasonal products and drops.

**User Stories:**

- As a shop owner, I want to schedule a product to go live at a specific date/time.
- As a shop owner, I want scheduled products to auto-publish without manual intervention.

**Database Changes:**
Migration: `024_scheduled_publishing.sql`

```sql
ALTER TABLE products ADD COLUMN published_at timestamptz;

COMMENT ON COLUMN products.published_at IS 'If set to a future date, product is hidden until that time. NULL = published immediately (respects is_active).';
```

**Server Actions:**
Modify product listing queries to add filter:

```sql
WHERE is_active = true AND (published_at IS NULL OR published_at <= now())
```

**UI/UX Specification:**

**Admin product form:**

- "MegjelenÉs időpontja" (Publish date) field: date/time picker (optional).
- If set to future: show "Ütemezett: 2026-04-01 10:00" (Scheduled) badge on product form and product list.
- If NULL or past: product is live (subject to `is_active`).

**Admin product list:**

- Scheduled products show clock icon + scheduled date instead of "Active" badge.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test query filter logic (future date hidden, past date shown, NULL shown).
- E2E: schedule product for future ? verify not visible on storefront ? manually set to past ? verify visible.

**Acceptance Criteria:**

1. `published_at` column on products.
2. Date/time picker in product form.
3. Scheduled products hidden from storefront until publish time.
4. "Scheduled" badge on admin product list.
5. No manual intervention needed — auto-publishes based on server time.

**Edge Cases & Error Handling:**

- Scheduled product added to cart via direct URL: cart action should check publish status, reject if not yet published.
- Timezone: store as UTC, display in local timezone. Date picker should clarify timezone.
- Edit a scheduled product: changing `published_at` to NULL publishes immediately.

---

#### FE-038: Webhook System

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | L (1-2 weeks)        |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Webhooks enable integration with external systems (inventory management, CRM, accounting, Zapier, custom dashboards). This is a key feature for technically sophisticated shop owners who want to connect their store to their business processes.

**User Stories:**

- As a shop owner, I want to configure webhook URLs to receive event notifications.
- As a shop owner, I want to see a log of webhook deliveries for debugging.

**Database Changes:**
Migration: `025_webhooks.sql`

```sql
CREATE TABLE webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES profiles(id),
  url text NOT NULL,
  secret text NOT NULL,                           -- For HMAC signature verification
  events text[] NOT NULL DEFAULT '{}',            -- e.g., ['order.paid', 'order.shipped', 'product.created']
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_status int,
  response_body text,
  attempt int NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs (webhook_id, created_at DESC);
```

**Server Actions:**
New file: `src/lib/actions/webhooks.ts`

```typescript
export async function adminGetWebhooks(): Promise<Webhook[]>
export async function adminCreateWebhook(input: { url: string; events: string[] }): Promise<Webhook> // Auto-generates secret
export async function adminUpdateWebhook(id: string, input: Partial<WebhookInput>): Promise<Webhook>
export async function adminDeleteWebhook(id: string): Promise<void>
export async function adminGetWebhookLogs(
  webhookId: string,
  params: { page?: number },
): Promise<PaginatedResult<WebhookLog>>
export async function adminTestWebhook(
  id: string,
): Promise<{ success: boolean; statusCode: number }>
```

**Webhook dispatcher:** `src/lib/integrations/webhooks/dispatcher.ts`

```typescript
export async function dispatchWebhookEvent(
  event: string,
  payload: Record<string, unknown>,
): Promise<void>
// 1. Find all active webhooks subscribed to this event
// 2. For each: POST payload with HMAC-SHA256 signature in X-Webhook-Signature header
// 3. Retry 3 times with exponential backoff (1s, 10s, 60s)
// 4. Log each attempt in webhook_logs
```

**Supported events:**

- `order.created`, `order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`
- `product.created`, `product.updated`, `product.deleted`
- `customer.created`
- `stock.low` (from FE-027)

**Payload format:**

```json
{
  "event": "order.paid",
  "timestamp": "2026-03-24T12:00:00Z",
  "data": {
    /* event-specific data */
  }
}
```

**HMAC signature:** `HMAC-SHA256(secret, JSON.stringify(payload))` in `X-Webhook-Signature` header.

**UI/UX Specification:**

**Admin page: `/admin/settings/webhooks`**

- Webhook list: URL, events, status (active/inactive), last delivery status.
- Create form: URL input, event multi-select (checkboxes), auto-generated secret (shown once, copyable).
- Edit: change URL, events, active status. Secret rotation option.
- Log viewer: per-webhook log table with event, timestamp, status code, response body (expandable), retry count.
- Test button: sends a test event to verify the endpoint.

**Configuration Changes:** None.

**Testing Requirements:**

- Unit: test HMAC signature generation, test retry logic, test event filtering.
- Integration: create webhook ? trigger an event ? verify webhook log shows successful delivery.
- E2E: configure webhook ? place order ? verify webhook endpoint received the event.

**Acceptance Criteria:**

1. `webhooks` and `webhook_logs` tables created.
2. Admin CRUD for webhooks with event selection.
3. HMAC-SHA256 signature on all payloads.
4. 3 retries with exponential backoff.
5. All delivery attempts logged.
6. Test webhook button works.
7. At least 10 supported event types.
8. Webhook dispatcher fires non-blocking (doesn't slow down the triggering action).

**Edge Cases & Error Handling:**

- Webhook endpoint returns non-2xx: retry up to 3 times, mark as failed after all retries.
- Webhook endpoint is unreachable: same retry logic, log connection error.
- Webhook endpoint takes >10s to respond: timeout after 10s, count as failed attempt.
- High volume: if 100 orders come in at once, batch/queue webhook dispatching.
- Webhook secret rotation: old secret invalidated immediately, new secret shown once.
- Infinite loop: if webhook endpoint triggers an action that fires another webhook ? add `X-Webhook-Source` header, ignore self-referencing.

---

#### FE-039: Loyalty Points System

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | L (1-2 weeks)        |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Loyalty programs increase repeat purchases and customer lifetime value. Simple point earning/redemption is effective without the complexity of tiers or gamification. Even a basic "spend X, earn Y points, redeem for Z" model drives meaningful retention.

**User Stories:**

- As a customer, I want to earn points when I make purchases.
- As a customer, I want to redeem points for discounts at checkout.
- As a customer, I want to see my points balance and history.
- As an admin, I want to manually grant or revoke points for special situations.

**Database Changes:**
Migration: `026_loyalty_points.sql`

```sql
CREATE TABLE loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points int NOT NULL,                             -- Positive = earned, negative = redeemed/revoked
  reason text NOT NULL,                            -- 'order_reward', 'manual_grant', 'redemption', 'manual_revoke', 'expiry'
  order_id uuid REFERENCES orders(id),
  expires_at timestamptz,                          -- Points expiry date
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_points_user ON loyalty_points (user_id, created_at DESC);

-- Efficient balance calculation
CREATE OR REPLACE FUNCTION get_loyalty_balance(p_user_id uuid)
RETURNS int AS $$
  SELECT COALESCE(SUM(points), 0)
  FROM loyalty_points
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
$$ LANGUAGE sql STABLE;
```

**Server Actions:**
New file: `src/lib/actions/loyalty.ts`

```typescript
export async function getLoyaltyBalance(): Promise<{ balance: number; pendingExpiry: number }>
export async function getLoyaltyHistory(params: {
  page?: number
}): Promise<PaginatedResult<LoyaltyTransaction>>
export async function redeemPoints(points: number): Promise<{ discountAmount: number }>
export async function awardOrderPoints(orderId: string): Promise<{ pointsAwarded: number }>
export async function adminGrantPoints(
  userId: string,
  points: number,
  reason: string,
): Promise<void>
export async function adminRevokePoints(
  userId: string,
  points: number,
  reason: string,
): Promise<void>
export async function expireOldPoints(): Promise<{ expired: number }> // Scheduled job
```

**Points calculation:**

- Earn: configurable rate (default: 1 point per 1000 HUF spent, rounded down).
- Redeem: configurable rate (default: 1 point = 10 HUF discount).
- Minimum redemption: configurable (default: 100 points).
- Expiry: 12 months from earn date. Expired points are soft-deleted (negative entry with reason 'expiry').

**UI/UX Specification:**

**Customer profile: `/profile/loyalty`**

- Balance card: "Hűség pontjai: 1,234" (Your loyalty points: 1,234) with HUF equivalent.
- History table: date, points, reason, order link.
- Pending expiry warning: "312 pont lejár 30 napon belül" (312 points expire within 30 days).

**Checkout integration:**

- After payment step: "Pontok felhasználása" (Use points) section.
- Balance display + amount input (or "Use all" button).
- Shows discount: "1,234 pont = 12,340 Ft kedvezmény" (1,234 points = 12,340 Ft discount).
- Applied as order-level discount.

**Admin:**

- Customer detail page: loyalty balance + grant/revoke buttons.
- Grant modal: points amount + reason text.

**Configuration Changes:**

```typescript
loyalty: {
  enabled: false,                   // Premium only
  earnRate: { pointsPer: 1, spendAmount: 1000 },  // 1 point per 1000 HUF
  redeemRate: { hufPer: 10, points: 1 },           // 1 point = 10 HUF
  minimumRedemption: 100,
  expiryMonths: 12,
}
```

**Testing Requirements:**

- Unit: test earn calculation, redeem calculation, balance with expired points, minimum redemption.
- E2E: customer places order ? points awarded ? redeems at next checkout ? balance decremented.

**Acceptance Criteria:**

1. `loyalty_points` table created with balance function.
2. Points auto-awarded after order completion.
3. Points redeemable at checkout.
4. Customer loyalty page with balance and history.
5. Admin can manually grant/revoke points.
6. 12-month expiry with scheduled cleanup.
7. Configurable earn/redeem rates.

**Edge Cases & Error Handling:**

- Customer redeems more points than balance: validate server-side, reject with "Nincs elég pontja" (Not enough points).
- Order cancelled after points awarded: auto-revoke points for that order.
- Points redeemed + order cancelled: refund points back to balance.
- Points expiring today: include in balance until end of day (midnight UTC).
- No points activity: loyalty page shows 0 balance with explanation of how to earn.

---

#### FE-040: Multi-language Support (HU + EN)

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium add-on       |
| **Complexity**   | XL (2+ weeks)        |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Some Hungarian shops cater to international customers or tourists. Basic EN translation of the UI strings (not product content) enables these shops to serve a wider audience without maintaining a separate store.

**User Stories:**

- As a customer visiting from abroad, I want to browse the store in English.
- As a shop owner, I want to toggle English language support.

**Database Changes:** None (UI strings only, not content).

**Server Actions:** None (language is client-side / middleware).

**Implementation:**

- Use `next-intl` for i18n.
- Two locales: `hu` (default), `en`.
- All UI strings extracted to JSON message files: `messages/hu.json`, `messages/en.json`.
- Product content (title, description) stays single-language (Hungarian).
- URL structure: `/en/products/...` for English, `/products/...` for Hungarian (default, no prefix).

**UI/UX Specification:**

- Language switcher in header: "HU | EN" text toggle.
- Persisted in cookie (`NEXT_LOCALE`).
- All static text translated: buttons, labels, navigation, error messages, footer, legal pages.
- Product content not translated — shown in Hungarian regardless of locale.

**Scope limitations:**

- UI strings only. No product content translation.
- No admin panel translation (admin is always Hungarian).
- Legal pages: only Hungarian versions (legal compliance requires Hungarian).

**Configuration Changes:**

```typescript
i18n: {
  enabled: false,           // Premium add-on
  defaultLocale: 'hu',
  supportedLocales: ['hu', 'en'],
}
```

**Testing Requirements:**

- Unit: test locale detection, cookie persistence, message resolution.
- E2E: switch to EN ? verify all UI strings in English ? switch back to HU ? verify Hungarian.

**Acceptance Criteria:**

1. `next-intl` configured with HU (default) and EN locales.
2. Language switcher in header.
3. All storefront UI strings translated to English.
4. Product content stays in Hungarian.
5. Admin panel stays in Hungarian.
6. Locale persisted in cookie.
7. SEO: `hreflang` tags for language alternates.

**Edge Cases & Error Handling:**

- Missing translation key: fall back to Hungarian string.
- Search in English locale: search still works on Hungarian product titles/descriptions.
- URL with locale prefix for default language (`/hu/products`): redirect to `/products` (no prefix for default).

---

#### FE-041: Social Proof Notifications

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Priority**     | P3                                                                 |
| **Status**       | NOT STARTED                                                        |
| **Plan Tier**    | Premium                                                            |
| **Complexity**   | S (1-2 days)                                                       |
| **Dependencies** | FE-002 (cookie consent — marketing category), FE-003 (plan gating) |
| **Resolves**     | N/A                                                                |

**Business Justification:**
"Someone just bought X" notifications create FOMO and social proof, increasing urgency and conversion. Simple implementation with privacy-safe data (city only, never personal info).

**User Stories:**

- As a customer, I want to see that other people are buying products so I feel confident in my purchase.
- As a shop owner, I want to configure social proof notifications to create urgency.

**Database Changes:** None (reads from recent orders).

**Server Actions:**

```typescript
export async function getRecentPurchases(limit: number): Promise<
  Array<{
    productTitle: string
    productSlug: string
    city: string // From shipping address, never full name/email
    minutesAgo: number
  }>
>
```

**UI/UX Specification:**
New component: `src/components/social-proof-toast.tsx` (`"use client"`)

- Small toast notification in bottom-left corner.
- Content: "Valaki Budapestről most vette meg: [Product Name]" with product thumbnail.
- Auto-dismiss after 5 seconds.
- Show one notification every 30-60 seconds (configurable).
- Max 3 per session (configurable, to avoid annoyance).
- Only show if marketing cookie consent given.
- Subtle slide-in animation.

**Configuration Changes:**

```typescript
socialProof: {
  enabled: false,              // Premium only
  intervalSeconds: 45,
  maxPerSession: 3,
  showCity: true,              // Privacy: city only, never names
}
```

**Testing Requirements:**

- Unit: test notification rotation, session count limiting, consent check.
- E2E: enable social proof ? visit storefront ? see notification appear ? verify privacy-safe content.

**Acceptance Criteria:**

1. Social proof toast notifications appear on storefront.
2. Shows recent real purchases (city + product name).
3. Respects marketing cookie consent.
4. Configurable frequency and session limit.
5. Privacy-safe: only city, never personal information.
6. Subtle, non-intrusive animation.

**Edge Cases & Error Handling:**

- No recent orders: don't show notifications.
- Order with no shipping address (pickup): use "Ismeretlen helyszín" (Unknown location) or skip.
- Same product shown twice: cycle through different recent orders.
- Mobile: toast may overlap with cookie consent banner — position above it.

---

#### FE-042: B2B Wholesale Mode

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **Priority**     | P3                                                             |
| **Status**       | NOT STARTED                                                    |
| **Plan Tier**    | Premium                                                        |
| **Complexity**   | L (1-2 weeks)                                                  |
| **Dependencies** | FE-003 (plan gating)                                           |
| **Resolves**     | Feature flag `enableB2BWholesaleMode` exists but nothing built |

**Business Justification:**
Some shops serve both retail (B2C) and wholesale (B2B) customers. B2B mode shows net prices (without VAT), enables bulk ordering with minimum quantities, and hides B2B prices from retail customers.

**User Stories:**

- As a wholesale customer, I want to see net prices (without VAT) so I can compare with my budget.
- As a wholesale customer, I want to order in bulk with minimum order quantities.
- As a shop owner, I want to set separate wholesale prices for B2B customers.
- As a shop owner, I want to approve B2B customer registrations.

**Database Changes:**
Migration: `027_b2b_wholesale.sql`

```sql
ALTER TABLE profiles ADD COLUMN is_b2b boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN company_name text;
ALTER TABLE profiles ADD COLUMN tax_number text;           -- Hungarian format: 12345678-1-23
ALTER TABLE profiles ADD COLUMN b2b_approved boolean NOT NULL DEFAULT false;

ALTER TABLE products ADD COLUMN wholesale_price int;       -- Net price for B2B, NULL = no B2B price
ALTER TABLE product_variants ADD COLUMN wholesale_price int;

CREATE TABLE b2b_minimum_orders (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  minimum_quantity int NOT NULL DEFAULT 1,
  PRIMARY KEY (product_id)
);
```

**Server Actions:**

```typescript
export async function registerB2B(input: {
  companyName: string
  taxNumber: string
  // ... standard registration fields
}): Promise<void>

export async function adminApproveB2B(userId: string): Promise<void>
export async function adminRejectB2B(userId: string): Promise<void>
export async function adminGetB2BRequests(): Promise<B2BRequest[]>

export async function getProductPrice(
  productId: string,
  variantId?: string,
): Promise<{
  retailPrice: number
  wholesalePrice: number | null
  isB2BUser: boolean
  showNet: boolean
}>
```

**UI/UX Specification:**

**B2B registration:**

- Separate registration flow or checkbox "Céges vásárló vagyok" (I'm a business customer) on registration page.
- Additional fields: company name, tax number (validated for Hungarian format).
- After registration: "Kérelme feldolgozás alatt" (Your request is being processed) message. No B2B prices until approved.

**B2B price display:**

- Approved B2B users see: net price (without VAT) as primary, "nettó" label, VAT amount and gross price below.
- Retail users see: gross price only (as normal).
- Product cards, detail pages, cart, and checkout all respect B2B pricing.

**Admin:**

- B2B approval queue at `/admin/b2b` (or tab on customer list).
- Set wholesale prices in product form: "Nagyker ár (nettó, HUF)" field.
- Set minimum order quantities per product.

**Feature flag integration:**

- Gated behind `enableB2BWholesaleMode` in config (already exists, currently `false`).

**Configuration Changes:**
Set `enableB2BWholesaleMode: true` when implemented (Premium plan only).

**Testing Requirements:**

- Unit: test price resolution (B2B vs retail), tax number validation, minimum quantity enforcement.
- E2E: register B2B ? admin approves ? customer sees net prices ? places order with minimum quantities.

**Acceptance Criteria:**

1. B2B registration flow with company details.
2. Admin approval workflow for B2B accounts.
3. B2B-approved users see net prices.
4. Wholesale price field on products.
5. Minimum order quantities for B2B.
6. Cart/checkout uses B2B pricing for approved users.
7. Feature gated behind `enableB2BWholesaleMode`.

**Edge Cases & Error Handling:**

- B2B user orders below minimum quantity: validate in cart/checkout, show minimum requirement.
- Product has no wholesale price: B2B user sees retail price (not hidden).
- B2B approval revoked: user reverts to retail pricing on next page load.
- Tax number validation: Hungarian format `12345678-1-23`. Show error for invalid format.

---

#### FE-043: Automatic Review Request Email

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| **Priority**     | P3                                                                           |
| **Status**       | NOT STARTED                                                                  |
| **Plan Tier**    | Premium                                                                      |
| **Complexity**   | S (1-2 days)                                                                 |
| **Dependencies** | FE-010 (reviews system), FE-007 (email infrastructure), FE-003 (plan gating) |
| **Resolves**     | N/A                                                                          |

**Business Justification:**
Reviews are critical for conversion (FE-010), but customers rarely leave reviews unprompted. A well-timed email request (7 days after shipping) dramatically increases review submission rates. This is a Premium feature that complements the Basic reviews system.

**User Stories:**

- As a shop owner, I want automatic review request emails sent after delivery so I get more reviews.
- As a customer, I want a convenient link in the email to leave a review for each product I bought.

**Database Changes:**

```sql
ALTER TABLE orders ADD COLUMN review_email_sent boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN review_email_sent_at timestamptz;
```

**Server Actions:**

```typescript
export async function sendReviewRequestEmails(): Promise<{ sent: number }>
// Called by scheduled job (Edge Function or cron)
// Query: orders WHERE status = 'shipped' AND review_email_sent = false
//   AND shipped_at < now() - interval '7 days'
//   AND shipped_at > now() - interval '30 days' (don't send for very old orders)
```

**Email template:** `src/lib/integrations/email/templates/review-request.tsx`

- Subject: "Hogy tetszettek a termékek?" (How did you like the products?)
- Content: list of purchased products with thumbnail + "Véleményt írok" (Write a review) button per product ? product page review section.
- Unsubscribe link (respects marketing email preferences).

**Scheduling:**

- Configurable delay: default 7 days after shipping.
- Run daily (Edge Function or cron job).
- One email per order (flag `review_email_sent`).

**Configuration Changes:**

```typescript
reviewRequest: {
  enabled: false,              // Premium only
  delayDays: 7,
  maxAgeDays: 30,             // Don't send for orders older than 30 days
}
```

**Testing Requirements:**

- Unit: test query logic (delay, age cutoff, already-sent flag).
- Integration: ship order ? wait simulated 7 days ? run job ? verify email sent ? run again ? verify no duplicate.

**Acceptance Criteria:**

1. Review request email sent 7 days after shipping.
2. Each purchased product listed with direct review link.
3. One email per order (no duplicates).
4. Respects unsubscribe preferences.
5. Configurable delay.
6. Premium plan gated.

**Edge Cases & Error Handling:**

- Order with 20 items: show max 5 products in email with "És még X termék" (And X more products) link to order page.
- Customer already reviewed a product: still include it (they might want to update).
- Email bounce: mark as sent anyway to prevent retry spam.
- Order cancelled after shipping: don't send review request.

---

#### FE-044: Weight-based Shipping Implementation

| Field            | Value                |
| ---------------- | -------------------- |
| **Priority**     | P3                   |
| **Status**       | NOT STARTED          |
| **Plan Tier**    | Premium              |
| **Complexity**   | S (1-2 days)         |
| **Dependencies** | FE-003 (plan gating) |
| **Resolves**     | N/A                  |

**Business Justification:**
Currently shipping fees are flat-rate. For shops selling products with varying weights (e.g., food, hardware), weight-based shipping is more accurate and fair. The `weightTiers` config already exists in `ShippingConfig` but is empty.

**User Stories:**

- As a shop owner, I want shipping fees calculated based on order weight so heavy orders cost more to ship.
- As a shop owner, I want to configure weight tiers with different shipping fees.

**Database Changes:**

```sql
ALTER TABLE products ADD COLUMN weight_grams int;           -- Product weight in grams
ALTER TABLE product_variants ADD COLUMN weight_grams int;   -- Variant weight override
```

**Server Actions:**
Modify shipping fee calculation:

```typescript
export function calculateShippingFee(params: {
  cartItems: Array<{ productId: string; variantId?: string; quantity: number }>
  shippingMethod: string
}): Promise<number> // Returns fee in HUF

// Logic:
// 1. Sum total weight of all cart items (variant weight ?? product weight ?? default weight)
// 2. Convert to kg
// 3. Find matching weight tier from config
// 4. Return tier fee (or base fee if no tiers match)
// 5. Apply free shipping threshold if applicable
```

**UI/UX Specification:**

**Admin product form:**

- "Súly (gramm)" (Weight in grams) input field in the shipping section.
- Per-variant weight override in variant builder.
- If not set: uses default weight from config.

**Admin settings: `/admin/settings/shipping`**

- Weight tiers configuration:
  - Table of tiers: max weight (kg), fee (HUF).
  - Add/remove/edit tiers.
  - Example: up to 2kg = 1490 Ft, 2-5kg = 1990 Ft, 5-10kg = 2990 Ft, 10-20kg = 4490 Ft.
- Default product weight: configurable (e.g., 500g).

**Checkout:**

- Shipping fee shown with weight tier info: "Szállítási díj (3.2 kg): 1 990 Ft".
- Free shipping threshold still applies: if cart total > threshold, fee = 0 regardless of weight.

**Configuration Changes:**
Populate existing `weightTiers` in `ShippingConfig`:

```typescript
rules: {
  baseFee: 1490,
  freeOver: 15000,
  weightTiers: [
    { maxWeightKg: 2, fee: 1490 },
    { maxWeightKg: 5, fee: 1990 },
    { maxWeightKg: 10, fee: 2990 },
    { maxWeightKg: 20, fee: 4490 },
  ],
  defaultProductWeightGrams: 500,
}
```

**Testing Requirements:**

- Unit: test fee calculation for various weights, test tier boundary cases, test free shipping override.
- E2E: add heavy product to cart ? verify higher shipping fee ? add more to reach free shipping threshold ? verify fee = 0.

**Acceptance Criteria:**

1. `weight_grams` column on products and variants.
2. Weight field in admin product form.
3. Shipping fee calculated from weight tiers.
4. Weight tiers configurable.
5. Free shipping threshold still overrides weight-based fees.
6. Checkout shows weight-based fee with weight info.
7. Default weight used for products without weight set.

**Edge Cases & Error Handling:**

- Cart weight exceeds all tiers (e.g., 25kg when max tier is 20kg): use the highest tier fee + a surcharge, or show "Kérjük, vegye fel velünk a kapcsolatot a szállítási díjjal kapcsolatban" (Please contact us about shipping cost).
- Product with 0 weight: treat as default weight.
- Mixed cart (some products with weight, some without): use default weight for those without.
- Cart with 100 items of 1g each: total = 100g, use first tier.
