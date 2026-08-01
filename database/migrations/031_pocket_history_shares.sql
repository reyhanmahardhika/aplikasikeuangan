CREATE TABLE IF NOT EXISTS pocket_history_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('income', 'expense')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (date_to >= date_from),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_pocket_history_shares_token ON pocket_history_shares(token);
CREATE INDEX IF NOT EXISTS idx_pocket_history_shares_account ON pocket_history_shares(account_id, created_at DESC);
