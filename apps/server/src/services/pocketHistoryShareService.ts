import { pool } from "../db/pool.js";
import { forbidden, notFound } from "../utils/errors.js";

export async function createPocketHistoryShare(userId: string, accountId: string, input: {
  dateFrom: string;
  dateTo: string;
  transactionType?: "income" | "expense" | null;
  expiresInDays: number;
  language: "id" | "en";
}) {
  const account = await pool.query("SELECT id FROM accounts WHERE id=$1 AND user_id=$2 AND is_active=true", [accountId, userId]);
  if (!account.rowCount) throw forbidden("Hanya owner yang dapat membagikan riwayat Pocket");
  const result = await pool.query(
    `INSERT INTO pocket_history_shares
       (account_id, created_by, date_from, date_to, transaction_type, expires_at, language)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6::int * INTERVAL '1 day'), $7)
     RETURNING token::text, expires_at AS "expiresAt"`,
    [accountId, userId, input.dateFrom, input.dateTo, input.transactionType ?? null, input.expiresInDays, input.language]
  );
  return result.rows[0];
}

export async function listActivePocketHistoryShares(userId: string, accountId: string) {
  const result = await pool.query(
    `SELECT s.token::text, s.date_from::text AS "dateFrom", s.date_to::text AS "dateTo",
            s.transaction_type AS "transactionType", s.expires_at AS "expiresAt", s.created_at AS "createdAt"
     FROM pocket_history_shares s
     JOIN accounts a ON a.id=s.account_id
     WHERE s.account_id=$1 AND a.user_id=$2 AND s.expires_at > NOW()
     ORDER BY s.created_at DESC`,
    [accountId, userId]
  );
  return result.rows;
}

export async function getPublicPocketHistory(token: string) {
  const share = await pool.query(
    `SELECT s.id, s.account_id, s.date_from::text AS "dateFrom", s.date_to::text AS "dateTo",
            s.transaction_type AS "transactionType", s.expires_at AS "expiresAt", s.created_at AS "createdAt", s.language,
            a.name AS "pocketName", a.account_type AS "accountType", a.provider_name AS "providerName",
            u.full_name AS "ownerName", (s.expires_at <= NOW()) AS expired
     FROM pocket_history_shares s
     JOIN accounts a ON a.id=s.account_id
     JOIN users u ON u.id=s.created_by
     WHERE s.token=$1`,
    [token]
  );
  if (!share.rowCount) throw notFound("Link riwayat Pocket tidak ditemukan");
  const details = share.rows[0];
  if (details.expired) return { expired: true, expiresAt: details.expiresAt, language: details.language };

  const values: unknown[] = [details.account_id, details.dateFrom, details.dateTo];
  let typeFilter = "";
  if (details.transactionType) {
    values.push(details.transactionType);
    typeFilter = `AND t.transaction_type=$${values.length}`;
  }
  const transactions = await pool.query(
    `SELECT t.id, t.transaction_type AS "transactionType", t.transaction_date AS "transactionDate",
            t.amount::text, t.merchant_name AS "merchantName", t.payment_method AS "paymentMethod",
            t.notes, t.receipt_id AS "receiptId", c.name AS "categoryName"
     FROM transactions t
     LEFT JOIN categories c ON c.id=t.category_id
     WHERE t.account_id=$1
       AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2::date AND $3::date
       ${typeFilter}
     ORDER BY t.transaction_date DESC, t.created_at DESC`,
    values
  );
  const transactionIds = transactions.rows.map((row) => row.id);
  const items = transactionIds.length ? await pool.query(
    `SELECT transaction_id AS "transactionId", item_name AS "itemName", quantity::text,
            unit_price::text AS "unitPrice", total_price::text AS "totalPrice"
     FROM transaction_items WHERE transaction_id = ANY($1::uuid[]) ORDER BY item_name`,
    [transactionIds]
  ) : { rows: [] as any[] };
  const itemsByTransaction = new Map<string, any[]>();
  items.rows.forEach((item) => itemsByTransaction.set(item.transactionId, [...(itemsByTransaction.get(item.transactionId) ?? []), item]));
  const publicTransactions = transactions.rows.map((row) => ({ ...row, items: itemsByTransaction.get(row.id) ?? [], hasAttachment: Boolean(row.receiptId), receiptId: undefined }));
  const totals = transactions.rows.reduce((summary, row) => {
    const amount = Number(row.amount);
    if (row.transactionType === "income") summary.income += amount;
    else summary.expense += amount;
    return summary;
  }, { income: 0, expense: 0 });
  return {
    expired: false,
    language: details.language,
    pocket: { name: details.pocketName, accountType: details.accountType, providerName: details.providerName },
    sharedBy: details.ownerName,
    dateFrom: details.dateFrom,
    dateTo: details.dateTo,
    transactionType: details.transactionType,
    expiresAt: details.expiresAt,
    totals: { ...totals, net: totals.income - totals.expense, count: transactions.rows.length },
    transactions: publicTransactions
  };
}

export async function getPublicPocketHistoryAttachment(token: string, transactionId: string) {
  const result = await pool.query(
    `SELECT r.file_url, r.file_name
     FROM pocket_history_shares s
     JOIN transactions t ON t.account_id=s.account_id AND t.id=$2
     JOIN receipts r ON r.id=t.receipt_id
     WHERE s.token=$1 AND s.expires_at > NOW()
       AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::date BETWEEN s.date_from AND s.date_to
       AND (s.transaction_type IS NULL OR t.transaction_type::text=s.transaction_type)`,
    [token, transactionId]
  );
  if (!result.rowCount) throw notFound("Attachment tidak tersedia atau link sudah kedaluwarsa");
  return result.rows[0] as { file_url: string; file_name: string };
}
