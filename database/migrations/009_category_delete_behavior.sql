ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
