ALTER TABLE pocket_auto_budget_rules
  DROP CONSTRAINT IF EXISTS pocket_auto_budget_rules_account_id_key;

ALTER TABLE pocket_auto_budget_rules
  ADD CONSTRAINT pocket_auto_budget_rules_account_user_unique UNIQUE (account_id, user_id);
