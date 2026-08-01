ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'import';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS import_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_import_fingerprint_unique
  ON transactions (account_id, import_fingerprint)
  WHERE import_fingerprint IS NOT NULL;
