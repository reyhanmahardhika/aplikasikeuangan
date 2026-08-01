ALTER TABLE pocket_history_shares
  ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'id'
  CHECK (language IN ('id', 'en'));
