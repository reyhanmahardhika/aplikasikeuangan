-- Add gold wallet support to shared_wallets
ALTER TABLE shared_wallets DROP CONSTRAINT IF EXISTS shared_wallets_storage_type_check;
ALTER TABLE shared_wallets
  ADD CONSTRAINT shared_wallets_storage_type_check
  CHECK (storage_type IN ('cash', 'bank', 'e_wallet', 'gold', 'other'));

-- Add gold weight column to track gold in grams
ALTER TABLE shared_wallets
  ADD COLUMN IF NOT EXISTS gold_weight_grams DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS gold_price_per_gram DECIMAL(12, 2);

-- Store gold price history for calculations
CREATE TABLE IF NOT EXISTS gold_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_gram DECIMAL(12, 2) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'pegadaian',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on validity (partial indexes with now() are not allowed since now() is not immutable;
-- we use a plain index here and filter by valid_until at query time)
CREATE INDEX IF NOT EXISTS idx_gold_prices_valid_until
  ON gold_prices(valid_until DESC);

-- Update shared_wallet_entries to support gold weight
ALTER TABLE shared_wallet_entries
  ADD COLUMN IF NOT EXISTS gold_weight_grams DECIMAL(15, 4);

-- Latest price lookup index (filtered at query time)
CREATE INDEX IF NOT EXISTS idx_gold_prices_source_fetched
  ON gold_prices(source, fetched_at DESC);
