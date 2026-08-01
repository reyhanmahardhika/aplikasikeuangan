INSERT INTO transactions (
  user_id,
  account_id,
  transaction_type,
  transaction_date,
  amount,
  merchant_name,
  fee_amount,
  payment_method,
  notes,
  source_type,
  status,
  visibility,
  parent_transaction_id
)
SELECT
  t.user_id,
  t.account_id,
  'expense',
  t.transaction_date,
  t.fee_amount,
  'Biaya admin transaksi',
  0,
  t.payment_method,
  CASE WHEN t.merchant_name IS NOT NULL THEN 'Biaya admin untuk ' || t.merchant_name ELSE NULL END,
  'manual',
  'transaction_fee',
  t.visibility,
  t.id
FROM transactions t
WHERE t.fee_amount > 0
  AND t.parent_transaction_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions fee WHERE fee.parent_transaction_id = t.id
  );

UPDATE transactions parent
SET fee_amount = 0,
    updated_at = NOW()
WHERE parent.fee_amount > 0
  AND EXISTS (
    SELECT 1 FROM transactions fee WHERE fee.parent_transaction_id = parent.id
  );
