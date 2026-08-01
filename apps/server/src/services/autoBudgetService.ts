import { config } from "../config.js";
import { pool, withDbTransaction } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { normalizeMoney } from "../utils/money.js";
import { createTransaction } from "./transactionService.js";
import { sendPushToUser } from "./pushNotificationService.js";
import { writeAuditLog } from "./auditService.js";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type AutoBudgetInput = {
  amount: unknown;
  frequency: Frequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  expiryDate?: string | null;
};

function jakartaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}

function dateParts(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

function isoDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function nextOccurrence(fromDate: string, rule: Omit<AutoBudgetInput, "amount" | "expiryDate">, includeFrom: boolean) {
  const { year, month, day } = dateParts(fromDate);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (!includeFrom) start.setUTCDate(start.getUTCDate() + 1);
  if (rule.frequency === "daily") return start.toISOString().slice(0, 10);
  if (rule.frequency === "weekly") {
    const isoWeekday = start.getUTCDay() === 0 ? 7 : start.getUTCDay();
    start.setUTCDate(start.getUTCDate() + ((Number(rule.dayOfWeek) - isoWeekday + 7) % 7));
    return start.toISOString().slice(0, 10);
  }
  if (rule.frequency === "monthly") {
    let candidate = isoDate(start.getUTCFullYear(), start.getUTCMonth() + 1, Number(rule.dayOfMonth));
    if (candidate < start.toISOString().slice(0, 10)) candidate = isoDate(start.getUTCFullYear(), start.getUTCMonth() + 2, Number(rule.dayOfMonth));
    return candidate;
  }
  let candidate = isoDate(start.getUTCFullYear(), Number(rule.monthOfYear), Number(rule.dayOfMonth));
  if (candidate < start.toISOString().slice(0, 10)) candidate = isoDate(start.getUTCFullYear() + 1, Number(rule.monthOfYear), Number(rule.dayOfMonth));
  return candidate;
}

function decorate(row: any) {
  return {
    id: row.id, accountId: row.account_id, accountName: row.account_name,
    amount: String(row.amount), frequency: row.frequency,
    dayOfWeek: row.day_of_week, dayOfMonth: row.day_of_month, monthOfYear: row.month_of_year,
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : null,
    nextRunDate: String(row.next_run_date).slice(0, 10), isActive: row.is_active
  };
}

export async function getAutoBudget(userId: string, accountId: string) {
  const result = await pool.query(
    `SELECT r.*, a.name AS account_name FROM pocket_auto_budget_rules r
     JOIN accounts a ON a.id = r.account_id
     WHERE r.account_id = $1 AND r.user_id = $2 AND r.is_active = true`, [accountId, userId]
  );
  return result.rows[0] ? decorate(result.rows[0]) : null;
}

export async function saveAutoBudget(userId: string, accountId: string, input: AutoBudgetInput) {
  const account = await pool.query(
    `SELECT a.id, a.name FROM accounts a
     WHERE a.id = $1 AND a.is_active = true AND (
       a.user_id = $2 OR EXISTS (
         SELECT 1 FROM account_collaborators ac
         WHERE ac.account_id = a.id AND ac.user_id = $2 AND ac.status = 'accepted'
       )
     )`, [accountId, userId]
  );
  if (!account.rowCount) throw forbidden("Anda tidak memiliki akses untuk mengatur auto budgeting Pocket");
  const now = jakartaNow();
  const nextRunDate = nextOccurrence(now.date, input, now.hour < 7);
  if (input.expiryDate && input.expiryDate < nextRunDate) throw badRequest("Expiry date harus sama atau setelah jadwal pertama");
  const amount = normalizeMoney(input.amount);
  const result = await pool.query(
    `INSERT INTO pocket_auto_budget_rules
       (user_id, account_id, amount, frequency, day_of_week, day_of_month, month_of_year, expiry_date, next_run_date, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
     ON CONFLICT (account_id, user_id) DO UPDATE SET amount=EXCLUDED.amount, frequency=EXCLUDED.frequency,
       day_of_week=EXCLUDED.day_of_week, day_of_month=EXCLUDED.day_of_month, month_of_year=EXCLUDED.month_of_year,
       expiry_date=EXCLUDED.expiry_date, next_run_date=EXCLUDED.next_run_date, is_active=true, updated_at=now()
     RETURNING *`,
    [userId, accountId, amount, input.frequency, input.dayOfWeek ?? null, input.dayOfMonth ?? null, input.monthOfYear ?? null, input.expiryDate ?? null, nextRunDate]
  );
  await writeAuditLog(pool, { userId, action: "UPDATE", entityName: "PocketAutoBudget", entityId: result.rows[0].id, newValue: result.rows[0] });
  return decorate({ ...result.rows[0], account_name: account.rows[0].name });
}

export async function deleteAutoBudget(userId: string, accountId: string) {
  const result = await pool.query(
    "UPDATE pocket_auto_budget_rules SET is_active=false, updated_at=now() WHERE account_id=$1 AND user_id=$2 RETURNING id",
    [accountId, userId]
  );
  if (!result.rowCount) throw notFound("Auto budgeting tidak ditemukan");
  return { deleted: true };
}

export async function runDueAutoBudgets() {
  const now = jakartaNow();
  if (now.hour < 7) return;
  const due = await pool.query(
    `SELECT id FROM pocket_auto_budget_rules WHERE is_active=true AND next_run_date <= $1::date
       AND (expiry_date IS NULL OR next_run_date <= expiry_date) ORDER BY next_run_date LIMIT 200`, [now.date]
  );
  for (const item of due.rows) {
    const failure: { current: { userId: string; accountName: string; amount: string; runDate: string } | null } = { current: null };
    try {
      await withDbTransaction(async (client) => {
        const locked = await client.query(
          `SELECT r.*, a.name AS account_name FROM pocket_auto_budget_rules r JOIN accounts a ON a.id=r.account_id
           WHERE r.id=$1 AND r.is_active=true FOR UPDATE OF r`, [item.id]
        );
        const rule = locked.rows[0];
        if (!rule || String(rule.next_run_date).slice(0, 10) > now.date) return;
        const runDate = String(rule.next_run_date).slice(0, 10);
        const exists = await client.query("SELECT 1 FROM pocket_auto_budget_executions WHERE rule_id=$1 AND run_date=$2", [rule.id, runDate]);
        if (exists.rowCount) return;
        try {
          const transaction = await createTransaction(rule.user_id, {
            accountId: rule.account_id, transactionType: "expense", transactionDate: `${runDate}T07:00:00+07:00`,
            amount: rule.amount, feeAmount: 0, merchantName: "Auto budgeting", notes: `Auto budgeting ${rule.frequency}`,
            sourceType: "manual", status: "posted", visibility: "private", items: [], internalAccountPermission: "deposit"
          }, client);
          await client.query(
            `INSERT INTO pocket_auto_budget_executions(rule_id,run_date,status,transaction_id) VALUES($1,$2,'success',$3)`,
            [rule.id, runDate, transaction.id]
          );
        } catch (error) {
          failure.current = { userId: rule.user_id, accountName: rule.account_name, amount: String(rule.amount), runDate };
          throw error;
        }
        const nextRun = nextOccurrence(runDate, {
          frequency: rule.frequency, dayOfWeek: rule.day_of_week, dayOfMonth: rule.day_of_month, monthOfYear: rule.month_of_year
        }, false);
        const active = !rule.expiry_date || nextRun <= String(rule.expiry_date).slice(0, 10);
        await client.query("UPDATE pocket_auto_budget_rules SET next_run_date=$1,is_active=$2,updated_at=now() WHERE id=$3", [nextRun, active, rule.id]);
      });
    } catch (error) {
      const failed = failure.current;
      if (!failed) continue;
      await pool.query(
        `INSERT INTO pocket_auto_budget_executions(rule_id,run_date,status,error_message)
         VALUES($1,$2,'failed',$3) ON CONFLICT(rule_id,run_date) DO NOTHING`,
        [item.id, failed.runDate, error instanceof Error ? error.message : "Saldo tidak mencukupi"]
      );
      const rule = await pool.query("SELECT frequency,day_of_week,day_of_month,month_of_year,expiry_date FROM pocket_auto_budget_rules WHERE id=$1", [item.id]);
      if (rule.rows[0]) {
        const row = rule.rows[0];
        const nextRun = nextOccurrence(failed.runDate, { frequency: row.frequency, dayOfWeek: row.day_of_week, dayOfMonth: row.day_of_month, monthOfYear: row.month_of_year }, false);
        await pool.query("UPDATE pocket_auto_budget_rules SET next_run_date=$1,is_active=($2::date IS NULL OR $1::date <= $2::date),updated_at=now() WHERE id=$3", [nextRun, row.expiry_date, item.id]);
      }
      await sendPushToUser(failed.userId, {
        title: "Auto budgeting gagal",
        body: `Saldo pada pocket ${failed.accountName} tidak mencukupi untuk auto debit Rp${Number(failed.amount).toLocaleString("id-ID")}.`,
        url: "/?view=accounts", tag: `auto-budget-failed-${item.id}-${failed.runDate}`
      });
    }
  }
}
