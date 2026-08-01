ALTER TABLE pocket_auto_budget_rules
  ADD COLUMN IF NOT EXISTS source_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE pocket_auto_budget_executions
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL;

UPDATE pocket_auto_budget_rules SET is_active=false WHERE source_account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pocket_auto_budget_source ON pocket_auto_budget_rules(source_account_id);
