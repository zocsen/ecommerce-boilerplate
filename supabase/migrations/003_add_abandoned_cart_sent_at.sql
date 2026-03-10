-- Migration: 003_add_abandoned_cart_sent_at
-- Adds a nullable timestamp column to `orders` that the abandoned cart
-- Edge Function stamps once it has sent the abandoned cart email.
-- This prevents duplicate sends (the function filters WHERE abandoned_cart_sent_at IS NULL).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS abandoned_cart_sent_at timestamptz NULL;
