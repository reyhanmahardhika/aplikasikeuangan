CREATE TABLE IF NOT EXISTS pocket_financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_name VARCHAR(160) NOT NULL,
  goal_image_url TEXT,
  target_amount NUMERIC(18,2) NOT NULL CHECK (target_amount > 0),
  target_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pocket_financial_goals (account_id, user_id, goal_name, target_amount, target_date)
SELECT id, user_id, COALESCE(NULLIF(name, ''), 'Target keuangan'), target_balance, target_date
FROM accounts
WHERE target_balance IS NOT NULL
  AND target_date IS NOT NULL
ON CONFLICT (account_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pocket_goal_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES pocket_financial_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  amount NUMERIC(18,2),
  balance_after NUMERIC(18,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pocket_goal_events_goal_created
  ON pocket_goal_progress_events(goal_id, created_at DESC);
