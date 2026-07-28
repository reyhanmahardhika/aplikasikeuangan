ALTER TABLE relationship_goals
  ADD COLUMN IF NOT EXISTS tracking_mode VARCHAR(30) NOT NULL DEFAULT 'contribution',
  ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE relationship_goals DROP CONSTRAINT IF EXISTS relationship_goals_tracking_mode_check;
ALTER TABLE relationship_goals
  ADD CONSTRAINT relationship_goals_tracking_mode_check
  CHECK (tracking_mode IN ('contribution', 'linked_account'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_goals_unique_linked_account
  ON relationship_goals(linked_account_id)
  WHERE tracking_mode = 'linked_account'
    AND linked_account_id IS NOT NULL
    AND status = 'active';

ALTER TABLE relationship_goal_contributions
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_wallet_entry_id UUID REFERENCES shared_wallet_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS adjustment_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE relationship_goal_contributions DROP CONSTRAINT IF EXISTS relationship_goal_contributions_source_type_check;
ALTER TABLE relationship_goal_contributions
  ADD CONSTRAINT relationship_goal_contributions_source_type_check
  CHECK (source_type IN ('manual', 'transaction', 'linked_account', 'shared_wallet', 'scheduled', 'income_allocation', 'adjustment'));

ALTER TABLE relationship_goal_contributions DROP CONSTRAINT IF EXISTS relationship_goal_contributions_status_check;
ALTER TABLE relationship_goal_contributions
  ADD CONSTRAINT relationship_goal_contributions_status_check
  CHECK (status IN ('pending', 'completed', 'cancelled'));

ALTER TABLE relationship_goal_contributions DROP CONSTRAINT IF EXISTS relationship_goal_contributions_amount_check;

UPDATE relationship_goal_contributions
SET created_by = COALESCE(created_by, contributor_id),
    status = COALESCE(status, 'completed'),
    updated_at = COALESCE(updated_at, created_at);

INSERT INTO relationship_goal_contributions
  (relationship_goal_id, contributor_id, amount, contribution_date, source_type, notes, status, adjustment_reason, created_by, created_at, updated_at)
SELECT id,
       created_by,
       current_amount,
       ((created_at AT TIME ZONE 'Asia/Jakarta')::date),
       'adjustment',
       'Migrated from previous current amount',
       'completed',
       'Initial migrated value',
       created_by,
       created_at,
       updated_at
FROM relationship_goals
WHERE current_amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM relationship_goal_contributions c
    WHERE c.relationship_goal_id = relationship_goals.id
      AND c.source_type = 'adjustment'
      AND c.adjustment_reason = 'Initial migrated value'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationship_goal_contrib_transaction
  ON relationship_goal_contributions(transaction_id)
  WHERE transaction_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_relationship_goal_contrib_goal
  ON relationship_goal_contributions(relationship_goal_id, status, contribution_date DESC)
  WHERE deleted_at IS NULL;
