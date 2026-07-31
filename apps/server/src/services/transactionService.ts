import type { PoolClient } from "pg";
import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { badRequest, notFound } from "../utils/errors.js";
import { negate, normalizeMoney, normalizeNonNegativeMoney } from "../utils/money.js";
import { applyAccountDelta, lockAccount, transactionDelta } from "./accountService.js";
import { writeAuditLog } from "./auditService.js";

type TransactionType = "income" | "expense";

export type TransactionInput = {
  accountId: string;
  transactionType: TransactionType;
  transactionDate: string;
  amount: unknown;
  feeAmount?: unknown;
  categoryId?: string | null;
  merchantName?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  sourceType?: "manual" | "receipt";
  receiptId?: string | null;
  attachmentUrl?: string | null;
  status?: string;
  visibility?: "private" | "selected_friends" | "group_members" | "everyone_involved";
  viewerIds?: string[];
  items?: Array<{
    itemName: string;
    quantity?: string | number;
    unitPrice?: string | number;
    totalPrice?: string | number;
  }>;
};

function toListQuery(
  filters: Record<string, unknown>,
  userId: string,
  options: { baseWhere?: string[]; baseValues?: unknown[]; skipAccountFilter?: boolean } = {}
) {
  const where = options.baseWhere ?? ["t.user_id = $1"];
  const values: unknown[] = options.baseValues ?? [userId];

  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace("?", `$${values.length}`));
  };

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const index = values.length;
    where.push(`(lower(coalesce(t.merchant_name, '')) LIKE lower($${index}) OR lower(coalesce(t.notes, '')) LIKE lower($${index}))`);
  }
  if (filters.type) add("t.transaction_type = ?", filters.type);
  if (filters.categoryId) add("t.category_id = ?", filters.categoryId);
  if (filters.accountId && !options.skipAccountFilter) add("t.account_id = ?", filters.accountId);
  if (filters.paymentMethod) add("t.payment_method = ?", filters.paymentMethod);
  if (filters.sourceType) add("t.source_type = ?", filters.sourceType);
  if (filters.userId) add("t.user_id = ?", filters.userId);
  if (filters.from) add("t.transaction_date >= ?", filters.from);
  if (filters.to) add("t.transaction_date <= ?", filters.to);

  const sort = filters.sort === "amount" ? "t.amount" : "t.transaction_date";
  const direction = filters.direction === "asc" ? "ASC" : "DESC";

  return { where: where.join(" AND "), values, sort, direction };
}

function normalizeItems(items: TransactionInput["items"] = []) {
  return items.map((item) => ({
    itemName: item.itemName,
    quantity: String(item.quantity ?? 1).replace(",", "."),
    unitPrice: normalizeNonNegativeMoney(item.unitPrice ?? 0),
    totalPrice: normalizeNonNegativeMoney(item.totalPrice ?? 0)
  }));
}

async function ensureCategoryOwned(client: PoolClient, userId: string, categoryId?: string | null) {
  if (!categoryId) return;
  const category = await client.query(
    "SELECT id FROM categories WHERE id = $1 AND user_id = $2 AND is_active = true",
    [categoryId, userId]
  );
  if (!category.rowCount) {
    throw badRequest("Kategori tidak valid");
  }
}

async function ensureReceiptOwned(client: PoolClient, userId: string, receiptId?: string | null) {
  if (!receiptId) return;
  const receipt = await client.query(
    "SELECT id FROM receipts WHERE id = $1 AND user_id = $2",
    [receiptId, userId]
  );
  if (!receipt.rowCount) {
    throw badRequest("Struk tidak valid");
  }
}

async function insertItems(client: PoolClient, transactionId: string, items: ReturnType<typeof normalizeItems>) {
  for (const item of items) {
    await client.query(
      `INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price, total_price)
       VALUES ($1, $2, $3, $4, $5)`,
      [transactionId, item.itemName, item.quantity, item.unitPrice, item.totalPrice]
    );
  }
}

async function replaceTransactionViewers(
  client: PoolClient,
  _userId: string,
  transactionId: string,
  visibility: TransactionInput["visibility"],
  _viewerIds: string[] = [],
  _eventType: "transaction_shared" | "transaction_edited" = "transaction_shared"
) {
  await client.query("DELETE FROM transaction_viewers WHERE transaction_id = $1", [transactionId]);
  if (visibility && visibility !== "private") {
    throw badRequest("Berbagi transaksi melalui fitur Social sudah tidak didukung");
  }
}

async function fetchTransactionForUpdate(client: PoolClient, userId: string, transactionId: string) {
  const result = await client.query(
    `SELECT t.*, a.account_type, a.allow_negative
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     WHERE t.id = $1 AND t.user_id = $2
     FOR UPDATE OF t`,
    [transactionId, userId]
  );
  const transaction = result.rows[0];
  if (!transaction) throw notFound("Transaksi tidak ditemukan");
  return transaction;
}

export async function listTransactions(userId: string, query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const offset = (page - 1) * limit;
  const accountScoped = Boolean(query.accountId);
  const { where, values, sort, direction } = toListQuery(query, userId, accountScoped ? {
    baseWhere: [`EXISTS (
      SELECT 1 FROM accounts access_account
      WHERE access_account.id = t.account_id AND (
        access_account.user_id = $1 OR EXISTS (
          SELECT 1 FROM account_collaborators ac
          WHERE ac.account_id = access_account.id AND ac.user_id = $1 AND ac.status = 'accepted'
        )
      )
    )`],
    baseValues: [userId]
  } : {});

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT t.id, t.transaction_type AS "transactionType", t.transaction_date AS "transactionDate",
              t.amount::text, t.fee_amount::text AS "feeAmount", t.merchant_name AS "merchantName", t.payment_method AS "paymentMethod",
              t.notes, t.source_type AS "sourceType", t.status,
              a.name AS "accountName", c.name AS "categoryName", t.user_id AS "userId", u.full_name AS "userFullName",
              (t.user_id = $${values.length + 3}) AS "canManage"
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       JOIN users u ON u.id = t.user_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       ORDER BY ${sort} ${direction}, t.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset, userId]
    ),
    pool.query(`SELECT count(*)::int AS total FROM transactions t WHERE ${where}`, values)
  ]);

  return {
    data: rows.rows,
    pagination: {
      page,
      limit,
      total: count.rows[0].total
    }
  };
}

export async function getTransaction(userId: string, transactionId: string, db: DbClient = pool) {
  const transaction = await db.query(
    `SELECT t.id, t.account_id AS "accountId", t.transaction_type AS "transactionType",
            t.transaction_date AS "transactionDate", t.amount::text, t.fee_amount::text AS "feeAmount", t.category_id AS "categoryId",
            t.merchant_name AS "merchantName", t.payment_method AS "paymentMethod", t.notes,
            t.source_type AS "sourceType", t.receipt_id AS "receiptId", t.attachment_url AS "attachmentUrl",
            t.status, t.visibility, a.name AS "accountName", c.name AS "categoryName",
            true AS "canManage"
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = $1 AND t.user_id = $2`,
    [transactionId, userId]
  );
  if (!transaction.rowCount) throw notFound("Transaksi tidak ditemukan");

  const items = await db.query(
    `SELECT id, item_name AS "itemName", quantity::text, unit_price::text AS "unitPrice", total_price::text AS "totalPrice"
     FROM transaction_items WHERE transaction_id = $1 ORDER BY item_name`,
    [transactionId]
  );
  const viewers = await db.query(
    "SELECT user_id AS \"userId\" FROM transaction_viewers WHERE transaction_id = $1",
    [transactionId]
  );

  return { ...transaction.rows[0], items: items.rows, viewerIds: viewers.rows.map((row) => row.userId) };
}

export async function createTransaction(userId: string, input: TransactionInput, externalClient?: PoolClient) {
  const work = async (client: PoolClient) => {
    const amount = normalizeMoney(input.amount);
    const feeAmount = normalizeNonNegativeMoney(input.feeAmount ?? 0);
    await ensureCategoryOwned(client, userId, input.categoryId);
    await ensureReceiptOwned(client, userId, input.receiptId);
    const account = await lockAccount(client, userId, input.accountId);
    await applyAccountDelta(client, account, transactionDelta(account.account_type, input.transactionType, amount));
    if (feeAmount !== "0.00") {
      await applyAccountDelta(client, account, transactionDelta(account.account_type, "expense", feeAmount));
    }

    const result = await client.query(
      `INSERT INTO transactions
       (user_id, account_id, transaction_type, transaction_date, amount, category_id, merchant_name,
        fee_amount, payment_method, notes, source_type, receipt_id, attachment_url, status, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, transaction_type AS "transactionType", transaction_date AS "transactionDate", amount::text`,
      [
        userId,
        input.accountId,
        input.transactionType,
        input.transactionDate,
        amount,
        input.categoryId ?? null,
        input.merchantName ?? null,
        feeAmount,
        input.paymentMethod ?? null,
        input.notes ?? null,
        input.sourceType ?? "manual",
        input.receiptId ?? null,
        input.attachmentUrl ?? null,
        input.status ?? "posted",
        input.visibility ?? "private"
      ]
    );

    const transactionId = result.rows[0].id;
    await replaceTransactionViewers(client, userId, transactionId, input.visibility ?? "private", input.viewerIds);
    await insertItems(client, transactionId, normalizeItems(input.items));
    await writeAuditLog(client, { userId, action: "CREATE", entityName: "Transaction", entityId: transactionId, newValue: input });
    return getTransaction(userId, transactionId, client);
  };

  return externalClient ? work(externalClient) : withDbTransaction(work);
}

export async function updateTransaction(userId: string, transactionId: string, input: TransactionInput) {
  return withDbTransaction(async (client) => {
    const previous = await fetchTransactionForUpdate(client, userId, transactionId);
    if (previous.source_type === "transfer" || previous.status === "transfer") {
      throw badRequest("Transaksi transfer tidak bisa diedit langsung");
    }
    const previousAccount = await lockAccount(client, userId, previous.account_id);
    await applyAccountDelta(
      client,
      previousAccount,
      negate(transactionDelta(previousAccount.account_type, previous.transaction_type, previous.amount))
    );
    if (normalizeNonNegativeMoney(previous.fee_amount ?? 0) !== "0.00") {
      await applyAccountDelta(client, previousAccount, negate(transactionDelta(previousAccount.account_type, "expense", previous.fee_amount)));
    }

    const amount = normalizeMoney(input.amount);
    const feeAmount = normalizeNonNegativeMoney(input.feeAmount ?? 0);
    await ensureCategoryOwned(client, userId, input.categoryId);
    await ensureReceiptOwned(client, userId, input.receiptId);
    const account = await lockAccount(client, userId, input.accountId);
    await applyAccountDelta(client, account, transactionDelta(account.account_type, input.transactionType, amount));
    if (feeAmount !== "0.00") {
      await applyAccountDelta(client, account, transactionDelta(account.account_type, "expense", feeAmount));
    }

    await client.query(
      `UPDATE transactions
       SET account_id = $1, transaction_type = $2, transaction_date = $3, amount = $4,
           category_id = $5, merchant_name = $6, fee_amount = $7, payment_method = $8, notes = $9,
           source_type = $10, receipt_id = $11, attachment_url = $12, status = $13,
           visibility = $14, updated_at = now()
       WHERE id = $15 AND user_id = $16`,
      [
        input.accountId,
        input.transactionType,
        input.transactionDate,
        amount,
        input.categoryId ?? null,
        input.merchantName ?? null,
        feeAmount,
        input.paymentMethod ?? null,
        input.notes ?? null,
        input.sourceType ?? "manual",
        input.receiptId ?? null,
        input.attachmentUrl ?? null,
        input.status ?? "posted",
        input.visibility ?? "private",
        transactionId,
        userId
      ]
    );

    await replaceTransactionViewers(client, userId, transactionId, input.visibility ?? "private", input.viewerIds, "transaction_edited");
    await client.query("DELETE FROM transaction_items WHERE transaction_id = $1", [transactionId]);
    await insertItems(client, transactionId, normalizeItems(input.items));
    await writeAuditLog(client, { userId, action: "UPDATE", entityName: "Transaction", entityId: transactionId, previousValue: previous, newValue: input });
    return getTransaction(userId, transactionId, client);
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  return withDbTransaction(async (client) => {
    const previous = await fetchTransactionForUpdate(client, userId, transactionId);
    if (previous.source_type === "transfer" || previous.status === "transfer") {
      throw badRequest("Transaksi transfer tidak bisa dihapus satu per satu");
    }
    const previousAccount = await lockAccount(client, userId, previous.account_id);
    await applyAccountDelta(
      client,
      previousAccount,
      negate(transactionDelta(previousAccount.account_type, previous.transaction_type, previous.amount))
    );
    if (normalizeNonNegativeMoney(previous.fee_amount ?? 0) !== "0.00") {
      await applyAccountDelta(client, previousAccount, negate(transactionDelta(previousAccount.account_type, "expense", previous.fee_amount)));
    }
    await client.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [transactionId, userId]);
    await writeAuditLog(client, { userId, action: "DELETE", entityName: "Transaction", entityId: transactionId, previousValue: previous });
    return { deleted: true };
  });
}
