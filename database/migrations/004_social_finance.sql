ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(40),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

UPDATE users
SET username = left(
  COALESCE(NULLIF(regexp_replace(lower(full_name), '[^a-z0-9]+', '', 'g'), ''), 'user')
  || '_' || left(replace(id::text, '-', ''), 6),
  40
)
WHERE username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN username SET DEFAULT ('user_' || left(replace(gen_random_uuid()::text, '-', ''), 10));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allow_money_requests BOOLEAN NOT NULL DEFAULT true,
  allow_group_invites BOOLEAN NOT NULL DEFAULT true,
  searchable_by VARCHAR(20) NOT NULL DEFAULT 'username',
  hide_phone BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (searchable_by IN ('everyone', 'username', 'friends', 'nobody'))
);

INSERT INTO user_privacy_settings (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);

CREATE TABLE IF NOT EXISTS financial_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  icon VARCHAR(40) NOT NULL DEFAULT 'Users',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_group_members (
  group_id UUID NOT NULL REFERENCES financial_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'accepted',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id),
  CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CHECK (status IN ('pending', 'accepted', 'rejected', 'removed'))
);

CREATE TABLE IF NOT EXISTS group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES financial_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  paid_by UUID NOT NULL REFERENCES users(id),
  description VARCHAR(220) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  visibility VARCHAR(30) NOT NULL DEFAULT 'group_members',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount > 0),
  CHECK (visibility IN ('private', 'selected_friends', 'group_members', 'everyone_involved')),
  CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS group_expense_participants (
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_amount NUMERIC(18,2) NOT NULL,
  confirmation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  PRIMARY KEY (expense_id, user_id),
  CHECK (share_amount >= 0),
  CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected', 'paid'))
);

CREATE TABLE IF NOT EXISTS group_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES financial_groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id),
  CHECK (amount > 0),
  CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS shared_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  spending_limit NUMERIC(18,2),
  require_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (spending_limit IS NULL OR spending_limit > 0)
);

CREATE TABLE IF NOT EXISTS shared_wallet_members (
  wallet_id UUID NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'accepted',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_id, user_id),
  CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CHECK (status IN ('pending', 'accepted', 'rejected', 'removed'))
);

CREATE TABLE IF NOT EXISTS shared_wallet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  entry_type VARCHAR(20) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  description VARCHAR(220) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (entry_type IN ('deposit', 'expense')),
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS social_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500),
  entity_type VARCHAR(40),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_events_recipient ON social_events (recipient_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (entity_type IN ('transaction', 'group_expense', 'group', 'settlement', 'wallet_entry', 'money_request'))
);

CREATE INDEX IF NOT EXISTS idx_social_comments_entity ON social_comments (entity_type, entity_id, created_at);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) NOT NULL DEFAULT 'private';

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_visibility_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_visibility_check
  CHECK (visibility IN ('private', 'selected_friends', 'group_members', 'everyone_involved'));

CREATE TABLE IF NOT EXISTS transaction_viewers (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, user_id)
);
