/* ------------------------------------------------------------------ */
/*  008 – VAT Rate Management (FE-029)                                 */
/*                                                                     */
/*  Adds per-product VAT rate and snapshots it into order_items.       */
/*  Hungarian VAT rates: 27% (general), 18% (some food), 5% (basic    */
/*  foodstuffs, books, medicine).                                      */
/* ------------------------------------------------------------------ */

-- ── Add vat_rate to products ──────────────────────────────────────
ALTER TABLE products
  ADD COLUMN vat_rate integer NOT NULL DEFAULT 27
    CONSTRAINT products_vat_rate_check CHECK (vat_rate IN (5, 18, 27));

COMMENT ON COLUMN products.vat_rate IS 'ÁFA kulcs százalékban (5, 18, 27)';

-- ── Add vat_rate to order_items (historical snapshot) ─────────────
ALTER TABLE order_items
  ADD COLUMN vat_rate integer NOT NULL DEFAULT 27
    CONSTRAINT order_items_vat_rate_check CHECK (vat_rate IN (5, 18, 27));

COMMENT ON COLUMN order_items.vat_rate IS 'Snapshotted ÁFA kulcs a rendelés pillanatában';
