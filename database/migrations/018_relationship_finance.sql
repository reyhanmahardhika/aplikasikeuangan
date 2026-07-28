CREATE TABLE IF NOT EXISTS relationship_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name VARCHAR(140) NOT NULL,
  relationship_type VARCHAR(40) NOT NULL DEFAULT 'partner',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (relationship_type IN ('partner', 'married_couple', 'family')),
  CHECK (status IN ('pending', 'active', 'cancelled', 'archived'))
);

CREATE TABLE IF NOT EXISTS relationship_finance_members (
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (relationship_finance_id, user_id),
  CHECK (role IN ('owner', 'partner')),
  CHECK (status IN ('pending', 'accepted', 'declined', 'removed'))
);

CREATE TABLE IF NOT EXISTS relationship_finance_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  CHECK (inviter_id <> invitee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_invitation_pending_pair
  ON relationship_finance_invitations (LEAST(inviter_id, invitee_id), GREATEST(inviter_id, invitee_id))
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_active_pair
  ON relationship_finance_invitations (LEAST(inviter_id, invitee_id), GREATEST(inviter_id, invitee_id))
  WHERE status = 'accepted';

CREATE TABLE IF NOT EXISTS relationship_finance_privacy_settings (
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  income_visibility VARCHAR(30) NOT NULL DEFAULT 'summary_only',
  expense_visibility VARCHAR(30) NOT NULL DEFAULT 'summary_only',
  accounts_visibility VARCHAR(30) NOT NULL DEFAULT 'private',
  transactions_visibility VARCHAR(30) NOT NULL DEFAULT 'private',
  assets_visibility VARCHAR(30) NOT NULL DEFAULT 'summary_only',
  liabilities_visibility VARCHAR(30) NOT NULL DEFAULT 'summary_only',
  investments_visibility VARCHAR(30) NOT NULL DEFAULT 'private',
  goals_visibility VARCHAR(30) NOT NULL DEFAULT 'shared',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (relationship_finance_id, user_id),
  CHECK (income_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (expense_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (accounts_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (transactions_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (assets_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (liabilities_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (investments_visibility IN ('private', 'summary_only', 'shared')),
  CHECK (goals_visibility IN ('private', 'summary_only', 'shared'))
);

CREATE TABLE IF NOT EXISTS relationship_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  goal_type VARCHAR(60) NOT NULL DEFAULT 'custom',
  icon VARCHAR(64) NOT NULL DEFAULT 'Target',
  target_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  deadline DATE,
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  description VARCHAR(1000),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (goal_type IN ('wedding', 'home', 'vehicle', 'vacation', 'education', 'emergency_fund', 'investment', 'business', 'retirement', 'custom')),
  CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  CHECK (target_amount >= 0),
  CHECK (current_amount >= 0)
);

CREATE TABLE IF NOT EXISTS relationship_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_goal_id UUID NOT NULL REFERENCES relationship_goals(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  source_type VARCHAR(40) NOT NULL DEFAULT 'manual',
  source_id UUID,
  notes VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_type IN ('manual', 'transaction', 'account', 'shared_wallet')),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS relationship_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL,
  period_type VARCHAR(30) NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold NUMERIC(5,2) NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_type IN ('monthly', 'custom')),
  CHECK (amount > 0),
  CHECK (alert_threshold > 0 AND alert_threshold <= 100)
);

CREATE TABLE IF NOT EXISTS relationship_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  asset_type VARCHAR(40) NOT NULL DEFAULT 'other',
  current_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  ownership_type VARCHAR(40) NOT NULL DEFAULT 'shared',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ownership_percentage NUMERIC(5,2),
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes VARCHAR(1000),
  valuation_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (asset_type IN ('cash', 'bank', 'gold', 'property', 'vehicle', 'deposit', 'stock', 'crypto', 'business', 'other')),
  CHECK (ownership_type IN ('shared', 'individual_visible')),
  CHECK (current_value >= 0),
  CHECK (ownership_percentage IS NULL OR (ownership_percentage >= 0 AND ownership_percentage <= 100))
);

CREATE TABLE IF NOT EXISTS relationship_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  liability_type VARCHAR(40) NOT NULL DEFAULT 'other',
  original_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  monthly_payment NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(8,4),
  due_date DATE,
  ownership_type VARCHAR(40) NOT NULL DEFAULT 'shared',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes VARCHAR(1000),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (liability_type IN ('mortgage', 'vehicle_loan', 'personal_loan', 'credit_card', 'paylater', 'business_debt', 'other')),
  CHECK (ownership_type IN ('shared', 'individual_visible')),
  CHECK (original_amount >= 0),
  CHECK (remaining_amount >= 0),
  CHECK (monthly_payment >= 0)
);

CREATE TABLE IF NOT EXISTS relationship_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description VARCHAR(1200),
  agreement_type VARCHAR(60) NOT NULL DEFAULT 'custom',
  target_amount NUMERIC(18,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  percentage NUMERIC(5,2),
  frequency VARCHAR(40),
  start_date DATE,
  end_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_by_partner BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (agreement_type IN ('monthly_saving', 'category_limit', 'income_allocation', 'minimum_goal_contribution', 'large_expense_notice', 'emergency_fund_rule', 'custom')),
  CHECK (status IN ('draft', 'pending_approval', 'active', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS relationship_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationship_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_finance_id UUID NOT NULL REFERENCES relationship_finances(id) ON DELETE CASCADE,
  insight_type VARCHAR(80) NOT NULL,
  severity VARCHAR(30) NOT NULL DEFAULT 'info',
  title_key VARCHAR(180) NOT NULL,
  description_key VARCHAR(180) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type VARCHAR(80),
  entity_id UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (severity IN ('positive', 'info', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_relationship_members_user
  ON relationship_finance_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_relationship_goals_workspace
  ON relationship_goals(relationship_finance_id, status);
CREATE INDEX IF NOT EXISTS idx_relationship_timeline_workspace
  ON relationship_timeline_events(relationship_finance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_insights_workspace
  ON relationship_insights(relationship_finance_id, generated_at DESC);
