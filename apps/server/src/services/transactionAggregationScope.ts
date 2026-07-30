export function excludeInternalTransferLedger(alias?: string) {
  const prefix = alias ? `${alias}.` : "";
  return `NOT (
    COALESCE(${prefix}status, '') = 'transfer'
    AND ${prefix}payment_method = 'Transfer'
    AND (
      ${prefix}merchant_name LIKE 'Transfer ke %'
      OR ${prefix}merchant_name LIKE 'Transfer dari %'
    )
  )`;
}
