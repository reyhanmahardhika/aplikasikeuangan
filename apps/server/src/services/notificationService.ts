import type { PoolClient } from "pg";
import { pool, type DbClient } from "../db/pool.js";

export type AppNotificationInput = {
  userId: string;
  eventType: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAppNotification(client: PoolClient, input: AppNotificationInput) {
  const result = await client.query(
    `INSERT INTO app_notifications
     (user_id, event_type, title, body, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, event_type AS "eventType", title, body, entity_type AS "entityType",
               entity_id AS "entityId", is_read AS "isRead", created_at AS "createdAt"`,
    [
      input.userId,
      input.eventType,
      input.title,
      input.body ?? null,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  return result.rows[0];
}

export async function listAppNotifications(userId: string, limit = 50) {
  const result = await pool.query(
    `SELECT id, event_type AS "eventType", title, body,
            entity_type AS "entityType", entity_id AS "entityId",
            is_read AS "isRead", created_at AS "createdAt"
     FROM app_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)]
  );
  return result.rows;
}

export async function markAppNotificationsRead(userId: string, client: DbClient = pool) {
  await client.query(
    `UPDATE app_notifications
     SET is_read = true, read_at = now()
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return { ok: true };
}

export async function markAppNotificationRead(userId: string, notificationId: string, client: DbClient = pool) {
  await client.query(
    `UPDATE app_notifications
     SET is_read = true, read_at = now()
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return { ok: true };
}
