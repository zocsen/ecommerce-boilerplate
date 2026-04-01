-- ===================================================================
-- Migration: 005_create_order_notes
-- FE-018: Order Internal Notes
-- Adds order_notes table for admin internal notes on orders.
-- ===================================================================

CREATE TABLE order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_notes_order ON order_notes (order_id, created_at DESC);
CREATE INDEX idx_order_notes_author ON order_notes (author_id);

-- RLS policies: admin only (SELECT, INSERT, DELETE)
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Admin and agency_viewer can read all notes
CREATE POLICY "Admin can read order notes"
  ON order_notes FOR SELECT
  USING (
    (SELECT current_app_role()) IN ('admin', 'agency_viewer')
  );

-- Admin can insert notes (author_id must match current user)
CREATE POLICY "Admin can insert order notes"
  ON order_notes FOR INSERT
  WITH CHECK (
    (SELECT current_app_role()) = 'admin'
    AND author_id = auth.uid()
  );

-- Admin can delete own notes
CREATE POLICY "Admin can delete own order notes"
  ON order_notes FOR DELETE
  USING (
    (SELECT current_app_role()) = 'admin'
    AND author_id = auth.uid()
  );
