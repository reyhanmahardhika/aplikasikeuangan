import { config } from "../config.js";
import { pool } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { normalizeMoney } from "../utils/money.js";
import { createTransfer } from "./accountService.js";
import { sendPushToUser } from "./pushNotificationService.js";
import { writeAuditLog } from "./auditService.js";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type AutoBudgetInput = {
  sourceAccountId: string;
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

function nextOccurrence(fromDate: string, rule: Pick<AutoBudgetInput, "frequency" | "dayOfWeek" | "dayOfMonth" | "monthOfYear">, includeFrom: boolean) {
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
    sourceAccountId: row.source_account_id, sourceAccountName: row.source_account_name,
    amount: String(row.amount), frequency: row.frequency,
    dayOfWeek: row.day_of_week, dayOfMonth: row.day_of_month, monthOfYear: row.month_of_year,
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : null,
    nextRunDate: String(row.next_run_date).slice(0, 10), isActive: row.is_active
  };
}

export async function getAutoBudget(userId: string, accountId: string) {
  const result = await pool.query(
    `SELECT r.*, a.name AS account_name, source.name AS source_account_name,
            a.current_balance::text AS target_current_balance, a.target_balance::text AS target_balance
     FROM pocket_auto_budget_rules r
     JOIN accounts a ON a.id = r.account_id
     LEFT JOIN accounts source ON source.id=r.source_account_id
     WHERE r.account_id = $1 AND r.user_id = $2 AND r.is_active = true`, [accountId, userId]
  );
  if (!result.rows[0]) return null;
  const executions = await pool.query(
    `SELECT id, run_date::text AS "runDate", status, error_message AS "errorMessage",
            transfer_id AS "transferId", created_at AS "createdAt"
     FROM pocket_auto_budget_executions WHERE rule_id=$1 ORDER BY run_date DESC, created_at DESC LIMIT 20`,
    [result.rows[0].id]
  );
  return { ...decorate(result.rows[0]), targetCurrentBalance: result.rows[0].target_current_balance,
    targetBalance: result.rows[0].target_balance, executions: executions.rows };
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
  if (input.sourceAccountId === accountId) throw badRequest("Pocket sumber dan tujuan harus berbeda");
  const source = await pool.query(
    `SELECT a.id FROM accounts a WHERE a.id=$1 AND a.is_active=true AND (
       a.user_id=$2 OR EXISTS (SELECT 1 FROM account_collaborators ac WHERE ac.account_id=a.id AND ac.user_id=$2 AND ac.status='accepted' AND ac.role IN ('admin','member'))
     )`, [input.sourceAccountId, userId]
  );
  if (!source.rowCount) throw forbidden("Pocket sumber tidak tersedia atau tidak dapat digunakan");
  const now = jakartaNow();
  const nextRunDate = nextOccurrence(now.date, input, now.hour < 7);
  if (input.expiryDate && input.expiryDate < nextRunDate) throw badRequest("Expiry date harus sama atau setelah jadwal pertama");
  const amount = normalizeMoney(input.amount);
  const result = await pool.query(
    `INSERT INTO pocket_auto_budget_rules
       (user_id, account_id, source_account_id, amount, frequency, day_of_week, day_of_month, month_of_year, expiry_date, next_run_date, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
     ON CONFLICT (account_id, user_id) DO UPDATE SET source_account_id=EXCLUDED.source_account_id, amount=EXCLUDED.amount, frequency=EXCLUDED.frequency,
       day_of_week=EXCLUDED.day_of_week, day_of_month=EXCLUDED.day_of_month, month_of_year=EXCLUDED.month_of_year,
       expiry_date=EXCLUDED.expiry_date, next_run_date=EXCLUDED.next_run_date, is_active=true, updated_at=now()
     RETURNING *`,
    [userId, accountId, input.sourceAccountId, amount, input.frequency, input.dayOfWeek ?? null, input.dayOfMonth ?? null, input.monthOfYear ?? null, input.expiryDate ?? null, nextRunDate]
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
    `SELECT r.*, source.name AS source_account_name, target.name AS target_account_name
     FROM pocket_auto_budget_rules r
     JOIN accounts source ON source.id=r.source_account_id
     JOIN accounts target ON target.id=r.account_id
     WHERE r.is_active=true AND r.source_account_id IS NOT NULL AND r.next_run_date <= $1::date
       AND (expiry_date IS NULL OR next_run_date <= expiry_date) ORDER BY next_run_date LIMIT 200`, [now.date]
  );
  for (const rule of due.rows) {
    const runDate = String(rule.next_run_date).slice(0, 10);
    const exists = await pool.query("SELECT 1 FROM pocket_auto_budget_executions WHERE rule_id=$1 AND run_date=$2", [rule.id, runDate]);
    if (!exists.rowCount) await executeRule(rule, runDate);
    const nextRun = nextOccurrence(runDate, { frequency: rule.frequency, dayOfWeek: rule.day_of_week, dayOfMonth: rule.day_of_month, monthOfYear: rule.month_of_year }, false);
    await pool.query("UPDATE pocket_auto_budget_rules SET next_run_date=$1,is_active=($2::date IS NULL OR $1::date <= $2::date),updated_at=now() WHERE id=$3", [nextRun, rule.expiry_date, rule.id]);
  }
}

async function executeRule(rule: any, runDate: string, executionId?: string) {
  try {
    const transfer = await createTransfer(rule.user_id, {
      sourceAccountId: rule.source_account_id, destinationAccountId: rule.account_id,
      amount: rule.amount, feeAmount: 0, transferDate: `${runDate}T07:00:00+07:00`,
      notes: `Auto budgeting ${rule.frequency}`
    });
    if (executionId) {
      await pool.query("UPDATE pocket_auto_budget_executions SET status='success',transfer_id=$1,error_message=NULL,created_at=now() WHERE id=$2", [transfer.id, executionId]);
    } else {
      await pool.query("INSERT INTO pocket_auto_budget_executions(rule_id,run_date,status,transfer_id) VALUES($1,$2,'success',$3)", [rule.id, runDate, transfer.id]);
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saldo Pocket sumber tidak mencukupi";
    if (executionId) throw error;
    await pool.query(`INSERT INTO pocket_auto_budget_executions(rule_id,run_date,status,error_message)
      VALUES($1,$2,'failed',$3) ON CONFLICT(rule_id,run_date) DO UPDATE SET status='failed',error_message=EXCLUDED.error_message`, [rule.id, runDate, message]);
    await sendPushToUser(rule.user_id, { title: "Auto budgeting gagal", body: `Saldo pada pocket ${rule.source_account_name} tidak mencukupi untuk transfer ke ${rule.target_account_name}.`, url: "/?view=accounts", tag: `auto-budget-failed-${rule.id}-${runDate}` });
    return { success: false };
  }
}

export async function retryAutoBudgetExecution(userId: string, accountId: string, executionId: string) {
  const result = await pool.query(
    `SELECT r.*, e.id AS execution_id, e.run_date::text, source.name AS source_account_name, target.name AS target_account_name
     FROM pocket_auto_budget_executions e JOIN pocket_auto_budget_rules r ON r.id=e.rule_id
     JOIN accounts source ON source.id=r.source_account_id JOIN accounts target ON target.id=r.account_id
     WHERE e.id=$1 AND r.account_id=$2 AND r.user_id=$3 AND e.status='failed'`, [executionId, accountId, userId]
  );
  if (!result.rowCount) throw notFound("Eksekusi gagal tidak ditemukan");
  const rule = result.rows[0];
  await executeRule(rule, String(rule.run_date).slice(0, 10), rule.execution_id);
  return { success: true };
}
