-- ===================================================================
-- Migration: 006_create_shop_pages
-- FE-023: About Us Page Builder
-- Adds shop_pages table for structured CMS-like pages (about, etc.).
-- Single-tenant: one row per page_key, no shop_id needed.
-- ===================================================================

CREATE TABLE shop_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on UPDATE
CREATE TRIGGER trg_shop_pages_updated_at
  BEFORE UPDATE ON shop_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_shop_pages_key ON shop_pages (page_key);

-- RLS policies
ALTER TABLE shop_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Public can read published pages"
  ON shop_pages FOR SELECT
  USING (is_published = true);

-- Admin can read all pages (including unpublished)
CREATE POLICY "Admin can read all pages"
  ON shop_pages FOR SELECT
  USING (
    (SELECT current_app_role()) IN ('admin', 'agency_viewer')
  );

-- Admin can insert pages
CREATE POLICY "Admin can insert pages"
  ON shop_pages FOR INSERT
  WITH CHECK (
    (SELECT current_app_role()) = 'admin'
  );

-- Admin can update pages
CREATE POLICY "Admin can update pages"
  ON shop_pages FOR UPDATE
  USING (
    (SELECT current_app_role()) = 'admin'
  )
  WITH CHECK (
    (SELECT current_app_role()) = 'admin'
  );

-- Admin can delete pages
CREATE POLICY "Admin can delete pages"
  ON shop_pages FOR DELETE
  USING (
    (SELECT current_app_role()) = 'admin'
  );
