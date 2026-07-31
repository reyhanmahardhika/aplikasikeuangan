CREATE TABLE IF NOT EXISTS pocket_auto_budget_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 1 AND 7),
  day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 31),
  month_of_year SMALLINT CHECK (month_of_year BETWEEN 1 AND 12),
  expiry_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_pocket_auto_budget_due
  ON pocket_auto_budget_rules(is_active, next_run_date, expiry_date);

CREATE TABLE IF NOT EXISTS pocket_auto_budget_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES pocket_auto_budget_rules(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, run_date)
);
