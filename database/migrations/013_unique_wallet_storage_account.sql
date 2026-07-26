CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_wallets_unique_storage_account
  ON shared_wallets(storage_account_id)
  WHERE storage_account_id IS NOT NULL;
