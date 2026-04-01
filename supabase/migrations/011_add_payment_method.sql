/* ------------------------------------------------------------------ */
/*  011 — Add payment_method + cod_fee to orders                       */
/*  Enables Cash on Delivery (utánvét) alongside online Barion payment */
/* ------------------------------------------------------------------ */

-- payment_method: which payment method the customer chose at checkout
-- Default 'barion' for backward compatibility with existing orders
ALTER TABLE orders ADD COLUMN payment_method text NOT NULL DEFAULT 'barion';

-- cod_fee: the utánvét surcharge in HUF (0 for online payments)
ALTER TABLE orders ADD COLUMN cod_fee int NOT NULL DEFAULT 0;

-- Constraint: payment_method must be a known value
ALTER TABLE orders ADD CONSTRAINT chk_orders_payment_method
  CHECK (payment_method IN ('barion', 'cod'));

-- Constraint: cod_fee must be non-negative
ALTER TABLE orders ADD CONSTRAINT chk_orders_cod_fee_nonneg
  CHECK (cod_fee >= 0);

-- Index for filtering by payment method in admin
CREATE INDEX idx_orders_payment_method ON orders (payment_method);

COMMENT ON COLUMN orders.payment_method IS 'Payment method chosen at checkout: barion (online card) or cod (cash on delivery / utánvét)';
COMMENT ON COLUMN orders.cod_fee IS 'Utánvét kezelési díj in HUF. Always 0 for online payments. Added to total_amount.';
