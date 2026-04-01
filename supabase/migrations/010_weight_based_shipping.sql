-- Migration: 010_weight_based_shipping
-- Feature: FE-044 — Weight-based Shipping
-- Adds weight_grams column to products and product_variants for weight-based shipping fee calculation.

-- ── Products: add weight_grams ─────────────────────────────────────
ALTER TABLE products ADD COLUMN weight_grams int;

COMMENT ON COLUMN products.weight_grams IS 'Product weight in grams. NULL = use default from config. 0 = treated as default weight.';

-- ── Product variants: add weight_grams (override) ──────────────────
ALTER TABLE product_variants ADD COLUMN weight_grams int;

COMMENT ON COLUMN product_variants.weight_grams IS 'Variant-level weight override in grams. If set, takes precedence over product-level weight_grams.';
