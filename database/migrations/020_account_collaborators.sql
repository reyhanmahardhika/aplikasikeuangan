-- Migration: Add account collaborators (pocket collaboration)
-- Description: Allow users to invite others to collaborate on their pockets

CREATE TABLE IF NOT EXISTS account_collaborators (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_collaborators_user ON account_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_account_collaborators_status ON account_collaborators(status);
