import { pool } from "../db/pool.js";
import { excludeInternalTransferLedger } from "./transactionAggregationScope.js";

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end, month: date.getMonth() + 1, year: date.getFullYear() };
}

export async function dashboardSummary(userId: string) {
  const { start, end, month, year } = monthBounds();
  const transactionScope = excludeInternalTransferLedger();
  const transactionScopeT = excludeInternalTransferLedger("t");
  const [balances, monthly, daily, categories, lastTransactions, budgetAlerts, weeklyInsight, scheduledCommitments] = await Promise.all([
    pool.query(
      `SELECT COALESCE(sum(CASE WHEN account_type = 'credit_card' THEN -current_balance ELSE current_balance END), 0)::text AS balance
       FROM accounts WHERE user_id = $1 AND is_active = true`,
      [userId]
    ),
    pool.query(
       `SELECT
         COALESCE(sum(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0)::text AS income,
         COALESCE(sum(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)::text AS expense
       FROM transactions
       WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date < $3
         AND ${transactionScope}`,
      [userId, start, end]
    ),
    pool.query(
       `SELECT date_trunc('day', transaction_date)::date AS date,
              COALESCE(sum(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0)::text AS income,
              COALESCE(sum(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)::text AS expense
       FROM transactions
       WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date < $3
         AND ${transactionScope}
       GROUP BY 1 ORDER BY 1`,
      [userId, start, end]
    ),
    pool.query(
       `SELECT c.name AS category, COALESCE(sum(t.amount), 0)::text AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'expense' AND t.transaction_date >= $2 AND t.transaction_date < $3
         AND ${transactionScopeT}
       GROUP BY c.name ORDER BY sum(t.amount) DESC LIMIT 8`,
      [userId, start, end]
    ),
    pool.query(
      `SELECT t.id, t.transaction_type AS "transactionType", t.transaction_date AS "transactionDate",
              t.amount::text, t.merchant_name AS "merchantName", c.name AS "categoryName", a.name AS "accountName"
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 5`,
      [userId]
    ),
    pool.query(
      `WITH usage AS (
        SELECT b.id, b.budget_amount, c.name AS category,
               COALESCE(sum(t.amount), 0) AS used
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        LEFT JOIN transactions t ON t.category_id = b.category_id
          AND t.user_id = b.user_id
          AND t.transaction_type = 'expense'
          AND date_part('month', t.transaction_date) = b.month
          AND date_part('year', t.transaction_date) = b.year
          AND ${transactionScopeT}
        WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
        GROUP BY b.id, b.budget_amount, c.name
       )
       SELECT id, category, budget_amount::text AS "budgetAmount", used::text,
              round((used / nullif(budget_amount, 0)) * 100, 2)::text AS "usagePercent"
       FROM usage
       WHERE used >= budget_amount * 0.7
      ORDER BY used / budget_amount DESC`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT
         COALESCE(sum(amount) FILTER (
           WHERE transaction_date >= date_trunc('week', now())
             AND transaction_date < date_trunc('week', now()) + INTERVAL '7 days'
         ), 0)::text AS "currentWeekExpense",
         COALESCE(sum(amount) FILTER (
           WHERE transaction_date >= date_trunc('week', now()) - INTERVAL '7 days'
             AND transaction_date < date_trunc('week', now())
         ), 0)::text AS "previousWeekExpense"
       FROM transactions
       WHERE user_id = $1
         AND transaction_type = 'expense'
         AND ${transactionScope}
         AND transaction_date >= date_trunc('week', now()) - INTERVAL '7 days'`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(sum(amount), 0)::text AS total
       FROM schedules
       WHERE user_id = $1
         AND is_active = true
         AND next_due_date >= CURRENT_DATE
         AND next_due_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date`,
      [userId]
    )
  ]);

  const currentWeekExpense = Number(weeklyInsight.rows[0].currentWeekExpense);
  const previousWeekExpense = Number(weeklyInsight.rows[0].previousWeekExpense);
  const weekChangePercent = previousWeekExpense > 0
    ? Math.round(((currentWeekExpense - previousWeekExpense) / previousWeekExpense) * 100)
    : null;
  const scheduledUntilMonthEnd = Number(scheduledCommitments.rows[0].total);
  const availableUntilMonthEnd = Number(balances.rows[0].balance) - scheduledUntilMonthEnd;

  var result = {
    balance: balances.rows[0].balance,
    incomeThisMonth: monthly.rows[0].income,
    expenseThisMonth: monthly.rows[0].expense,
    daily: daily.rows,
    expenseByCategory: categories.rows,
    lastTransactions: lastTransactions.rows,
    budgetAlerts: budgetAlerts.rows,
    insight: {
      currentWeekExpense: currentWeekExpense.toFixed(2),
      previousWeekExpense: previousWeekExpense.toFixed(2),
      weekChangePercent,
      scheduledUntilMonthEnd: scheduledUntilMonthEnd.toFixed(2),
      availableUntilMonthEnd: availableUntilMonthEnd.toFixed(2)
    }
  };
  return result;
}
