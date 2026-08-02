ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS impersonator_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS read_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_impersonator
  ON refresh_tokens(impersonator_user_id)
  WHERE impersonator_user_id IS NOT NULL;
