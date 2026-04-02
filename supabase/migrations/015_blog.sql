-- ================================================================
-- Migration 015: Blog System (FE-022)
-- ================================================================
-- Adds a blog/posts table for content marketing and SEO.
-- Public can read published posts; admin has full CRUD.
-- ================================================================

-- ── Table: posts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content_html text NOT NULL DEFAULT '',
  cover_image_url text,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_posts_published
  ON public.posts (is_published, published_at DESC)
  WHERE is_published = true;

CREATE INDEX idx_posts_slug
  ON public.posts (slug);

CREATE INDEX idx_posts_author
  ON public.posts (author_id);

-- ── Updated_at trigger ────────────────────────────────────────────

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY posts_public_read ON public.posts
  FOR SELECT
  USING (is_published = true);

-- Admin full access
CREATE POLICY posts_admin_all ON public.posts
  FOR ALL
  TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Agency viewer read-only (all posts including drafts)
CREATE POLICY posts_agency_viewer_read ON public.posts
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() = 'agency_viewer');
