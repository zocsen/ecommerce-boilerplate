-- ================================================================
-- Migration 007: Product extras (FE-025)
-- Allows attaching complementary products to a product page
-- as checkboxes (e.g., gift wrapping, accessories).
-- ================================================================

-- ── Table ──────────────────────────────────────────────────────────

CREATE TABLE product_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  extra_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  extra_variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_default_checked boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, extra_product_id),
  CHECK(product_id != extra_product_id)
);

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_product_extras_product ON product_extras (product_id, sort_order);

-- ── RLS ───────────────────────────────────────────────────────────

ALTER TABLE product_extras ENABLE ROW LEVEL SECURITY;

-- Public SELECT (anyone can see extras on product pages)
CREATE POLICY "product_extras_select_public"
  ON product_extras FOR SELECT
  USING (true);

-- Admin INSERT
CREATE POLICY "product_extras_insert_admin"
  ON product_extras FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admin UPDATE
CREATE POLICY "product_extras_update_admin"
  ON product_extras FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admin DELETE
CREATE POLICY "product_extras_delete_admin"
  ON product_extras FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
