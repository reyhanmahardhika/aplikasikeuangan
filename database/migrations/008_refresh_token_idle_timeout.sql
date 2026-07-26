UPDATE refresh_tokens
SET expires_at = LEAST(expires_at, created_at + INTERVAL '3 days')
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_expiry
  ON refresh_tokens(token_hash, expires_at)
  WHERE revoked_at IS NULL;
