ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(160);

UPDATE accounts
SET account_holder_name = NULLIF(btrim(split_part(account_number, '·', 2)), ''),
    account_number = NULLIF(btrim(split_part(account_number, '·', 1)), '')
WHERE account_number LIKE '%·%'
  AND account_holder_name IS NULL;
