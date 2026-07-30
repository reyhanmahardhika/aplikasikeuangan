ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS display_order INTEGER;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY created_at, id
         ) - 1 AS position
  FROM accounts
)
UPDATE accounts a
SET display_order = ranked.position
FROM ranked
WHERE ranked.id = a.id
  AND a.display_order IS NULL;

ALTER TABLE accounts
ALTER COLUMN display_order SET DEFAULT 0;

ALTER TABLE accounts
ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_user_display_order
ON accounts(user_id, display_order);
