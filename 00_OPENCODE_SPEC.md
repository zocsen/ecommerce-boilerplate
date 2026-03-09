# Agency E-commerce Boilerplate (HU-first) — Full Spec

## Goal

Build a production-ready, minimalistic, premium-feeling e-commerce boilerplate for Hungarian webshops using:

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Supabase (Postgres, Auth, Storage, RLS)
- Barion (payments) as default gateway
- Resend (transactional + optional marketing module), React Email templates
- Admin dashboard included
- A config/feature-flag system so client-specific differences do not require core code edits

This is a BOILERPLATE: design must be clean/minimal and non-templatey, but not “showcase fancy”. No icon grids. Typography, spacing, and subtle motion only.

## Non-goals

- Not a theme marketplace.
- Not a headless CMS. (We use Supabase tables + optional Storage.)
- Not implementing every shipping carrier API end-to-end. We implement flexible shipping rules + optional pickup point selector integration hooks.
- Not implementing a full marketing automation suite rivaling Klaviyo; only the essential flows (newsletter, abandoned cart, basic segmentation).

## Key principles

- Server Components by default; Client Components only when necessary (forms, cart UI, editors).
- All writes happen on server via Server Actions or Route Handlers.
- Strict validation with Zod everywhere (server + client).
- Idempotency for payment callbacks and stock updates.
- RLS is the primary authorization layer; app-level checks are defense-in-depth.
- Clean separation: core logic (boilerplate) vs client customization (config + override hooks).
- Minimalistic, “premium utilitarian” UI: neutral palette, large type scale, real spacing, no cheesy effects.

## Stack & packages

- Next.js (latest stable), TypeScript strict
- Tailwind CSS, shadcn/ui
- zustand (+ persist), react-hook-form, zod, @hookform/resolvers
- @supabase/supabase-js, @supabase/ssr
- resend, react-email
- framer-motion optional (subtle only)
- testing: vitest + @testing-library/react, and Playwright smoke
- eslint + prettier

## Config / Feature Flags

Create `/lib/config/site.config.ts` which exports a typed config object:

- store: name, legalName, email, phone, address, currency=HUF
- urls: siteUrl, supportEmail
- features:
  - enableAccounts (bool)
  - enableGuestCheckout (bool)
  - enableCoupons (bool)
  - enableReviews (bool) (scaffold only)
  - enableMarketingModule (bool)
  - enableAbandonedCart (bool)
  - enableB2BWholesaleMode (bool)
- payments:
  - provider: "barion"
  - barion: environment (test/prod), posKey env var name, payee, redirectUrls
- shipping:
  - methods enabled: homeDelivery, pickupPoint
  - homeDelivery carriers: GLS, MPL, Express One
  - pickupPoint carriers: Foxpost, GLS Automata, Packeta, MPL Automata, Easybox
  - rules: baseFee, freeOver, weightTiers (optional)
  - pickupPoints: provider toggles + selector integration hooks
- invoicing:
  - provider: "billingo" | "szamlazz" | "none"
  - mode: "auto_on_paid" | "manual"
- admin:
  - agencyViewerEnabled (bool)
  - readonlyByDefaultForAgency (bool)
- branding (minimal): logoText, optional logoUrl, neutral theme tokens

Also create `/lib/config/hooks.ts` for optional client overrides:

- preCheckoutHook(orderDraft) -> orderDraft
- postPaidHook(order) -> void
- pricingHook(product/variant, user) -> price (for wholesale)

## Database schema (Supabase)

Create SQL migration(s) under `/supabase/migrations/001_init.sql`. Must include:

### Enums

- role: 'customer' | 'admin' | 'agency_viewer'
- order_status: 'draft' | 'awaiting_payment' | 'paid' | 'processing' | 'shipped' | 'cancelled' | 'refunded'
- subscriber_status: 'subscribed' | 'unsubscribed'

### Tables (minimum)

1. profiles

- id uuid pk references auth.users(id) on delete cascade
- role role not null default 'customer'
- full_name text
- phone text
- created_at timestamptz default now()

2. categories

- id uuid pk
- slug text unique
- name text
- parent_id uuid nullable references categories(id)
- sort_order int default 0
- is_active boolean default true

3. products

- id uuid pk
- slug text unique
- title text
- description text
- base_price int not null (HUF)
- compare_at_price int null
- main_image_url text null
- image_urls text[] default '{}'
- is_active boolean default true
- created_at, updated_at

4. product_variants

- id uuid pk
- product_id uuid references products(id) on delete cascade
- sku text null unique
- option1_name text default 'Size' (or HU label), option1_value text null
- option2_name text null, option2_value text null
- price_override int null (if set, replaces base price)
- stock_quantity int not null default 0
- is_active boolean default true
- created_at, updated_at
- unique constraint per product for option combinations (to avoid duplicates)

5. product_categories (join)

- product_id uuid references products(id) on delete cascade
- category_id uuid references categories(id) on delete cascade
- primary key (product_id, category_id)

6. coupons

- id uuid pk
- code text unique
- discount_type text check in ('percentage','fixed')
- value int not null (percentage 1..100 OR fixed HUF)
- min_order_amount int null
- max_uses int null
- used_count int default 0
- valid_from timestamptz null
- valid_until timestamptz null
- is_active boolean default true

7. orders

- id uuid pk
- user_id uuid null references auth.users(id)
- email text not null (store for guest checkout + receipts)
- status order_status default 'draft'
- currency text default 'HUF'
- subtotal_amount int not null default 0
- shipping_fee int not null default 0
- discount_total int not null default 0
- total_amount int not null default 0
- coupon_code text null
- shipping_method text not null default 'home'
- shipping_address jsonb not null default '{}'
- shipping_phone text null
- pickup_point_provider text null
- pickup_point_id text null
- pickup_point_label text null
- billing_address jsonb not null default '{}'
- notes text null
- barion_payment_id text null
- barion_payment_request_id text null
- barion_status text null
- invoice_provider text null
- invoice_number text null
- invoice_url text null
- created_at, updated_at, paid_at, shipped_at
- idempotency_key text unique null (for safe retries)

Notes:

- For `homeDelivery`, `shipping_address` must contain street, city, zip code, and validated Hungarian phone number.
- For `pickupPoint`, home street address is not required; store the selected `pickup_point_id`, provider, display label, and the user's phone/email.
- `billing_address` is always required for invoicing. By default it should mirror the delivery address via a checked checkbox, but the customer must be able to provide a different invoice address.
- If the order uses `pickupPoint`, invoicing still requires full `billing_address` details even though no home delivery address is collected.

8. order_items

- id uuid pk
- order_id uuid references orders(id) on delete cascade
- product_id uuid references products(id)
- variant_id uuid null references product_variants(id)
- title_snapshot text not null
- variant_snapshot jsonb not null default '{}'
- unit_price_snapshot int not null
- quantity int not null
- line_total int not null

9. subscribers

- id uuid pk
- email text unique
- status subscriber_status default 'subscribed'
- tags text[] default '{}'
- source text null
- created_at timestamptz default now()
- unsubscribed_at timestamptz null

10. audit_logs

- id uuid pk
- actor_id uuid null references auth.users(id)
- actor_role role null
- action text not null
- entity_type text not null
- entity_id uuid null
- metadata jsonb default '{}'
- created_at timestamptz default now()

### RLS requirements

- Enable RLS on all tables.
- products/categories are public readable when is_active=true.
- orders: customer can read their own orders when user_id matches; for guest, allow read via secure token is OPTIONAL (implement as non-default feature; if implemented, store a signed token not plain).
- order_items: readable only if order is readable.
- admin: full CRUD.
- agency_viewer: SELECT-only for admin tables (products/orders/customers/subscribers/audit_logs). No writes.

Also provide SQL helper function `current_role()` to fetch role from profiles safely, and use it in policies.

## Pages & route map (must implement)

Use route groups: `(shop)`, `(auth)`, `(admin)`.

### Storefront

1. `/` Home

- Purpose: brand intro + category navigation + featured products.
- Sections:
  - Hero: large type, CTA to /products
  - Featured categories (no icons, use text + image placeholder blocks)
  - Featured products grid (4-8 items)
  - Value props: 3 items using big numbers (01/02/03) not icons
  - Footer newsletter signup

2. `/products`

- Purpose: browse catalog
- Requirements:
  - Server-side fetch products (active only)
  - Filters in URL search params:
    - category, minPrice, maxPrice, inStock, sort (price_asc/desc, newest)
  - Pagination (server-side) with page param
  - Empty states and skeletons

3. `/products/[slug]`

- Purpose: product detail
- Requirements:
  - Server fetch product + variants + categories
  - Variant selection: buttons or chips; updates price and stock state
  - Add to cart (client)
  - Minimal gallery: main image + thumbnails
  - SEO metadata per product + JSON-LD product schema

4. `/cart`

- Purpose: view/edit cart
- Requirements:
  - Cart persisted in localStorage (Zustand)
  - Quantity controls, remove item, subtotal
  - Coupon input (if enabled): validates via server action
  - CTA to /checkout

5. `/checkout`

- Purpose: convert sale
- Requirements:
- Multi-step form (client):
  - Step 1: contact (email, phone), billing/shipping address
    - Billing/invoice address should default to the delivery address via a checked `same as delivery` checkbox
    - User must be able to uncheck it and enter a separate invoice address
    - If `pickupPoint` is chosen later, invoice address is still mandatory even though home delivery address is not
  - Step 2: shipping method select with two distinct UX paths, not a flat courier list:
    - `Házhozszállítás` (Home Delivery): choose GLS, MPL, or Express One; require street, city, zip code, and phone number with `+36` Hungarian validation
    - `Csomagautomata / Átvételi pont` (Parcel Locker / Pickup Point): choose Foxpost, GLS Automata, Packeta, MPL Automata, or Easybox; show map or dropdown API integration to select a locker/pickup point; do not require home delivery address, only selected `locker_id` plus user phone/email, but still require invoice address details
  - Step 3: review and pay
  - On submit:
    - Server action validates cart against DB (price, active, stock)
    - Creates order + order_items snapshots
    - Starts Barion payment and returns redirect URL
    - Redirect user
  - Must handle guest checkout if enabled.

6. `/checkout/success`

- Purpose: confirmation
- Requirements:
  - Reads order id from query
  - Fetches order summary (safe)
  - Shows status: paid/processing
  - CTA to /account/orders (if logged in) or back to /products

7. `/checkout/cancel`

- Purpose: payment cancelled message + return to cart

8. `/account` (if accounts enabled)

- `/account/orders`
- `/account/orders/[id]`
- Users can view their own orders, and see statuses.

9. Legal pages

- `/terms`, `/privacy`, `/shipping-and-returns` (simple MD content + layout)

### Auth

- `/login`, `/register`, `/reset-password`
  Use Supabase Auth UI built as custom minimal forms.

### Admin (must implement fully)

Protect all admin routes with server-side role check.
Agency viewer must see dashboards but cannot mutate.

1. `/admin` Dashboard (“God view”)

- KPIs: revenue 30d, orders 30d, AOV, low stock variants, recent paid orders
- Charts minimal (simple bar/line)

2. `/admin/orders`

- Table: filters (status, date range), search by email/order id
- Click row => `/admin/orders/[id]`

3. `/admin/orders/[id]`

- Order detail view:
  - customer contact + shipping info
  - line items
  - status timeline
  - actions:
    - admin only: change status, add internal note, mark shipped + tracking code
    - invoice actions: generate invoice (if provider enabled)
  - agency_viewer: read-only, no buttons

4. `/admin/products`

- Table list + search + filter active/inactive
- Button: “New product” => `/admin/products/new`

5. `/admin/products/new`

- Product create form:
  - slug auto-generation + editable
  - title, description, base price
  - images (Supabase Storage upload + URLs)
  - categories assignment
  - variants builder UI (add row: sku, option values, price override, stock)
- Save using server action with validation

6. `/admin/products/[id]`

- Edit product + variants CRUD

7. `/admin/categories`

- CRUD categories + nesting (parent select)

8. `/admin/coupons` (if coupons enabled)

- CRUD coupons, usage count, validity

9. `/admin/shipping`

- Configure shipping methods and fees via config + DB overrides (choose one approach; document it)

10. `/admin/marketing` (if marketing module enabled)

- Subscriber list view (search, tags, unsubscribe)
- Campaign builder:
  - Option A: “components-based templates” (recommended): choose template type (promo/new arrivals), edit variables (headline, product picks, CTA), preview
  - Option B: embed a visual editor (if used, keep it gated and secure)
- Send flow:
  - Create campaign record (DB optional) with subject, html, segment, scheduled_at
  - Send via email provider adapter
  - Must include unsubscribe link and store unsubscribe events

11. `/admin/settings`

- show configured integrations status (barion enabled, invoicing enabled)
- safe key storage rules: secrets in env vars; never store raw secrets in DB.

12. `/admin/audit`

- show audit_logs table

## Components (must implement)

### Shared UI

- AppShell layouts for shop/admin
- Header, footer, nav
- Breadcrumbs
- Loading skeletons
- Toast system

### Product components

- ProductCard, ProductGrid
- Price component (handles compare-at)
- VariantSelector
- StockBadge
- Gallery

### Cart/checkout components

- CartDrawer (optional) + CartPage
- CartLineItem
- CouponInput
- CheckoutStepper
- AddressForm
- ShippingMethodSelector
- HomeDeliveryForm
- PickupPointSelector interface component
- OrderSummary panel

### Admin components

- DataTable (generic)
- StatusBadge
- ConfirmDialog
- ProductForm + VariantRows
- OrderDetailPanel
- KPI cards + minimal chart

### Email components (React Email)

- Order receipt email (minimal)
- Shipping update email (minimal)
- Abandoned cart email (minimal)
- Newsletter template (minimal)

## Server Actions / functions (must implement)

Place in `/lib/actions/*`:

- products:
  - listProducts(filters)
  - getProductBySlug(slug)
  - adminCreateProduct(input)
  - adminUpdateProduct(input)
- cart/checkout:
  - validateCart(server-side) => normalized line items + totals
  - applyCoupon(code, cartSubtotal)
  - createOrderFromCart(input) => orderId
- payments:
  - startBarionPayment(orderId) => redirectUrl
  - verifyBarionPayment(paymentId) => status
  - handleBarionCallback(payload) => idempotent update
- orders:
  - getOrderForUser(orderId)
  - adminListOrders(filters)
  - adminUpdateOrderStatus(orderId, status, tracking)
- emails:
  - sendReceipt(orderId)
  - sendShipping(orderId)
  - sendAbandonedCart(orderId)
- subscribers:
  - subscribe(email)
  - unsubscribe(token/email)
  - adminTagSubscriber(email,tags)

Also create `/lib/security/*`:

- role checks
- rate limiting helpers for subscribe endpoints
- safe logging

## Integrations (must implement adapters + flows)

### Barion

- Start payment endpoint (server only)
- Callback route handler
- Idempotency rules:
  - if order already paid, callback is no-op
  - stock decrement must run once (transaction / guard)
- Store barion_payment_id + status on order

### Resend

- Transactional sending (receipt/shipping)
- Optional marketing sending (only if enabled)
- Separate sender identities via subdomains (orders., marketing.) is recommended; document it.

### Invoicing (Billingo / Számlázz)

- Implement as adapter interface with stub provider if no keys
- Must be callable from admin order page
- Auto-on-paid optional

### Shipping

- Implement flexible fee rules
- Checkout UX must branch into `Házhozszállítás` and `Csomagautomata / Átvételi pont`
- Home delivery carriers: GLS, MPL, Express One
- Pickup point carriers: Foxpost, GLS Automata, Packeta, MPL Automata, Easybox
- Pickup point selection requires map or provider dropdown integration hooks
- For pickup points, do not collect or require home street address; persist locker/provider selection plus customer phone/email
- Invoicing must always collect `billing_address`; support a checked-by-default `same as delivery` toggle and allow override with a separate invoice address

## SEO & Performance (must implement)

- Metadata per route
- sitemap.xml route handler
- robots.txt route handler
- product JSON-LD
- OpenGraph tags for product pages
- Use Next/Image where possible

## Testing (must implement)

- Unit tests: cart math, coupon validation, order total calculations
- Integration test: createOrderFromCart against mocked DB layer OR using Supabase local stub
- Playwright smoke: browse products, add to cart, reach checkout page

## Documentation (must implement)

- README: setup, env vars, local dev steps
- ENV template file: `.env.example`
- “How to create a new client shop from boilerplate” doc
- “How to update from upstream” doc

## Acceptance criteria

Project runs locally with:

- products browsing
- cart persistence
- checkout creates order draft and attempts payment init (Barion test mode)
- admin can CRUD products and see orders
- role-based access works (agency_viewer read-only)
- receipts can be sent in dev mode (email provider configured)
