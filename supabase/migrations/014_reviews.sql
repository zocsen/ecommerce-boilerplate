-- ================================================================
-- Migration 014: Reviews System (FE-010)
-- ================================================================
-- Adds product reviews with moderation, verified purchase tracking,
-- admin replies, and an aggregated stats view.
-- ================================================================

-- ── Table: reviews ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text NOT NULL CHECK (char_length(body) >= 10 AND char_length(body) <= 5000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_reviews_product_status
  ON public.reviews (product_id, status, created_at DESC);

CREATE INDEX idx_reviews_user
  ON public.reviews (user_id);

CREATE INDEX idx_reviews_status
  ON public.reviews (status, created_at DESC);

-- ── Updated_at trigger ────────────────────────────────────────────

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── View: product_review_stats ────────────────────────────────────
-- Aggregated review statistics per product (approved reviews only).
-- Consumed by product cards, product detail page, and JSON-LD.

CREATE OR REPLACE VIEW public.product_review_stats AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE status = 'approved')::int AS review_count,
  COALESCE(ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 1), 0)::numeric AS average_rating,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 5)::int AS five_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 4)::int AS four_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 3)::int AS three_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 2)::int AS two_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 1)::int AS one_star
FROM public.reviews
GROUP BY product_id;

-- ── RLS ───────────────────────────────────────────────────────────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT
  USING (status = 'approved');

-- Authenticated users can read their own reviews (any status)
CREATE POLICY reviews_own_read ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own reviews
CREATE POLICY reviews_insert ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY reviews_own_update ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin full access
CREATE POLICY reviews_admin_all ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Agency viewer read-only
CREATE POLICY reviews_agency_viewer_read ON public.reviews
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() = 'agency_viewer');
