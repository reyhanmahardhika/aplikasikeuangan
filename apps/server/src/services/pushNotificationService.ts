import webpush, { type PushSubscription } from "web-push";
import { config } from "../config.js";
import { pool } from "../db/pool.js";

type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

const pushConfigured = Boolean(config.vapidPublicKey && config.vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey!,
    config.vapidPrivateKey!
  );
}

export function getPushConfig() {
  return {
    enabled: pushConfigured,
    publicKey: pushConfigured ? config.vapidPublicKey : null
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription,
  userAgent?: string
) {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = now()`,
    [
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent ?? null
    ]
  );
  return { subscribed: true };
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await pool.query(
    "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
    [userId, endpoint]
  );
  return { subscribed: false };
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured) return 0;
  const result = await pool.query(
    `SELECT endpoint, p256dh, auth
     FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  const deliveries = await Promise.all(result.rows.map(async (row) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 * 7, urgency: "high" }
      );
      return true;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [row.endpoint]);
        return false;
      }
      console.error("Push notification failed", error);
      return false;
    }
  }));
  return deliveries.filter(Boolean).length;
}

export async function sendDueSchedulePushes() {
  if (!pushConfigured) return;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const addFrequency = (dateValue: string, frequency: string) => {
    const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (frequency === "daily") date.setUTCDate(date.getUTCDate() + 1);
    else if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
    else {
      const targetYear = frequency === "yearly" ? year + 1 : year + Math.floor(month / 12);
      const targetMonth = frequency === "yearly" ? month - 1 : month % 12;
      const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
      date.setTime(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
    }
    return date.toISOString().slice(0, 10);
  };

  const staleSchedules = await pool.query(
    `SELECT id, next_due_date::text AS "nextDueDate", frequency,
            expiry_date::text AS "expiryDate"
     FROM schedules
     WHERE is_active = true AND next_due_date < $1::date`,
    [today]
  );
  for (const schedule of staleSchedules.rows) {
    let nextDate = String(schedule.nextDueDate).slice(0, 10);
    do nextDate = addFrequency(nextDate, schedule.frequency);
    while (nextDate < today);
    const expired = Boolean(schedule.expiryDate && nextDate > String(schedule.expiryDate).slice(0, 10));
    await pool.query(
      `UPDATE schedules SET next_due_date = $1, is_active = $2, updated_at = now() WHERE id = $3`,
      [nextDate, !expired, schedule.id]
    );
  }

  const dueSchedules = await pool.query(
    `SELECT s.id, s.user_id AS "userId", s.title, s.amount::text,
            s.next_due_date::text AS "nextDueDate", COALESCE(u.preferred_language, 'id') AS language
     FROM schedules s
     JOIN users u ON u.id = s.user_id
     WHERE s.is_active = true
       AND (s.expiry_date IS NULL OR s.next_due_date <= s.expiry_date)
       AND s.next_due_date BETWEEN $1::date AND ($1::date + INTERVAL '3 days')::date
       AND NOT EXISTS (
         SELECT 1 FROM schedule_push_deliveries d
         WHERE d.schedule_id = s.id
           AND d.user_id = s.user_id
           AND d.due_date = s.next_due_date
       )`,
    [today]
  );

  for (const schedule of dueSchedules.rows) {
    const dayNumber = (value: string) => {
      const [year, month, day] = value.slice(0, 10).split("-").map(Number);
      return Date.UTC(year, month - 1, day) / 86_400_000;
    };
    const dueDate = String(schedule.nextDueDate).slice(0, 10);
    const days = dayNumber(dueDate) - dayNumber(today);
    const isEnglish = schedule.language === "en";
    const timing = days === 0
      ? (isEnglish ? "due today" : "jatuh tempo hari ini")
      : (isEnglish ? `due in ${days} days` : `jatuh tempo ${days} hari lagi`);
    const formattedDate = new Intl.DateTimeFormat(isEnglish ? "en-US" : "id-ID", {
      timeZone: "UTC", day: "2-digit", month: "short", year: "numeric"
    }).format(new Date(`${dueDate}T00:00:00Z`));
    const amount = schedule.amount
      ? `Rp${Number(schedule.amount).toLocaleString("id-ID")}`
      : null;

    const delivered = await sendPushToUser(schedule.userId, {
      title: schedule.title,
      body: [`${timing} (${formattedDate})`, amount].filter(Boolean).join(" - "),
      url: "/?view=manage",
      tag: `schedule-${schedule.id}-${String(schedule.nextDueDate).slice(0, 10)}`
    });
    if (!delivered) continue;
    await pool.query(
      `INSERT INTO schedule_push_deliveries (schedule_id, user_id, due_date)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [schedule.id, schedule.userId, schedule.nextDueDate]
    );
  }
}

