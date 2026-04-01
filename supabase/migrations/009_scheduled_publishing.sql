-- Migration 009: Scheduled Product Publishing (FE-037)
-- Adds published_at column to products for time-based publishing control.
-- Products with published_at in the future are hidden from public queries.
-- NULL published_at means the product is immediately visible (respects is_active).

-- 1. Add column
ALTER TABLE products ADD COLUMN published_at timestamptz;

COMMENT ON COLUMN products.published_at IS 'If set to a future date, product is hidden from storefront until that time. NULL = published immediately (respects is_active).';

-- 2. Update RLS policy to include published_at check
-- Drop and recreate the public read policy to include scheduled publishing filter
DROP POLICY IF EXISTS "Public can read active products" ON public.products;

CREATE POLICY "Public can read active products"
  ON public.products FOR SELECT
  USING (
    is_active = true
    AND (published_at IS NULL OR published_at <= now())
  );

-- 3. Add index for efficient filtering on scheduled products
CREATE INDEX idx_products_published_at ON public.products (published_at)
  WHERE published_at IS NOT NULL;
