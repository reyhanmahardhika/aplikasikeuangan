ALTER TABLE user_privacy_settings
  ADD COLUMN IF NOT EXISTS allow_wallet_invites BOOLEAN NOT NULL DEFAULT true;

UPDATE user_privacy_settings
SET allow_wallet_invites = allow_money_requests
WHERE allow_wallet_invites IS DISTINCT FROM allow_money_requests;
