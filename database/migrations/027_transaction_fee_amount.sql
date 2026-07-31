ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_fee_amount_non_negative;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_fee_amount_non_negative CHECK (fee_amount >= 0);
