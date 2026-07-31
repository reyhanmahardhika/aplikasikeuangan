import { pool } from "../db/pool.js";
import { normalizeMoney } from "../utils/money.js";
import { badRequest, notFound } from "../utils/errors.js";
import { writeAuditLog } from "./auditService.js";

type ScheduleInput = {
  title: string;
  scheduleType: "transaction" | "transfer" | "topup";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  expiryDate?: string | null;
  dueDay: number;
  nextDueDate: string;
  amount?: unknown | null;
  accountId?: string | null;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function dateOnlyDayNumber(value: unknown) {
  const date = String(value ?? "").slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function decorateSchedule(row: any) {
  const daysUntilDue = dateOnlyDayNumber(row.nextDueDate) - dateOnlyDayNumber(jakartaToday());
  return {
    ...row,
    daysUntilDue,
    reminderStatus: daysUntilDue < 0 ? "overdue" : daysUntilDue <= 3 ? "soon" : "upcoming"
  };
}

export async function listSchedules(userId: string) {
  const result = await pool.query(
    `SELECT s.id, s.title, s.schedule_type AS "scheduleType", s.frequency,
            s.expiry_date AS "expiryDate", s.due_day AS "dueDay",
            s.next_due_date AS "nextDueDate", s.amount::text, s.account_id AS "accountId",
            s.destination_account_id AS "destinationAccountId", s.category_id AS "categoryId",
            s.payment_method AS "paymentMethod", s.notes, s.is_active AS "isActive",
            a.name AS "accountName", da.name AS "destinationAccountName", c.name AS "categoryName"
     FROM schedules s
     LEFT JOIN accounts a ON a.id = s.account_id
     LEFT JOIN accounts da ON da.id = s.destination_account_id
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.user_id = $1 AND s.is_active = true
     ORDER BY s.next_due_date ASC, s.created_at DESC`,
    [userId]
  );
  return result.rows.map(decorateSchedule);
}

export async function createSchedule(userId: string, input: ScheduleInput) {
  if (input.expiryDate && input.expiryDate < input.nextDueDate) {
    throw badRequest("Tanggal berakhir tidak boleh sebelum jatuh tempo berikutnya");
  }
  const amount = input.amount ? normalizeMoney(input.amount) : null;
  const result = await pool.query(
    `INSERT INTO schedules
     (user_id, title, schedule_type, frequency, expiry_date, due_day, next_due_date, amount, account_id, destination_account_id, category_id, payment_method, notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id, title, schedule_type AS "scheduleType", frequency, expiry_date AS "expiryDate", due_day AS "dueDay", next_due_date AS "nextDueDate",
               amount::text, account_id AS "accountId", destination_account_id AS "destinationAccountId",
               category_id AS "categoryId", payment_method AS "paymentMethod", notes, is_active AS "isActive"`,
    [
      userId,
      input.title,
      input.scheduleType,
      input.frequency,
      input.expiryDate ?? null,
      input.dueDay,
      input.nextDueDate,
      amount,
      input.accountId ?? null,
      input.destinationAccountId ?? null,
      input.categoryId ?? null,
      input.paymentMethod ?? null,
      input.notes ?? null,
      input.isActive ?? true
    ]
  );
  await writeAuditLog(pool, { userId, action: "CREATE", entityName: "Schedule", entityId: result.rows[0].id, newValue: result.rows[0] });
  return decorateSchedule(result.rows[0]);
}

export async function updateSchedule(userId: string, scheduleId: string, input: Partial<ScheduleInput>) {
  const current = await pool.query("SELECT * FROM schedules WHERE id = $1 AND user_id = $2", [scheduleId, userId]);
  if (!current.rowCount) throw notFound("Jadwal tidak ditemukan");
  const row = current.rows[0];
  const nextDueDate = input.nextDueDate ?? String(row.next_due_date).slice(0, 10);
  const expiryDate = input.expiryDate === undefined ? row.expiry_date : input.expiryDate;
  if (expiryDate && String(expiryDate).slice(0, 10) < String(nextDueDate).slice(0, 10)) {
    throw badRequest("Tanggal berakhir tidak boleh sebelum jatuh tempo berikutnya");
  }
  const amount = input.amount === undefined ? row.amount : input.amount ? normalizeMoney(input.amount) : null;
  const result = await pool.query(
    `UPDATE schedules
     SET title = $1, schedule_type = $2, frequency = $3, expiry_date = $4, due_day = $5, next_due_date = $6, amount = $7,
         account_id = $8, destination_account_id = $9, category_id = $10, payment_method = $11,
         notes = $12, is_active = $13, updated_at = now()
     WHERE id = $14 AND user_id = $15
     RETURNING id, title, schedule_type AS "scheduleType", frequency, expiry_date AS "expiryDate", due_day AS "dueDay", next_due_date AS "nextDueDate",
               amount::text, account_id AS "accountId", destination_account_id AS "destinationAccountId",
               category_id AS "categoryId", payment_method AS "paymentMethod", notes, is_active AS "isActive"`,
    [
      input.title ?? row.title,
      input.scheduleType ?? row.schedule_type,
      input.frequency ?? row.frequency,
      input.expiryDate === undefined ? row.expiry_date : input.expiryDate,
      input.dueDay ?? row.due_day,
      input.nextDueDate ?? row.next_due_date,
      amount,
      input.accountId === undefined ? row.account_id : input.accountId,
      input.destinationAccountId === undefined ? row.destination_account_id : input.destinationAccountId,
      input.categoryId === undefined ? row.category_id : input.categoryId,
      input.paymentMethod === undefined ? row.payment_method : input.paymentMethod,
      input.notes === undefined ? row.notes : input.notes,
      input.isActive ?? row.is_active,
      scheduleId,
      userId
    ]
  );
  await writeAuditLog(pool, { userId, action: "UPDATE", entityName: "Schedule", entityId: scheduleId, previousValue: row, newValue: result.rows[0] });
  return decorateSchedule(result.rows[0]);
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  const result = await pool.query(
    `UPDATE schedules SET is_active = false, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [scheduleId, userId]
  );
  if (!result.rowCount) throw notFound("Jadwal tidak ditemukan");
  await writeAuditLog(pool, { userId, action: "DELETE", entityName: "Schedule", entityId: scheduleId });
  return { deleted: true };
}
