-- ================================================================
-- Agency E-Commerce Boilerplate — Initial Migration
-- ================================================================
-- Matches src/lib/types/database.ts exactly.
-- Apply via: supabase db push  OR  paste into Supabase Dashboard SQL Editor
-- ================================================================

-- ── Extensions ────────────────────────────────────────────────────
create extension if not exists "pgcrypto" with schema extensions;

-- ── Enums ─────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('customer', 'admin', 'agency_viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum (
    'draft', 'awaiting_payment', 'paid', 'processing',
    'shipped', 'cancelled', 'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscriber_status as enum ('subscribed', 'unsubscribed');
exception when duplicate_object then null;
end $$;

-- ── 1. profiles ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.app_role not null default 'customer',
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ── Helper function: current_app_role() ──────────────────────────
-- Returns the app_role for the currently authenticated user.
-- Falls back to 'customer' for unauthenticated / missing profile.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'customer'::public.app_role
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admin full access to profiles"
  on public.profiles for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read profiles"
  on public.profiles for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 2. categories ─────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

alter table public.categories enable row level security;

create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_categories_slug on public.categories(slug);

create policy "Public can read active categories"
  on public.categories for select
  using (is_active = true);

create policy "Admin full access to categories"
  on public.categories for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read categories"
  on public.categories for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 3. products ───────────────────────────────────────────────────
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  description       text,
  base_price        int not null,
  compare_at_price  int,
  main_image_url    text,
  image_urls        text[] not null default '{}',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.products enable row level security;

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_active on public.products(is_active) where is_active = true;
create index if not exists idx_products_price on public.products(base_price);

create policy "Public can read active products"
  on public.products for select
  using (is_active = true);

create policy "Admin full access to products"
  on public.products for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read products"
  on public.products for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 4. product_variants ───────────────────────────────────────────
create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  sku             text unique,
  option1_name    text not null default 'Méret',
  option1_value   text,
  option2_name    text,
  option2_value   text,
  price_override  int,
  stock_quantity  int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.product_variants enable row level security;

create index if not exists idx_variants_product on public.product_variants(product_id);
create unique index if not exists idx_variants_unique_options
  on public.product_variants(product_id, option1_value, option2_value)
  where is_active = true;

create policy "Public can read active variants"
  on public.product_variants for select
  using (is_active = true);

create policy "Admin full access to variants"
  on public.product_variants for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read variants"
  on public.product_variants for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 5. product_categories (join) ──────────────────────────────────
create table if not exists public.product_categories (
  product_id  uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

alter table public.product_categories enable row level security;

create policy "Public can read product_categories"
  on public.product_categories for select
  using (true);

create policy "Admin full access to product_categories"
  on public.product_categories for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read product_categories"
  on public.product_categories for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 6. coupons ────────────────────────────────────────────────────
create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  discount_type    text not null check (discount_type in ('percentage', 'fixed')),
  value            int not null,
  min_order_amount int,
  max_uses         int,
  used_count       int not null default 0,
  valid_from       timestamptz,
  valid_until      timestamptz,
  is_active        boolean not null default true
);

alter table public.coupons enable row level security;

create index if not exists idx_coupons_code on public.coupons(code);

-- Coupons are not publicly readable; only validated via server action
create policy "Admin full access to coupons"
  on public.coupons for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read coupons"
  on public.coupons for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 7. orders ─────────────────────────────────────────────────────
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete set null,
  email                     text not null,
  status                    public.order_status not null default 'draft',
  currency                  text not null default 'HUF',
  subtotal_amount           int not null default 0,
  shipping_fee              int not null default 0,
  discount_total            int not null default 0,
  total_amount              int not null default 0,
  coupon_code               text,
  shipping_method           text not null default 'home',
  shipping_address          jsonb not null default '{}',
  shipping_phone            text,
  pickup_point_provider     text,
  pickup_point_id           text,
  pickup_point_label        text,
  billing_address           jsonb not null default '{}',
  notes                     text,
  barion_payment_id         text,
  barion_payment_request_id text,
  barion_status             text,
  invoice_provider          text,
  invoice_number            text,
  invoice_url               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  paid_at                   timestamptz,
  shipped_at                timestamptz,
  idempotency_key           text unique
);

alter table public.orders enable row level security;

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_email on public.orders(email);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_orders_barion on public.orders(barion_payment_id) where barion_payment_id is not null;

-- Customers can read their own orders
create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Allow inserting orders (for checkout — both authenticated and via service role for guests)
create policy "Authenticated users can create orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Admin full access to orders"
  on public.orders for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read orders"
  on public.orders for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 8. order_items ────────────────────────────────────────────────
create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  product_id          uuid not null references public.products(id),
  variant_id          uuid references public.product_variants(id),
  title_snapshot      text not null,
  variant_snapshot    jsonb not null default '{}',
  unit_price_snapshot int not null,
  quantity            int not null,
  line_total          int not null
);

alter table public.order_items enable row level security;

create index if not exists idx_order_items_order on public.order_items(order_id);

-- Readable only if the parent order is readable
create policy "Users can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "Admin full access to order_items"
  on public.order_items for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read order_items"
  on public.order_items for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 9. subscribers ────────────────────────────────────────────────
create table if not exists public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  status          public.subscriber_status not null default 'subscribed',
  tags            text[] not null default '{}',
  source          text,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.subscribers enable row level security;

create index if not exists idx_subscribers_email on public.subscribers(email);
create index if not exists idx_subscribers_status on public.subscribers(status);

-- Subscribers are managed by admin / server actions only (service role)
create policy "Admin full access to subscribers"
  on public.subscribers for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read subscribers"
  on public.subscribers for select
  using (public.current_app_role() = 'agency_viewer');

-- ── 10. audit_logs ────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_role  public.app_role,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- Only admin and agency_viewer can see audit logs
create policy "Admin full access to audit_logs"
  on public.audit_logs for all
  using (public.current_app_role() = 'admin');

create policy "Agency viewer can read audit_logs"
  on public.audit_logs for select
  using (public.current_app_role() = 'agency_viewer');

-- ── Auto-update updated_at trigger ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to tables with updated_at column
drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ── Storage bucket for product images ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admin can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.current_app_role() = 'admin'
  );

create policy "Admin can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.current_app_role() = 'admin'
  );

create policy "Admin can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.current_app_role() = 'admin'
  );

-- ── Seed: insert a default admin profile if needed ────────────────
-- Uncomment and replace the UUID with your Supabase auth user id:
-- insert into public.profiles (id, role)
-- values ('YOUR-AUTH-USER-UUID', 'admin')
-- on conflict (id) do update set role = 'admin';

-- ================================================================
-- Migration complete.
-- ================================================================
