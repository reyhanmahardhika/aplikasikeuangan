ALTER TABLE shared_wallets
  ADD COLUMN IF NOT EXISTS expense_split_rule VARCHAR(20) NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gold_price_fetched_at TIMESTAMPTZ;

ALTER TABLE shared_wallets DROP CONSTRAINT IF EXISTS shared_wallets_expense_split_rule_check;
ALTER TABLE shared_wallets
  ADD CONSTRAINT shared_wallets_expense_split_rule_check
  CHECK (expense_split_rule IN ('equal', 'percentage', 'manual'));

ALTER TABLE shared_wallet_members
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS member_note VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE shared_wallet_entries
  ADD COLUMN IF NOT EXISTS gold_price_per_gram NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS gold_price_fetched_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS shared_wallet_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type VARCHAR(30) NOT NULL DEFAULT 'wallet_settings',
  title VARCHAR(160) NOT NULL,
  change_payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  required_approvals INTEGER NOT NULL,
  approved_count INTEGER NOT NULL DEFAULT 1,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  CHECK (change_type IN ('wallet_settings')),
  CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'cancelled')),
  CHECK (required_approvals > 0)
);

CREATE INDEX IF NOT EXISTS idx_shared_wallet_change_requests_wallet
  ON shared_wallet_change_requests(wallet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_wallet_change_approvals (
  request_id UUID NOT NULL REFERENCES shared_wallet_change_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision VARCHAR(20) NOT NULL,
  comment VARCHAR(255),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, user_id),
  CHECK (decision IN ('approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_shared_wallet_change_approvals_user
  ON shared_wallet_change_approvals(user_id, decided_at DESC);
