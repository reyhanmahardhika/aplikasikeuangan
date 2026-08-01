ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_parent_transaction_id
  ON transactions(parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;
