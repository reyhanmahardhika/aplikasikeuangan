ALTER TABLE pocket_history_shares
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pocket_history_shares_category
  ON pocket_history_shares(category_id);
