ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS target_balance NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_target_balance_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_target_balance_check
  CHECK (target_balance IS NULL OR target_balance > 0);

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_target_pair_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_target_pair_check
  CHECK ((target_balance IS NULL) = (target_date IS NULL));
