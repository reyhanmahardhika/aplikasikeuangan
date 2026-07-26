ALTER TABLE shared_wallets
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(120),
  ADD COLUMN IF NOT EXISTS storage_account_number VARCHAR(120);

ALTER TABLE shared_wallets DROP CONSTRAINT IF EXISTS shared_wallets_storage_type_check;
ALTER TABLE shared_wallets
  ADD CONSTRAINT shared_wallets_storage_type_check
  CHECK (storage_type IN ('cash', 'bank', 'e_wallet', 'other'));

CREATE TABLE IF NOT EXISTS shared_wallet_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interval_type VARCHAR(20) NOT NULL,
  reminder_time TIME NOT NULL,
  day_of_week SMALLINT,
  day_of_month SMALLINT,
  entry_type VARCHAR(20) NOT NULL,
  message VARCHAR(240) NOT NULL,
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (interval_type IN ('daily', 'weekly', 'monthly')),
  CHECK (entry_type IN ('deposit', 'expense')),
  CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
  CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31)
);

CREATE TABLE IF NOT EXISTS shared_wallet_reminder_deliveries (
  reminder_id UUID NOT NULL REFERENCES shared_wallet_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reminder_id, user_id, delivery_date)
);

CREATE INDEX IF NOT EXISTS idx_shared_wallet_reminders_active
  ON shared_wallet_reminders(is_active, wallet_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(2) NOT NULL DEFAULT 'id';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_preferred_language_check;
ALTER TABLE users
  ADD CONSTRAINT users_preferred_language_check CHECK (preferred_language IN ('en', 'id'));
