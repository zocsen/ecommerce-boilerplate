-- ============================================================================
-- Migration 012: Price History Tracking (FE-006)
-- EU Omnibus Directive compliance — tracks product/variant price changes
-- to display the lowest price in the last 30 days when a product is discounted.
-- ============================================================================

-- 1. Create price_history table
CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  price int NOT NULL,
  compare_at_price int,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Index for fast lookups: product + optional variant, ordered by most recent
CREATE INDEX idx_price_history_lookup
  ON price_history (product_id, variant_id, recorded_at DESC);

-- Additional index for cleanup queries (records older than X days)
CREATE INDEX idx_price_history_recorded_at
  ON price_history (recorded_at);

-- 3. Trigger function: record price change on products table
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.base_price IS DISTINCT FROM OLD.base_price
     OR NEW.compare_at_price IS DISTINCT FROM OLD.compare_at_price
  THEN
    INSERT INTO price_history (product_id, variant_id, price, compare_at_price)
    VALUES (NEW.id, NULL, NEW.base_price, NEW.compare_at_price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_price_change
  AFTER INSERT OR UPDATE OF base_price, compare_at_price ON products
  FOR EACH ROW EXECUTE FUNCTION record_price_change();

-- 4. Trigger function: record price change on product_variants table
CREATE OR REPLACE FUNCTION record_variant_price_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.price_override IS DISTINCT FROM OLD.price_override
  THEN
    INSERT INTO price_history (product_id, variant_id, price)
    VALUES (NEW.product_id, NEW.id, COALESCE(NEW.price_override, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_variant_price_change
  AFTER INSERT OR UPDATE OF price_override ON product_variants
  FOR EACH ROW EXECUTE FUNCTION record_variant_price_change();

-- 5. RLS policies
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Public can read price history (displayed on product pages)
CREATE POLICY "price_history_public_read"
  ON price_history FOR SELECT
  USING (true);

-- Only admin can update/delete (for cleanup)
CREATE POLICY "price_history_admin_update"
  ON price_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "price_history_admin_delete"
  ON price_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- No direct INSERT policy — only triggers insert rows
-- Service role (used by triggers) bypasses RLS automatically

-- 6. Comment on table
COMMENT ON TABLE price_history IS 'Tracks product and variant price changes for EU Omnibus Directive compliance. Trigger-populated — no direct inserts from application code.';
COMMENT ON COLUMN price_history.variant_id IS 'NULL for product-level prices, set for variant-specific price changes.';
COMMENT ON COLUMN price_history.compare_at_price IS 'Snapshot of compare_at_price at the time of the price change. Only set for product-level records.';
