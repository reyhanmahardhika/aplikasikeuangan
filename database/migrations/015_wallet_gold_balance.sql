-- Ensure shared_wallets records the current gold weight and reference price for caching
ALTER TABLE shared_wallets
  ADD COLUMN IF NOT EXISTS gold_weight_grams NUMERIC(15, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_price_per_gram NUMERIC(12, 2);

-- Track per-entry weight in grams for deposit/expense on gold wallets
ALTER TABLE shared_wallet_entries
  ADD COLUMN IF NOT EXISTS gold_weight_grams NUMERIC(15, 4);

-- Refresh cached gold weight + reference price whenever a wallet is created/updated
CREATE OR REPLACE FUNCTION shared_wallets_refresh_gold_weight()
RETURNS TRIGGER AS $gw$
DECLARE
  total NUMERIC(15, 4) := 0;
  cached_price NUMERIC(12, 2);
BEGIN
  IF NEW.storage_type = 'gold' THEN
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN gold_weight_grams
                              WHEN entry_type = 'expense' THEN -gold_weight_grams
                              ELSE 0 END), 0)
      INTO total
      FROM shared_wallet_entries
      WHERE wallet_id = NEW.id
        AND status = 'approved'
        AND gold_weight_grams IS NOT NULL;

    SELECT price_per_gram INTO cached_price
      FROM gold_prices
      WHERE valid_until > now()
      ORDER BY fetched_at DESC
      LIMIT 1;

    NEW.gold_weight_grams := total;
    IF NEW.gold_price_per_gram IS NULL OR NEW.gold_price_per_gram = 0 THEN
      NEW.gold_price_per_gram := COALESCE(cached_price, NEW.gold_price_per_gram);
    END IF;
  ELSE
    NEW.gold_weight_grams := 0;
  END IF;
  RETURN NEW;
END;
$gw$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shared_wallets_gold_weight ON shared_wallets;
CREATE TRIGGER trg_shared_wallets_gold_weight
  BEFORE INSERT OR UPDATE OF storage_type, gold_weight_grams ON shared_wallets
  FOR EACH ROW
  EXECUTE FUNCTION shared_wallets_refresh_gold_weight();

-- Keep the cached weight in sync whenever a wallet entry is added/updated/deleted
CREATE OR REPLACE FUNCTION shared_wallet_entries_refresh_wallet_weight()
RETURNS TRIGGER AS $gw$
DECLARE
  total NUMERIC(15, 4);
BEGIN
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'deposit' THEN gold_weight_grams
                            WHEN entry_type = 'expense' THEN -gold_weight_grams
                            ELSE 0 END), 0)
    INTO total
    FROM shared_wallet_entries
    WHERE wallet_id = COALESCE(NEW.wallet_id, OLD.wallet_id)
      AND status = 'approved'
      AND gold_weight_grams IS NOT NULL;

  UPDATE shared_wallets
    SET gold_weight_grams = COALESCE(total, 0)
    WHERE id = COALESCE(NEW.wallet_id, OLD.wallet_id)
      AND storage_type = 'gold';

  RETURN NEW;
END;
$gw$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shared_wallet_entries_weight ON shared_wallet_entries;
CREATE TRIGGER trg_shared_wallet_entries_weight
  AFTER INSERT OR UPDATE OR DELETE ON shared_wallet_entries
  FOR EACH ROW
  EXECUTE FUNCTION shared_wallet_entries_refresh_wallet_weight();