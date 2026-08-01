import type { PoolClient } from "pg";
import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { isNegative, normalizeMoney, normalizeNonNegativeMoney } from "../utils/money.js";
import { writeAuditLog } from "./auditService.js";
import { createAppNotification } from "./notificationService.js";
import { sendPushToUser } from "./pushNotificationService.js";

export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  initial_balance: string;
  current_balance: string;
  currency: string;
  allow_negative: boolean;
  is_active: boolean;
};

function isDebtAccount(accountType: string) {
  return accountType === "credit_card";
}

export function transactionDelta(accountType: string, transactionType: "income" | "expense", amount: string) {
  if (isDebtAccount(accountType)) {
    return transactionType === "expense" ? amount : `-${amount}`;
  }
  return transactionType === "income" ? amount : `-${amount}`;
}

function isoDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(value);
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from.slice(0, 10)}T12:00:00Z`).getTime();
  const end = new Date(`${to.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.max(0, Math.ceil((end - start) / 86400000));
}

function addDays(from: string, days: number) {
  const date = new Date(`${from.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.ceil(days)));
  return date.toISOString().slice(0, 10);
}

function recurringDailyAmount(amount: string | number, frequency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (frequency === "daily") return value;
  if (frequency === "weekly") return value / 7;
  if (frequency === "monthly") return value / 30;
  if (frequency === "yearly") return value / 365;
  return 0;
}

export async function listAccounts(userId: string) {
  const result = await pool.query(
    `SELECT a.id, a.name, a.account_type AS "accountType",
            CASE WHEN a.user_id=$1 OR EXISTS (SELECT 1 FROM account_collaborators visible WHERE visible.account_id=a.id AND visible.user_id=$1 AND visible.status='accepted') THEN a.initial_balance ELSE 0 END AS "initialBalance",
            CASE WHEN a.user_id=$1 OR EXISTS (SELECT 1 FROM account_collaborators visible WHERE visible.account_id=a.id AND visible.user_id=$1 AND visible.status='accepted') THEN a.current_balance ELSE 0 END AS "currentBalance",
            a.currency, a.allow_negative AS "allowNegative",
            a.provider_name AS "providerName", a.account_number AS "accountNumber",
            a.account_holder_name AS "accountHolderName",
            a.display_order AS "displayOrder",
            a.target_balance::text AS "targetBalance", a.target_date::text AS "targetDate",
            EXISTS (SELECT 1 FROM pocket_auto_budget_rules abr WHERE abr.account_id=a.id AND abr.user_id=$1 AND abr.is_active=true) AS "autoBudgetingEnabled",
            EXISTS (
              SELECT 1 FROM shared_wallets w
              WHERE w.storage_account_id = a.id AND w.is_active = true
            ) AS "isSharedWalletAccount",
            a.user_id AS "ownerUserId",
            u.full_name AS "ownerName",
            u.avatar_url AS "ownerAvatarUrl",
            COALESCE((SELECT ac.role FROM account_collaborators ac WHERE ac.account_id=a.id AND ac.user_id=$1), 'owner') AS "collaboratorRole",
            COALESCE((SELECT ac.status FROM account_collaborators ac WHERE ac.account_id=a.id AND ac.user_id=$1), 'accepted') AS "collaborationStatus",
            (a.user_id = $1) AS "canEdit",
            a.is_active AS "isActive", a.created_at AS "createdAt", a.updated_at AS "updatedAt"
     FROM accounts a
     JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1
        OR EXISTS (
          SELECT 1
          FROM account_collaborators ac
          WHERE ac.account_id = a.id
            AND ac.user_id = $1
            AND ac.status IN ('accepted', 'pending')
        )
     ORDER BY a.is_active DESC, a.display_order ASC, a.created_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function getAccountTarget(userId: string, accountId: string) {
  const accountResult = await pool.query(
    `SELECT a.id, a.user_id AS "ownerUserId", a.current_balance::text AS "currentBalance",
            a.initial_balance::text AS "initialBalance", a.target_balance::text AS "targetBalance", a.target_date::text AS "targetDate",
            g.id AS "goalId", g.goal_name AS "targetName", g.goal_image_url AS "goalImageUrl",
            g.target_amount::text AS "goalTargetBalance", g.target_date::text AS "goalTargetDate"
     FROM accounts a
     LEFT JOIN pocket_financial_goals g ON g.account_id = a.id
     WHERE a.id = $1 AND (
       a.user_id = $2 OR EXISTS (
         SELECT 1 FROM account_collaborators ac
         WHERE ac.account_id = a.id AND ac.user_id = $2 AND ac.status = 'accepted'
       )
     )`,
    [accountId, userId]
  );
  if (!accountResult.rowCount) throw notFound("Pocket tidak ditemukan");
  const account = accountResult.rows[0];
  const targetBalance = account.goalTargetBalance ?? account.targetBalance;
  const targetDate = account.goalTargetDate ?? account.targetDate;
  const targetName = account.targetName ?? (targetBalance ? "Target keuangan" : null);

  const contributions = await pool.query(
    `WITH members AS (
       SELECT a.user_id AS user_id, 'owner'::text AS role
       FROM accounts a WHERE a.id = $1
       UNION ALL
       SELECT ac.user_id, ac.role
       FROM account_collaborators ac
       WHERE ac.account_id = $1 AND ac.status = 'accepted'
     )
     SELECT m.user_id AS "userId", u.full_name AS "fullName", u.username,
            u.avatar_url AS "avatarUrl", m.role,
            (
              CASE WHEN m.role = 'owner' THEN (SELECT initial_balance FROM accounts WHERE id = $1) ELSE 0 END
              + COALESCE(SUM(
                  CASE
                    WHEN t.transaction_type = 'income' THEN t.amount - COALESCE(t.fee_amount, 0)
                    ELSE -(t.amount + COALESCE(t.fee_amount, 0))
                  END
                ), 0)
            )::text AS amount
     FROM members m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN transactions t ON t.account_id = $1 AND t.user_id = m.user_id
     GROUP BY m.user_id, u.full_name, u.username, u.avatar_url, m.role
     ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, u.full_name`,
    [accountId]
  );
  if (!targetBalance || !targetDate) {
    return { ...account, targetName, targetBalance, targetDate, contributions: contributions.rows, recommendations: null, projection: null, milestones: [], progressHistory: [], autoTransfers: [] };
  }

  const [autoTransfers, ledger, goalEvents] = await Promise.all([
    pool.query(
      `SELECT r.id, r.user_id AS "userId", u.full_name AS "userFullName",
              r.source_account_id AS "sourceAccountId", source.name AS "sourceAccountName",
              r.amount::text, r.frequency, r.next_run_date::text AS "nextRunDate",
              r.expiry_date::text AS "expiryDate"
       FROM pocket_auto_budget_rules r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN accounts source ON source.id = r.source_account_id
       WHERE r.account_id = $1 AND r.is_active = true
       ORDER BY u.full_name`,
      [accountId]
    ),
    pool.query(
      `SELECT t.transaction_date::text AS "transactionDate", t.transaction_type AS "transactionType",
              t.amount::text, t.merchant_name AS "merchantName", t.notes,
              u.full_name AS "userFullName"
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.account_id = $1
       ORDER BY t.transaction_date ASC, t.created_at ASC
       LIMIT 1000`,
      [accountId]
    ),
    account.goalId ? pool.query(
      `SELECT e.event_type AS "eventType", e.amount::text, e.balance_after::text AS "balanceAfter",
              e.notes, e.created_at::text AS "createdAt", u.full_name AS "userFullName"
       FROM pocket_goal_progress_events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.goal_id = $1
       ORDER BY e.created_at DESC
       LIMIT 20`,
      [account.goalId]
    ) : Promise.resolve({ rows: [] })
  ]);

  const today = isoDate();
  const targetAmount = Number(targetBalance);
  const currentAmount = Number(account.currentBalance);
  const remaining = Math.max(0, targetAmount - currentAmount);
  const daysLeft = Math.max(1, daysBetween(today, targetDate));
  const weeklyDeposit = remaining > 0 ? remaining / Math.max(1, Math.ceil(daysLeft / 7)) : 0;
  const monthlyDeposit = remaining > 0 ? remaining / Math.max(1, Math.ceil(daysLeft / 30)) : 0;
  const dailyAutoTransfer = autoTransfers.rows.reduce((sum, row) => sum + recurringDailyAmount(row.amount, row.frequency), 0);
  const projectedDate = remaining <= 0 ? today : dailyAutoTransfer > 0 ? addDays(today, remaining / dailyAutoTransfer) : null;
  const projectionStatus = remaining <= 0
    ? "completed"
    : !projectedDate
      ? "needs_plan"
      : projectedDate > String(targetDate).slice(0, 10)
        ? "late"
        : projectedDate < String(targetDate).slice(0, 10)
          ? "faster"
          : "on_track";
  let running = Number(account.initialBalance ?? 0);
  const milestonePercents = [25, 50, 75, 100];
  const reachedAt = new Map<number, string>();
  for (const item of ledger.rows) {
    running += item.transactionType === "income" ? Number(item.amount) : -Number(item.amount);
    for (const percent of milestonePercents) {
      if (!reachedAt.has(percent) && running >= targetAmount * (percent / 100)) {
        reachedAt.set(percent, item.transactionDate);
      }
    }
  }
  const milestones = milestonePercents.map((percent) => {
    const amount = targetAmount * (percent / 100);
    return { percent, amount: amount.toFixed(2), reached: currentAmount >= amount, reachedAt: reachedAt.get(percent) ?? null };
  });
  const progressHistory = [
    ...goalEvents.rows,
    ...ledger.rows.slice(-12).reverse().map((row) => ({
      eventType: row.transactionType === "income" ? "deposit" : "withdrawal",
      amount: row.amount,
      balanceAfter: null,
      notes: row.merchantName ?? row.notes,
      createdAt: row.transactionDate,
      userFullName: row.userFullName
    }))
  ].slice(0, 20);

  return {
    ...account,
    targetName,
    goalImageUrl: account.goalImageUrl ?? null,
    targetBalance,
    targetDate,
    contributions: contributions.rows,
    recommendations: {
      remaining: remaining.toFixed(2),
      daysLeft,
      weeklyDeposit: weeklyDeposit.toFixed(2),
      monthlyDeposit: monthlyDeposit.toFixed(2)
    },
    projection: {
      projectedDate,
      status: projectionStatus,
      dailyAutoTransfer: dailyAutoTransfer.toFixed(2)
    },
    milestones,
    progressHistory,
    autoTransfers: autoTransfers.rows
  };
}

export async function updateAccountTarget(
  userId: string,
  accountId: string,
  payload: { targetName?: string; goalImageUrl?: string | null; targetBalance: unknown; targetDate: string }
) {
  const targetBalance = normalizeMoney(payload.targetBalance);
  const today = isoDate();
  if (payload.targetDate < today) throw badRequest("Target date tidak boleh sebelum hari ini");
  return withDbTransaction(async (client) => {
    const account = await client.query(
      `UPDATE accounts
       SET target_balance = $1, target_date = $2, updated_at = now()
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, current_balance::text AS "currentBalance",
                 target_balance::text AS "targetBalance", target_date::text AS "targetDate"`,
      [targetBalance, payload.targetDate, accountId, userId]
    );
    if (!account.rowCount) throw forbidden("Hanya owner yang dapat mengatur target Pocket");
    const goalName = payload.targetName?.trim() || `Target ${account.rows[0].name}`;
    const goal = await client.query(
      `INSERT INTO pocket_financial_goals (account_id, user_id, goal_name, goal_image_url, target_amount, target_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (account_id) DO UPDATE SET goal_name=EXCLUDED.goal_name, goal_image_url=EXCLUDED.goal_image_url,
         target_amount=EXCLUDED.target_amount, target_date=EXCLUDED.target_date, updated_at=now()
       RETURNING id, goal_name AS "targetName", goal_image_url AS "goalImageUrl",
                 target_amount::text AS "targetBalance", target_date::text AS "targetDate"`,
      [accountId, userId, goalName, payload.goalImageUrl ?? null, targetBalance, payload.targetDate]
    );
    await client.query(
      `INSERT INTO pocket_goal_progress_events (goal_id, user_id, event_type, amount, balance_after, notes)
       VALUES ($1, $2, 'goal_updated', $3, $4, $5)`,
      [goal.rows[0].id, userId, targetBalance, account.rows[0].currentBalance, goal.rows[0].targetName]
    );
    await writeAuditLog(client, {
      userId, action: "UPDATE", entityName: "PocketFinancialGoal", entityId: goal.rows[0].id,
      newValue: goal.rows[0]
    });
    return { ...account.rows[0], ...goal.rows[0] };
  });
}

export async function createAccount(userId: string, payload: {
  name: string;
  accountType: string;
  initialBalance: unknown;
  currency?: string;
  providerName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  allowNegative?: boolean;
  isActive?: boolean;
}) {
  const initialBalance = normalizeNonNegativeMoney(payload.initialBalance);
  const result = await pool.query(
    `INSERT INTO accounts (user_id, name, account_type, initial_balance, current_balance, currency,
                           provider_name, account_number, account_holder_name, allow_negative, is_active, display_order)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10,
             COALESCE((SELECT max(display_order) + 1 FROM accounts WHERE user_id = $1), 0))
     RETURNING id, name, account_type AS "accountType", initial_balance AS "initialBalance",
               current_balance AS "currentBalance", currency, allow_negative AS "allowNegative",
               provider_name AS "providerName", account_number AS "accountNumber", account_holder_name AS "accountHolderName",
               is_active AS "isActive"`,
    [
      userId,
      payload.name,
      payload.accountType,
      initialBalance,
      payload.currency ?? "IDR",
      payload.providerName || null,
      payload.accountNumber || null,
      payload.accountHolderName || null,
      payload.allowNegative ?? false,
      payload.isActive ?? true
    ]
  );
  await writeAuditLog(pool, { userId, action: "CREATE", entityName: "Account", entityId: result.rows[0].id, newValue: result.rows[0] });
  return result.rows[0];
}

export async function reorderAccounts(userId: string, accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length !== accountIds.length) {
    throw badRequest("Urutan pocket mengandung data duplikat");
  }
  return withDbTransaction(async (client) => {
    const owned = await client.query<{ id: string }>(
      "SELECT id FROM accounts WHERE user_id = $1 AND id = ANY($2::uuid[]) FOR UPDATE",
      [userId, uniqueIds]
    );
    if (owned.rowCount !== uniqueIds.length) {
      throw forbidden("Urutan hanya dapat diubah untuk pocket milik sendiri");
    }
    await client.query(
      `UPDATE accounts a
       SET display_order = ordered.position, updated_at = now()
       FROM (
         SELECT id, ordinality - 1 AS position
         FROM unnest($2::uuid[]) WITH ORDINALITY AS value(id, ordinality)
       ) ordered
       WHERE a.user_id = $1 AND a.id = ordered.id`,
      [userId, uniqueIds]
    );
    return { accountIds: uniqueIds };
  });
}

export async function updateAccount(userId: string, accountId: string, payload: Record<string, unknown>) {
  const current = await pool.query("SELECT * FROM accounts WHERE id = $1 AND user_id = $2", [accountId, userId]);
  if (!current.rowCount) {
    throw notFound("Akun tidak ditemukan");
  }

  const account = current.rows[0];
  const next = {
    name: payload.name ?? account.name,
    accountType: payload.accountType ?? account.account_type,
    initialBalance: payload.initialBalance === undefined
      ? account.initial_balance
      : normalizeNonNegativeMoney(payload.initialBalance),
    currency: payload.currency ?? account.currency,
    providerName: payload.providerName === undefined ? account.provider_name : payload.providerName,
    accountNumber: payload.accountNumber === undefined ? account.account_number : payload.accountNumber,
    accountHolderName: payload.accountHolderName === undefined ? account.account_holder_name : payload.accountHolderName,
    allowNegative: payload.allowNegative ?? account.allow_negative,
    isActive: payload.isActive ?? account.is_active
  };

  const result = await pool.query(
    `UPDATE accounts
     SET name = $1, account_type = $2::varchar, initial_balance = $3,
         current_balance = $3::numeric + COALESCE((
           SELECT sum(
             CASE
               WHEN $2::varchar = 'credit_card' AND t.transaction_type = 'expense' THEN t.amount
               WHEN $2::varchar = 'credit_card' THEN -t.amount
               WHEN t.transaction_type = 'income' THEN t.amount
               ELSE -t.amount
             END
           )
           FROM transactions t
           WHERE t.account_id = $10
         ), 0),
         currency = $4, provider_name = $5, account_number = $6, account_holder_name = $7,
         allow_negative = $8, is_active = $9, updated_at = now()
     WHERE id = $10 AND user_id = $11
     RETURNING id, name, account_type AS "accountType", initial_balance AS "initialBalance",
               current_balance AS "currentBalance", currency, allow_negative AS "allowNegative",
               provider_name AS "providerName", account_number AS "accountNumber", account_holder_name AS "accountHolderName",
               is_active AS "isActive"`,
    [next.name, next.accountType, next.initialBalance, next.currency, next.providerName || null,
      next.accountNumber || null, next.accountHolderName || null, next.allowNegative, next.isActive, accountId, userId]
  );

  await writeAuditLog(pool, { userId, action: "UPDATE", entityName: "Account", entityId: accountId, previousValue: account, newValue: result.rows[0] });
  return result.rows[0];
}

export async function resetAccount(userId: string, accountId: string, payload: { initialBalance?: unknown }) {
  return withDbTransaction(async (client) => {
    const current = await client.query<AccountRow>(
      "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [accountId, userId]
    );
    const account = current.rows[0];
    if (!account) throw notFound("Akun tidak ditemukan");

    const initialBalance = payload.initialBalance === undefined
      ? account.initial_balance
      : normalizeNonNegativeMoney(payload.initialBalance);

    const linkedTransfers = await client.query<{
      id: string;
      source_transaction_id: string | null;
      destination_transaction_id: string | null;
      fee_transaction_id: string | null;
    }>(
      `SELECT id, source_transaction_id, destination_transaction_id, fee_transaction_id
       FROM transfers
       WHERE user_id = $1 AND (source_account_id = $2 OR destination_account_id = $2)
       FOR UPDATE`,
      [userId, accountId]
    );
    const linkedTransactionIds = linkedTransfers.rows.flatMap((row) =>
      [row.source_transaction_id, row.destination_transaction_id, row.fee_transaction_id]
        .filter((id): id is string => Boolean(id))
    );

    if (linkedTransfers.rowCount) {
      await client.query(
        "DELETE FROM transfers WHERE user_id = $1 AND (source_account_id = $2 OR destination_account_id = $2)",
        [userId, accountId]
      );
    }
    if (linkedTransactionIds.length) {
      await client.query(
        "DELETE FROM transactions WHERE user_id = $1 AND (account_id = $2 OR id = ANY($3::uuid[]))",
        [userId, accountId, linkedTransactionIds]
      );
    } else {
      await client.query("DELETE FROM transactions WHERE user_id = $1 AND account_id = $2", [userId, accountId]);
    }

    await client.query(
      `UPDATE accounts a
       SET initial_balance = CASE WHEN a.id = $2 THEN $3::numeric ELSE a.initial_balance END,
           current_balance =
             CASE WHEN a.id = $2 THEN $3::numeric ELSE a.initial_balance END
             + COALESCE((
               SELECT sum(
                 CASE
                   WHEN a.account_type = 'credit_card' AND t.transaction_type = 'expense' THEN t.amount
                   WHEN a.account_type = 'credit_card' THEN -t.amount
                   WHEN t.transaction_type = 'income' THEN t.amount
                   ELSE -t.amount
                 END
               )
               FROM transactions t
               WHERE t.account_id = a.id
             ), 0),
           updated_at = now()
       WHERE a.user_id = $1`,
      [userId, accountId, initialBalance]
    );

    const result = await client.query(
      `SELECT id, name, account_type AS "accountType", initial_balance AS "initialBalance",
              current_balance AS "currentBalance", currency, allow_negative AS "allowNegative",
              is_active AS "isActive"
       FROM accounts WHERE id = $1`,
      [accountId]
    );
    await writeAuditLog(client, {
      userId,
      action: "RESET",
      entityName: "Account",
      entityId: accountId,
      previousValue: account,
      newValue: { ...result.rows[0], deletedTransfers: linkedTransfers.rowCount }
    });
    return result.rows[0];
  });
}

export async function deleteAccount(userId: string, accountId: string) {
  const usage = await pool.query(
    `SELECT
       (SELECT count(*) FROM transactions WHERE account_id = $1) AS transaction_count,
       (SELECT count(*) FROM transfers WHERE source_account_id = $1 OR destination_account_id = $1) AS transfer_count`,
    [accountId]
  );
  const hasLedger = Number(usage.rows[0].transaction_count) + Number(usage.rows[0].transfer_count) > 0;
  if (hasLedger) {
    const result = await pool.query(
      `UPDATE accounts SET is_active = false, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [accountId, userId]
    );
    if (!result.rowCount) throw notFound("Akun tidak ditemukan");
    await writeAuditLog(pool, { userId, action: "DEACTIVATE", entityName: "Account", entityId: accountId });
    return { deactivated: true };
  }

  const result = await pool.query("DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id", [accountId, userId]);
  if (!result.rowCount) throw notFound("Akun tidak ditemukan");
  await writeAuditLog(pool, { userId, action: "DELETE", entityName: "Account", entityId: accountId });
  return { deleted: true };
}

export async function lockAccount(client: PoolClient, userId: string, accountId: string, permission: "spend" | "deposit" = "spend") {
  const result = await client.query<AccountRow>(
    `SELECT a.* FROM accounts a WHERE a.id = $1 AND (
       a.user_id = $2 OR EXISTS (
         SELECT 1 FROM account_collaborators ac
         WHERE ac.account_id=a.id AND ac.user_id=$2 AND ac.status='accepted'
           AND ($3='deposit' OR ac.role IN ('admin','member'))
       )
     ) FOR UPDATE OF a`,
    [accountId, userId, permission]
  );
  const account = result.rows[0];
  if (!account) throw notFound("Akun tidak ditemukan");
  if (!account.is_active) throw badRequest("Akun tidak aktif");
  const sharedWallet = await client.query(
    `SELECT name FROM shared_wallets
     WHERE storage_account_id = $1 AND is_active = true LIMIT 1`,
    [accountId]
  );
  if (sharedWallet.rowCount) {
    throw badRequest(`Akun ini dipakai pada dompet bersama ${sharedWallet.rows[0].name} dan tidak dapat digunakan untuk transaksi pribadi`);
  }
  return account;
}

export async function applyAccountDelta(
  client: PoolClient,
  account: AccountRow,
  delta: string,
  options: { allowDebtAccountZeroFloor?: boolean } = {}
) {
  const updated = await client.query<{ current_balance: string; is_negative: boolean }>(
    `UPDATE accounts
     SET current_balance = current_balance + ($1::numeric), updated_at = now()
     WHERE id = $2
     RETURNING current_balance::text, (current_balance < 0) AS is_negative`,
    [delta, account.id]
  );

  const currentBalance = updated.rows[0].current_balance;
  const negativeNotAllowed = updated.rows[0].is_negative && !account.allow_negative;
  const debtBelowZero = isDebtAccount(account.account_type) && isNegative(currentBalance) && !options.allowDebtAccountZeroFloor;

  if (negativeNotAllowed || debtBelowZero) {
    throw forbidden("Saldo akun tidak mencukupi");
  }

  return currentBalance;
}

export async function createTransfer(userId: string, payload: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: unknown;
  feeAmount?: unknown;
  transferDate: string;
  notes?: string | null;
  receiptId?: string | null;
}) {
  const amount = normalizeMoney(payload.amount);
  const feeAmount = normalizeNonNegativeMoney(payload.feeAmount ?? 0);
  if (payload.sourceAccountId === payload.destinationAccountId) {
    throw badRequest("Akun asal dan tujuan harus berbeda");
  }

  const transfer = await withDbTransaction(async (client) => {
    const source = await lockAccount(client, userId, payload.sourceAccountId, "spend");
    const destination = await lockAccount(client, userId, payload.destinationAccountId, "deposit");
    if (payload.receiptId) {
      const attachment = await client.query(
        "SELECT id FROM receipts WHERE id = $1 AND user_id = $2",
        [payload.receiptId, userId]
      );
      if (!attachment.rowCount) throw badRequest("Attachment tidak ditemukan");
    }

    const sourceDelta = isDebtAccount(source.account_type) ? amount : `-${amount}`;
    const destinationDelta = isDebtAccount(destination.account_type) ? `-${amount}` : amount;
    await applyAccountDelta(client, source, sourceDelta, { allowDebtAccountZeroFloor: false });
    if (Number(feeAmount) > 0) {
      await applyAccountDelta(client, source, isDebtAccount(source.account_type) ? feeAmount : `-${feeAmount}`, { allowDebtAccountZeroFloor: false });
    }
    await applyAccountDelta(client, destination, destinationDelta, { allowDebtAccountZeroFloor: false });

    const result = await client.query(
      `INSERT INTO transfers (user_id, source_account_id, destination_account_id, amount, transfer_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, amount::text, transfer_date AS "transferDate", notes`,
      [userId, source.id, destination.id, amount, payload.transferDate, payload.notes ?? null]
    );

    const transferId = result.rows[0].id;
    const sourceTransaction = await client.query(
      `INSERT INTO transactions
       (user_id, account_id, transaction_type, transaction_date, amount, merchant_name, payment_method, notes, source_type, status, receipt_id)
       VALUES ($1, $2, 'expense', $3, $4, $5, 'Transfer', $6, 'manual', 'transfer', $7)
       RETURNING id`,
      [userId, source.id, payload.transferDate, amount, `Transfer ke ${destination.name}`, payload.notes ?? null, payload.receiptId ?? null]
    );
    const destinationTransaction = await client.query(
      `INSERT INTO transactions
       (user_id, account_id, transaction_type, transaction_date, amount, merchant_name, payment_method, notes, source_type, status, receipt_id)
       VALUES ($1, $2, 'income', $3, $4, $5, 'Transfer', $6, 'manual', 'transfer', $7)
       RETURNING id`,
      [userId, destination.id, payload.transferDate, amount, `Transfer dari ${source.name}`, payload.notes ?? null, payload.receiptId ?? null]
    );
    let feeTransactionId: string | null = null;
    if (Number(feeAmount) > 0) {
      const feeTransaction = await client.query(
        `INSERT INTO transactions
         (user_id, account_id, transaction_type, transaction_date, amount, merchant_name, payment_method, notes, source_type, status)
         VALUES ($1, $2, 'expense', $3, $4, 'Biaya admin transfer', 'Transfer', $5, 'manual', 'transfer')
         RETURNING id`,
        [userId, source.id, payload.transferDate, feeAmount, payload.notes ?? null]
      );
      feeTransactionId = feeTransaction.rows[0].id;
    }

    await writeAuditLog(client, {
      userId,
      action: "CREATE",
      entityName: "Transfer",
      entityId: transferId,
      newValue: {
        ...result.rows[0],
        feeAmount,
        receiptId: payload.receiptId ?? null,
        sourceTransactionId: sourceTransaction.rows[0].id,
        destinationTransactionId: destinationTransaction.rows[0].id,
        feeTransactionId
      }
    });
    const actorResult = await client.query<{ full_name: string }>(
      "SELECT full_name FROM users WHERE id = $1",
      [userId]
    );
    const actorName = actorResult.rows[0]?.full_name ?? "User";
    const recipientResult = await client.query<{
      user_id: string;
      language: "en" | "id";
      source_visible: boolean;
      destination_visible: boolean;
    }>(
      `WITH affected_accounts AS (
         SELECT $1::uuid AS account_id, true AS source_visible, false AS destination_visible
         UNION ALL
         SELECT $2::uuid AS account_id, false AS source_visible, true AS destination_visible
       ),
       account_users AS (
         SELECT a.user_id, aa.source_visible, aa.destination_visible
         FROM affected_accounts aa
         JOIN accounts a ON a.id = aa.account_id
         UNION ALL
         SELECT ac.user_id, aa.source_visible, aa.destination_visible
         FROM affected_accounts aa
         JOIN account_collaborators ac ON ac.account_id = aa.account_id
         WHERE ac.status = 'accepted'
       )
       SELECT au.user_id,
              COALESCE(u.preferred_language, 'id') AS language,
              BOOL_OR(au.source_visible) AS source_visible,
              BOOL_OR(au.destination_visible) AS destination_visible
       FROM account_users au
       JOIN users u ON u.id = au.user_id
       WHERE au.user_id <> $3
       GROUP BY au.user_id, u.preferred_language`,
      [source.id, destination.id, userId]
    );
    const formatAmount = (value: string) => `Rp${Number(value).toLocaleString("id-ID")}`;
    const pushTargets = [];
    for (const recipient of recipientResult.rows) {
      const transferDirection = recipient.source_visible && !recipient.destination_visible
        ? "out"
        : recipient.destination_visible && !recipient.source_visible
          ? "in"
          : "between";
      const isEnglish = recipient.language === "en";
      const title = isEnglish ? "Pocket transfer activity" : "Aktivitas transfer Pocket";
      const body = isEnglish
        ? `${actorName} transferred ${formatAmount(amount)} from ${source.name} to ${destination.name}.`
        : `${actorName} transfer ${formatAmount(amount)} dari ${source.name} ke ${destination.name}.`;
      await createAppNotification(client, {
        userId: recipient.user_id,
        eventType: transferDirection === "out" ? "pocket_transfer_out" : transferDirection === "in" ? "pocket_transfer_in" : "pocket_transfer",
        title,
        body,
        entityType: "account",
        entityId: recipient.destination_visible ? destination.id : source.id,
        metadata: {
          transferId,
          sourceAccountId: source.id,
          destinationAccountId: destination.id,
          amount,
          feeAmount,
          transferDirection
        }
      });
      pushTargets.push({
        userId: recipient.user_id,
        payload: {
          title,
          body,
          url: `/?view=accounts&accountId=${recipient.destination_visible ? destination.id : source.id}`,
          tag: `transfer-${transferId}-${recipient.user_id}`
        }
      });
    }
    return { transfer: { ...result.rows[0], feeAmount }, pushTargets };
  });
  await Promise.all(transfer.pushTargets.map((target) => sendPushToUser(target.userId, target.payload)));
  return transfer.transfer;
}
