import { pool, withDbTransaction } from "../db/pool.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors.js";
import { writeAuditLog } from "./auditService.js";

export async function getAccountCollaborators(accountId: string, requesterId: string) {
  const result = await pool.query(
    `SELECT ac.user_id, ac.role, ac.status, ac.invited_by, ac.invited_at, ac.accepted_at,
            u.full_name, u.email, u.username, u.avatar_url,
            inv.full_name AS invited_by_name
     FROM account_collaborators ac
     JOIN users u ON u.id = ac.user_id
     JOIN users inv ON inv.id = ac.invited_by
     WHERE ac.account_id = $1
       AND EXISTS (
         SELECT 1
         FROM accounts a
         WHERE a.id = ac.account_id
           AND (
             a.user_id = $2
             OR EXISTS (
               SELECT 1 FROM account_collaborators access
               WHERE access.account_id = a.id
                 AND access.user_id = $2
                 AND access.status = 'accepted'
             )
           )
       )
     ORDER BY ac.status, ac.invited_at DESC`,
    [accountId, requesterId]
  );
  return result.rows;
}

export async function inviteAccountCollaborator(
  accountId: string,
  inviterId: string,
  targetUserId: string,
  role: "admin" | "member" | "viewer" = "member"
) {
  const accountResult = await pool.query(
    "SELECT user_id FROM accounts WHERE id = $1",
    [accountId]
  );
  if (!accountResult.rowCount) throw notFound("Akun tidak ditemukan");

  const account = accountResult.rows[0];
  if (account.user_id !== inviterId) throw forbidden("Hanya owner yang dapat mengundang collaborator");
  if (targetUserId === inviterId) throw badRequest("Tidak dapat mengundang diri sendiri");

  const existingResult = await pool.query(
    "SELECT status FROM account_collaborators WHERE account_id = $1 AND user_id = $2",
    [accountId, targetUserId]
  );
  if (existingResult.rowCount) {
    const existing = existingResult.rows[0];
    if (existing.status === "accepted") throw conflict("User sudah menjadi collaborator");
    if (existing.status === "pending") throw conflict("Invite sudah dikirim");
  }

  return withDbTransaction(async (db) => {
    const result = await db.query(
      `INSERT INTO account_collaborators (account_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'pending', $4)
       ON CONFLICT (account_id, user_id) DO UPDATE
       SET role = EXCLUDED.role,
           status = 'pending',
           invited_by = EXCLUDED.invited_by,
           invited_at = now(),
           accepted_at = NULL
       RETURNING *`,
      [accountId, targetUserId, role, inviterId]
    );
    await writeAuditLog(db, {
      userId: inviterId,
      action: "CREATE",
      entityName: "AccountCollaborator",
      entityId: result.rows[0].account_id,
      newValue: result.rows[0]
    });
    return result.rows[0];
  });
}

export async function respondAccountInvite(
  accountId: string,
  userId: string,
  status: "accepted" | "rejected"
) {
  return withDbTransaction(async (db) => {
    const result = await db.query(
      `SELECT ac.*, a.name AS account_name
       FROM account_collaborators ac
       JOIN accounts a ON a.id = ac.account_id
       WHERE ac.account_id = $1 AND ac.user_id = $2 AND ac.status = 'pending'
       FOR UPDATE`,
      [accountId, userId]
    );
    if (!result.rowCount) throw notFound("Invite tidak ditemukan atau sudah direspon");

    const updated = await db.query(
      `UPDATE account_collaborators
       SET status = $3, accepted_at = CASE WHEN $3 = 'accepted' THEN NOW() ELSE NULL END
       WHERE account_id = $1 AND user_id = $2
       RETURNING *`,
      [accountId, userId, status]
    );
    await writeAuditLog(db, {
      userId,
      action: "UPDATE",
      entityName: "AccountCollaborator",
      entityId: accountId,
      newValue: updated.rows[0]
    });
    return updated.rows[0];
  });
}

export async function removeAccountCollaborator(
  accountId: string,
  requesterId: string,
  targetUserId: string
) {
  const result = await pool.query(
    `SELECT ac.role, ac.status, a.user_id AS owner_user_id FROM account_collaborators ac
     JOIN accounts a ON a.id = ac.account_id
     WHERE ac.account_id = $1 AND ac.user_id = $2
     FOR UPDATE`,
    [accountId, targetUserId]
  );
  if (!result.rowCount) throw notFound("Collaborator tidak ditemukan");

  const collaborator = result.rows[0];
  if (collaborator.owner_user_id !== requesterId) {
    throw forbidden("Hanya owner yang dapat menghapus user dari pocket");
  }
  if (collaborator.role === "owner") throw badRequest("Tidak dapat menghapus owner");

  await pool.query(
    "DELETE FROM account_collaborators WHERE account_id = $1 AND user_id = $2",
    [accountId, targetUserId]
  );
  await writeAuditLog(pool, {
    userId: requesterId,
    action: "DELETE",
    entityName: "AccountCollaborator",
    entityId: accountId
  });
  return { deleted: true };
}
