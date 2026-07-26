ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(120);

ALTER TABLE shared_wallets
  ADD COLUMN IF NOT EXISTS storage_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE shared_wallet_entries
  ADD COLUMN IF NOT EXISTS transaction_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL;

ALTER TABLE shared_wallet_reminders
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_shared_wallet_entries_wallet_date
  ON shared_wallet_entries(wallet_id, transaction_date DESC, created_at DESC);
