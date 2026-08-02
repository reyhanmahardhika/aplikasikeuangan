ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS gold_balance_grams NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS gold_buy_price_per_gram NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS gold_sell_price_per_gram NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS gold_price_updated_at TIMESTAMPTZ;

UPDATE accounts
SET gold_price_updated_at = updated_at
WHERE account_type = 'gold'
  AND gold_price_updated_at IS NULL;
