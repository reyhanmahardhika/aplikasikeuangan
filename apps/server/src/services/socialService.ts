import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors.js";
import { normalizeMoney, normalizeNonNegativeMoney, toCents } from "../utils/money.js";
import { simplifyDebts } from "../utils/debt.js";
import { writeAuditLog } from "./auditService.js";
import { sendPushToUser } from "./pushNotificationService.js";

async function notify(
  db: DbClient,
  input: {
    recipientId: string;
    actorId?: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  }
) {
  if (input.recipientId === input.actorId) return;
  await db.query(
    `INSERT INTO social_events
      (recipient_id, actor_id, event_type, title, body, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.recipientId,
      input.actorId ?? null,
      input.type,
      input.title,
      input.body ?? null,
      input.entityType ?? null,
      input.entityId ?? null
    ]
  );
  void sendPushToUser(input.recipientId, {
    title: input.title,
    body: input.body,
    url: input.entityType === "wallet" && input.entityId
      ? `/?view=social&walletId=${input.entityId}`
      : "/?view=social",
    tag: input.entityId ? `${input.type}-${input.entityId}` : input.type
  }).catch((error) => console.error("Social push failed", error));
}

async function userName(db: DbClient, userId: string) {
  const result = await db.query("SELECT full_name FROM users WHERE id = $1", [userId]);
  if (!result.rowCount) throw notFound("Pengguna tidak ditemukan");
  return result.rows[0].full_name as string;
}

export async function socialSummary(userId: string) {
  const [payable, receivable, groups, confirmations, unread] = await Promise.all([
    pool.query(
      `SELECT COALESCE(sum(p.share_amount), 0)::text AS total
       FROM group_expense_participants p
       JOIN group_expenses e ON e.id = p.expense_id
       WHERE p.user_id = $1 AND e.paid_by <> $1 AND e.status = 'confirmed'
         AND p.confirmation_status IN ('pending', 'confirmed')`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(sum(p.share_amount), 0)::text AS total
       FROM group_expenses e
       JOIN group_expense_participants p ON p.expense_id = e.id AND p.user_id <> e.paid_by
       WHERE e.paid_by = $1 AND e.status = 'confirmed'
         AND p.confirmation_status IN ('pending', 'confirmed')`,
      [userId]
    ),
    pool.query(
      `SELECT count(*)::int AS total FROM financial_group_members
       WHERE user_id = $1 AND status = 'accepted'`,
      [userId]
    ),
    pool.query(
      `SELECT count(*)::int AS total FROM group_expense_participants
       WHERE user_id = $1 AND confirmation_status = 'pending'`,
      [userId]
    ),
    pool.query("SELECT count(*)::int AS total FROM social_events WHERE recipient_id = $1 AND is_read = false", [userId])
  ]);
  return {
    totalPayable: payable.rows[0].total,
    totalReceivable: receivable.rows[0].total,
    activeGroups: groups.rows[0].total,
    pendingConfirmations: confirmations.rows[0].total,
    unreadNotifications: unread.rows[0].total
  };
}

export async function searchPeople(userId: string, rawQuery: string) {
  const query = rawQuery.trim().replace(/^finance-ai:user:/i, "").replace(/^@/, "");
  if (query.length < 2) return [];
  const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
  const result = await pool.query(
    `SELECT u.id, u.full_name AS "fullName", u.username, u.avatar_url AS "avatarUrl",
            CASE WHEN u.id = $1 OR NOT COALESCE(p.hide_phone, true) THEN u.phone ELSE NULL END AS phone,
            CASE WHEN u.id = $1 OR COALESCE(p.searchable_by, 'username') = 'everyone' THEN u.email ELSE NULL END AS email,
            CASE
              WHEN u.id = $1 THEN 'self'
              WHEN f.status IS NULL THEN 'none'
              WHEN f.requester_id = $1 THEN f.status
              WHEN f.status = 'pending' THEN 'incoming'
              ELSE f.status
            END AS "relationshipStatus"
     FROM users u
     LEFT JOIN user_privacy_settings p ON p.user_id = u.id
     LEFT JOIN friendships f
       ON LEAST(f.requester_id, f.addressee_id) = LEAST($1::uuid, u.id)
      AND GREATEST(f.requester_id, f.addressee_id) = GREATEST($1::uuid, u.id)
     WHERE f.status IS DISTINCT FROM 'blocked'
       AND (
         (
           u.id = $1
           AND (
             lower(u.username) LIKE lower($3) ESCAPE '\'
             OR lower(u.email) LIKE lower($3) ESCAPE '\'
             OR COALESCE(u.phone, '') LIKE $3 ESCAPE '\'
           )
         )
         OR (
           u.id <> $1
           AND COALESCE(p.searchable_by, 'username') <> 'nobody'
           AND (
             (
               COALESCE(p.searchable_by, 'username') IN ('everyone', 'username')
               AND lower(u.username) LIKE lower($3) ESCAPE '\'
             )
             OR (
               COALESCE(p.searchable_by, 'username') = 'everyone'
               AND (
                 lower(u.email) LIKE lower($3) ESCAPE '\'
                 OR COALESCE(u.phone, '') LIKE $3 ESCAPE '\'
               )
             )
             OR (
               COALESCE(p.searchable_by, 'username') = 'friends'
               AND f.status = 'accepted'
               AND lower(u.username) LIKE lower($3) ESCAPE '\'
             )
           )
         )
       )
     ORDER BY
       CASE
         WHEN lower(u.username) = lower($2) OR lower(u.email) = lower($2) OR u.phone = $2 THEN 0
         WHEN u.id = $1 THEN 1
         ELSE 2
       END,
       u.full_name
     LIMIT 8`,
    [userId, query, pattern]
  );
  return result.rows;
}

export async function listFriends(userId: string) {
  const result = await pool.query(
    `SELECT f.id, f.status, f.requester_id AS "requesterId", f.addressee_id AS "addresseeId",
            u.id AS "userId", u.full_name AS "fullName", u.username, u.avatar_url AS "avatarUrl",
            (f.addressee_id = $1 AND f.status = 'pending') AS incoming,
            f.created_at AS "createdAt"
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
     WHERE f.requester_id = $1 OR f.addressee_id = $1
     ORDER BY CASE f.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, u.full_name`,
    [userId]
  );
  return result.rows;
}

export async function requestFriend(userId: string, identifier: string, targetUserId?: string) {
  const normalizedIdentifier = identifier.trim().replace(/^@/, "").toLowerCase();
  const target = targetUserId
    ? (await pool.query(
      `SELECT u.id, u.username
       FROM users u
       LEFT JOIN user_privacy_settings p ON p.user_id = u.id
       LEFT JOIN friendships f
         ON LEAST(f.requester_id, f.addressee_id) = LEAST($1::uuid, u.id)
        AND GREATEST(f.requester_id, f.addressee_id) = GREATEST($1::uuid, u.id)
       WHERE u.id = $2
         AND u.id <> $1
         AND f.status IS DISTINCT FROM 'blocked'
         AND (
           (
             COALESCE(p.searchable_by, 'username') IN ('everyone', 'username')
             AND lower(u.username) = $3
           )
           OR (
             COALESCE(p.searchable_by, 'username') = 'everyone'
             AND (lower(u.email) = $3 OR lower(COALESCE(u.phone, '')) = $3)
           )
           OR (
             COALESCE(p.searchable_by, 'username') = 'friends'
             AND f.status = 'accepted'
             AND lower(u.username) = $3
           )
         )
       LIMIT 1`,
      [userId, targetUserId, normalizedIdentifier]
    )).rows[0]
    : (await searchPeople(userId, identifier))
      .find((candidate) => candidate.relationshipStatus !== "self");
  if (!target) throw notFound("Pengguna tidak ditemukan atau tidak dapat dicari");
  const existing = await pool.query(
    `SELECT id, status FROM friendships
     WHERE LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
    [userId, target.id]
  );
  if (existing.rowCount && existing.rows[0].status !== "rejected") {
    throw conflict("Hubungan dengan pengguna ini sudah ada");
  }
  const actorName = await userName(pool, userId);
  const result = existing.rowCount
    ? await pool.query(
      `UPDATE friendships SET requester_id = $1, addressee_id = $2, status = 'pending',
              responded_at = NULL, updated_at = now()
       WHERE id = $3 RETURNING id, status`,
      [userId, target.id, existing.rows[0].id]
    )
    : await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id)
       VALUES ($1, $2) RETURNING id, status`,
      [userId, target.id]
    );
  await notify(pool, {
    recipientId: target.id,
    actorId: userId,
    type: "friend_request",
    title: "Permintaan pertemanan",
    body: `${actorName} ingin menambahkan Anda sebagai teman.`,
    entityType: "friendship",
    entityId: result.rows[0].id
  });
  return result.rows[0];
}

export async function respondFriend(userId: string, friendshipId: string, status: "accepted" | "rejected") {
  const result = await pool.query(
    `UPDATE friendships SET status = $1, responded_at = now(), updated_at = now()
     WHERE id = $2 AND addressee_id = $3 AND status = 'pending'
     RETURNING id, requester_id`,
    [status, friendshipId, userId]
  );
  if (!result.rowCount) throw notFound("Permintaan pertemanan tidak ditemukan");
  const actorName = await userName(pool, userId);
  await notify(pool, {
    recipientId: result.rows[0].requester_id,
    actorId: userId,
    type: `friend_${status}`,
    title: status === "accepted" ? "Permintaan diterima" : "Permintaan ditolak",
    body: `${actorName} ${status === "accepted" ? "menerima" : "menolak"} permintaan pertemanan Anda.`,
    entityType: "friendship",
    entityId: friendshipId
  });
  return { id: friendshipId, status };
}

export async function removeOrBlockFriend(userId: string, friendshipId: string, block: boolean) {
  const result = block
    ? await pool.query(
      `UPDATE friendships SET status = 'blocked', requester_id = $1, responded_at = now(), updated_at = now()
       WHERE id = $2 AND (requester_id = $1 OR addressee_id = $1) RETURNING id`,
      [userId, friendshipId]
    )
    : await pool.query(
      `DELETE FROM friendships WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2) RETURNING id`,
      [friendshipId, userId]
    );
  if (!result.rowCount) throw notFound("Hubungan pertemanan tidak ditemukan");
  return block ? { blocked: true } : { deleted: true };
}

export async function reportUser(userId: string, reportedUserId: string, reason: string) {
  if (userId === reportedUserId) throw badRequest("Tidak dapat melaporkan akun sendiri");
  const target = await pool.query("SELECT id FROM users WHERE id = $1", [reportedUserId]);
  if (!target.rowCount) throw notFound("Pengguna tidak ditemukan");
  const result = await pool.query(
    `INSERT INTO user_reports (reporter_id, reported_user_id, reason)
     VALUES ($1, $2, $3) RETURNING id, status, created_at AS "createdAt"`,
    [userId, reportedUserId, reason]
  );
  await writeAuditLog(pool, {
    userId,
    action: "REPORT",
    entityName: "User",
    entityId: reportedUserId,
    newValue: { reportId: result.rows[0].id, reason }
  });
  return result.rows[0];
}

async function assertFriend(userId: string, friendId: string) {
  const result = await pool.query(
    `SELECT 1 FROM friendships WHERE status = 'accepted'
       AND LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
    [userId, friendId]
  );
  if (!result.rowCount) throw forbidden("Profil hanya dapat dilihat oleh teman");
}

export async function friendProfile(userId: string, friendId: string) {
  await assertFriend(userId, friendId);
  const [profile, commonGroups, sharedHistory, balance] = await Promise.all([
    pool.query(
      `SELECT id, full_name AS "fullName", username, avatar_url AS "avatarUrl",
              profile_title AS title
       FROM users WHERE id = $1`,
      [friendId]
    ),
    pool.query(
      `SELECT count(*)::int AS total
       FROM financial_group_members mine
       JOIN financial_group_members theirs ON theirs.group_id = mine.group_id
       WHERE mine.user_id = $1 AND theirs.user_id = $2
         AND mine.status = 'accepted' AND theirs.status = 'accepted'`,
      [userId, friendId]
    ),
    pool.query(
      `SELECT e.id, e.description, e.amount::text, e.expense_date AS "expenseDate",
              payer.full_name AS "paidByName", p.share_amount::text AS "friendShare",
              g.name AS "groupName"
       FROM group_expenses e
       JOIN financial_groups g ON g.id = e.group_id
       JOIN users payer ON payer.id = e.paid_by
       JOIN group_expense_participants p ON p.expense_id = e.id
       WHERE e.status <> 'cancelled'
         AND (
           (e.paid_by = $1 AND p.user_id = $2)
           OR (e.paid_by = $2 AND p.user_id = $1)
         )
       ORDER BY e.expense_date DESC LIMIT 30`,
      [userId, friendId]
    ),
    pool.query(
      `SELECT COALESCE(sum(
         CASE
           WHEN e.paid_by = $1 AND p.user_id = $2 THEN p.share_amount
           WHEN e.paid_by = $2 AND p.user_id = $1 THEN -p.share_amount
           ELSE 0
         END
       ), 0)::text AS balance
       FROM group_expenses e
       JOIN group_expense_participants p ON p.expense_id = e.id
       WHERE e.status = 'confirmed'`,
      [userId, friendId]
    )
  ]);
  if (!profile.rowCount) throw notFound("Teman tidak ditemukan");
  return {
    ...profile.rows[0],
    commonGroups: commonGroups.rows[0].total,
    balance: balance.rows[0].balance,
    sharedTransactions: sharedHistory.rows
  };
}

async function assertGroupMember(db: DbClient, userId: string, groupId: string, roles?: string[]) {
  const result = await db.query(
    `SELECT role FROM financial_group_members
     WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [groupId, userId]
  );
  if (!result.rowCount) throw forbidden("Anda bukan anggota grup ini");
  if (roles && !roles.includes(result.rows[0].role)) throw forbidden("Role Anda tidak dapat melakukan aksi ini");
  return result.rows[0].role as string;
}

export async function listGroups(userId: string) {
  const result = await pool.query(
    `SELECT g.id, g.name, g.description, g.icon, gm.role, gm.status,
            (SELECT count(*)::int FROM financial_group_members members
             WHERE members.group_id = g.id AND members.status = 'accepted') AS "memberCount",
            (SELECT COALESCE(sum(e.amount), 0) FROM group_expenses e
             WHERE e.group_id = g.id AND e.status = 'confirmed' AND e.paid_by = $1)
            -
            (SELECT COALESCE(sum(p.share_amount), 0)
             FROM group_expense_participants p JOIN group_expenses e ON e.id = p.expense_id
             WHERE e.group_id = g.id AND e.status = 'confirmed' AND p.user_id = $1) AS "myBalance"
     FROM financial_groups g
     JOIN financial_group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     WHERE gm.status IN ('accepted', 'pending')
     ORDER BY CASE gm.status WHEN 'pending' THEN 0 ELSE 1 END, g.updated_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({ ...row, myBalance: String(row.myBalance) }));
}

export async function createGroup(userId: string, input: { name: string; description?: string; memberIds?: string[] }) {
  return withDbTransaction(async (client) => {
    const group = await client.query(
      `INSERT INTO financial_groups (owner_id, name, description)
       VALUES ($1, $2, $3) RETURNING id, name, description`,
      [userId, input.name, input.description ?? null]
    );
    const groupId = group.rows[0].id;
    await client.query(
      `INSERT INTO financial_group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [groupId, userId]
    );
    const actorName = await userName(client, userId);
    for (const memberId of [...new Set(input.memberIds ?? [])]) {
      await assertFriend(userId, memberId);
      const privacy = await client.query("SELECT allow_group_invites FROM user_privacy_settings WHERE user_id = $1", [memberId]);
      if (!privacy.rows[0]?.allow_group_invites) continue;
      await client.query(
        `INSERT INTO financial_group_members (group_id, user_id, status)
         VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
        [groupId, memberId]
      );
      await notify(client, {
        recipientId: memberId,
        actorId: userId,
        type: "group_invite",
        title: `Undangan grup ${input.name}`,
        body: `${actorName} menambahkan Anda ke grup.`,
        entityType: "group",
        entityId: groupId
      });
    }
    await writeAuditLog(client, { userId, action: "CREATE", entityName: "FinancialGroup", entityId: groupId, newValue: group.rows[0] });
    return group.rows[0];
  });
}

export async function respondGroupInvite(userId: string, groupId: string, status: "accepted" | "rejected") {
  const result = await pool.query(
    `UPDATE financial_group_members SET status = $1, joined_at = now()
     WHERE group_id = $2 AND user_id = $3 AND status = 'pending'
     RETURNING group_id`,
    [status, groupId, userId]
  );
  if (!result.rowCount) throw notFound("Undangan grup tidak ditemukan");
  return { groupId, status };
}

export async function addGroupMember(userId: string, groupId: string, friendId: string) {
  await assertGroupMember(pool, userId, groupId, ["owner", "admin"]);
  await assertFriend(userId, friendId);
  const privacy = await pool.query("SELECT allow_group_invites FROM user_privacy_settings WHERE user_id = $1", [friendId]);
  if (!privacy.rows[0]?.allow_group_invites) throw forbidden("Pengguna tidak mengizinkan undangan grup");
  await pool.query(
    `INSERT INTO financial_group_members (group_id, user_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'pending'`,
    [groupId, friendId]
  );
  const group = await pool.query("SELECT name FROM financial_groups WHERE id = $1", [groupId]);
  await notify(pool, {
    recipientId: friendId,
    actorId: userId,
    type: "group_invite",
    title: `Undangan grup ${group.rows[0]?.name ?? ""}`,
    entityType: "group",
    entityId: groupId
  });
  return { invited: true };
}

function splitShares(amount: string, participantIds: string[], customShares?: Array<{ userId: string; amount: unknown }>) {
  const ids = [...new Set(participantIds)];
  if (!ids.length) throw badRequest("Pilih minimal satu peserta");
  const totalCents = toCents(amount);
  if (customShares?.length) {
    const shares = customShares.map((item) => ({ userId: item.userId, amount: normalizeNonNegativeMoney(item.amount) }));
    const sum = shares.reduce((value, item) => value + toCents(item.amount), 0n);
    if (sum !== totalCents) throw badRequest("Total bagian peserta harus sama dengan nominal transaksi");
    return shares;
  }
  const base = totalCents / BigInt(ids.length);
  let remainder = totalCents % BigInt(ids.length);
  return ids.map((id) => {
    const cents = base + (remainder > 0n ? 1n : 0n);
    if (remainder > 0n) remainder -= 1n;
    return { userId: id, amount: `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}` };
  });
}

export async function createGroupExpense(
  userId: string,
  groupId: string,
  input: {
    description: string;
    amount: unknown;
    paidBy: string;
    participantIds: string[];
    customShares?: Array<{ userId: string; amount: unknown }>;
    expenseDate?: string;
  }
) {
  return withDbTransaction(async (client) => {
    await assertGroupMember(client, userId, groupId, ["owner", "admin", "member"]);
    const amount = normalizeMoney(input.amount);
    const shares = splitShares(amount, input.participantIds, input.customShares);
    const requiredIds = [...new Set([input.paidBy, ...shares.map((item) => item.userId)])];
    const members = await client.query(
      `SELECT gm.user_id, u.full_name
       FROM financial_group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.status = 'accepted' AND gm.user_id = ANY($2::uuid[])`,
      [groupId, requiredIds]
    );
    if (members.rowCount !== requiredIds.length) throw badRequest("Pembayar dan peserta harus anggota aktif grup");
    const expense = await client.query(
      `INSERT INTO group_expenses
        (group_id, created_by, paid_by, description, amount, expense_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, description, amount::text, expense_date AS "expenseDate"`,
      [groupId, userId, input.paidBy, input.description, amount, input.expenseDate ?? new Date()]
    );
    for (const share of shares) {
      await client.query(
        `INSERT INTO group_expense_participants
          (expense_id, user_id, share_amount, confirmation_status)
         VALUES ($1, $2, $3, $4)`,
        [expense.rows[0].id, share.userId, share.amount, share.userId === userId ? "confirmed" : "pending"]
      );
      await notify(client, {
        recipientId: share.userId,
        actorId: userId,
        type: "expense_confirmation",
        title: input.description,
        body: `Bagian Anda Rp${Number(share.amount).toLocaleString("id-ID")}.`,
        entityType: "group_expense",
        entityId: expense.rows[0].id
      });
    }
    await writeAuditLog(client, {
      userId,
      action: "CREATE",
      entityName: "GroupExpense",
      entityId: expense.rows[0].id,
      newValue: { ...expense.rows[0], paidBy: input.paidBy, shares }
    });
    return { ...expense.rows[0], shares };
  });
}

export async function updateGroupExpense(
  userId: string,
  expenseId: string,
  input: {
    description: string;
    amount: unknown;
    paidBy: string;
    participantIds: string[];
    customShares?: Array<{ userId: string; amount: unknown }>;
    expenseDate?: string;
  }
) {
  return withDbTransaction(async (client) => {
    const current = await client.query(
      `SELECT e.* FROM group_expenses e
       JOIN financial_group_members gm ON gm.group_id = e.group_id
       WHERE e.id = $1 AND gm.user_id = $2 AND gm.status = 'accepted'
         AND (e.created_by = $2 OR gm.role IN ('owner', 'admin'))
       FOR UPDATE OF e`,
      [expenseId, userId]
    );
    if (!current.rowCount) throw forbidden("Anda tidak dapat mengedit transaksi grup ini");
    const previous = current.rows[0];
    const amount = normalizeMoney(input.amount);
    const shares = splitShares(amount, input.participantIds, input.customShares);
    await client.query(
      `UPDATE group_expenses SET description = $1, amount = $2, paid_by = $3,
              expense_date = COALESCE($4, expense_date), revision = revision + 1, updated_at = now()
       WHERE id = $5`,
      [input.description, amount, input.paidBy, input.expenseDate ?? null, expenseId]
    );
    await client.query("DELETE FROM group_expense_participants WHERE expense_id = $1", [expenseId]);
    for (const share of shares) {
      await client.query(
        `INSERT INTO group_expense_participants (expense_id, user_id, share_amount, confirmation_status)
         VALUES ($1, $2, $3, $4)`,
        [expenseId, share.userId, share.amount, share.userId === userId ? "confirmed" : "pending"]
      );
      await notify(client, {
        recipientId: share.userId,
        actorId: userId,
        type: "transaction_edited",
        title: "Transaksi grup diubah",
        body: `${input.description} perlu dikonfirmasi ulang.`,
        entityType: "group_expense",
        entityId: expenseId
      });
    }
    await writeAuditLog(client, {
      userId,
      action: "UPDATE",
      entityName: "GroupExpense",
      entityId: expenseId,
      previousValue: previous,
      newValue: { ...input, amount, shares }
    });
    return { id: expenseId, revision: Number(previous.revision) + 1, shares };
  });
}

async function groupBalances(groupId: string) {
  const result = await pool.query(
    `SELECT u.id AS "userId", u.full_name AS name,
            COALESCE(paid.total, 0) - COALESCE(shares.total, 0)
              + COALESCE(sent.total, 0) - COALESCE(received.total, 0) AS balance
     FROM financial_group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN (
       SELECT paid_by AS user_id, sum(amount) AS total FROM group_expenses
       WHERE group_id = $1 AND status = 'confirmed' GROUP BY paid_by
     ) paid ON paid.user_id = u.id
     LEFT JOIN (
       SELECT p.user_id, sum(p.share_amount) AS total
       FROM group_expense_participants p JOIN group_expenses e ON e.id = p.expense_id
       WHERE e.group_id = $1 AND e.status = 'confirmed' GROUP BY p.user_id
     ) shares ON shares.user_id = u.id
     LEFT JOIN (
       SELECT from_user_id AS user_id, sum(amount) AS total FROM group_settlements
       WHERE group_id = $1 AND status = 'confirmed' GROUP BY from_user_id
     ) sent ON sent.user_id = u.id
     LEFT JOIN (
       SELECT to_user_id AS user_id, sum(amount) AS total FROM group_settlements
       WHERE group_id = $1 AND status = 'confirmed' GROUP BY to_user_id
     ) received ON received.user_id = u.id
     WHERE gm.group_id = $1 AND gm.status = 'accepted'
     ORDER BY u.full_name`,
    [groupId]
  );
  return result.rows.map((row) => ({ ...row, balance: Number(row.balance) }));
}

export async function groupDetail(userId: string, groupId: string) {
  await assertGroupMember(pool, userId, groupId);
  const [group, members, expenses, balances, comments, audit] = await Promise.all([
    pool.query("SELECT id, name, description, owner_id AS \"ownerId\" FROM financial_groups WHERE id = $1", [groupId]),
    pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.username, u.avatar_url AS "avatarUrl", gm.role, gm.status
       FROM financial_group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 ORDER BY gm.status, u.full_name`,
      [groupId]
    ),
    pool.query(
      `SELECT e.id, e.description, e.amount::text, e.expense_date AS "expenseDate", e.status,
              e.paid_by AS "paidBy",
              e.created_by AS "createdBy",
              payer.full_name AS "paidByName", creator.full_name AS "createdByName",
              COALESCE(json_agg(json_build_object(
                'userId', p.user_id, 'name', participant.full_name,
                'shareAmount', p.share_amount::text, 'status', p.confirmation_status
              )) FILTER (WHERE p.user_id IS NOT NULL), '[]') AS participants
       FROM group_expenses e
       JOIN users payer ON payer.id = e.paid_by
       JOIN users creator ON creator.id = e.created_by
       LEFT JOIN group_expense_participants p ON p.expense_id = e.id
       LEFT JOIN users participant ON participant.id = p.user_id
       WHERE e.group_id = $1
       GROUP BY e.id, payer.full_name, creator.full_name
       ORDER BY e.expense_date DESC LIMIT 100`,
      [groupId]
    ),
    groupBalances(groupId),
    pool.query(
      `SELECT c.id, c.message, c.created_at AS "createdAt", u.full_name AS "authorName", u.avatar_url AS "avatarUrl"
       FROM social_comments c JOIN users u ON u.id = c.author_id
       WHERE c.entity_type = 'group' AND c.entity_id = $1 ORDER BY c.created_at`,
      [groupId]
    ),
    pool.query(
      `SELECT a.id, a.action, a.previous_value AS "previousValue", a.new_value AS "newValue",
              a.created_at AS "createdAt", u.full_name AS "actorName"
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_name = 'GroupExpense'
         AND a.entity_id IN (SELECT id FROM group_expenses WHERE group_id = $1)
       ORDER BY a.created_at DESC LIMIT 100`,
      [groupId]
    )
  ]);
  if (!group.rowCount) throw notFound("Grup tidak ditemukan");
  return {
    ...group.rows[0],
    members: members.rows,
    expenses: expenses.rows,
    balances,
    simplifiedDebts: simplifyDebts(balances),
    comments: comments.rows,
    auditHistory: audit.rows
  };
}

export async function confirmExpense(userId: string, expenseId: string, status: "confirmed" | "rejected" | "paid") {
  const result = await pool.query(
    `UPDATE group_expense_participants SET confirmation_status = $1, confirmed_at = now()
     WHERE expense_id = $2 AND user_id = $3
     RETURNING expense_id`,
    [status, expenseId, userId]
  );
  if (!result.rowCount) throw notFound("Bagian transaksi tidak ditemukan");
  return { expenseId, status };
}

export async function createSettlement(
  userId: string,
  groupId: string,
  input: { toUserId: string; amount: unknown }
) {
  await assertGroupMember(pool, userId, groupId);
  const amount = normalizeMoney(input.amount);
  const result = await pool.query(
    `INSERT INTO group_settlements (group_id, from_user_id, to_user_id, amount)
     VALUES ($1, $2, $3, $4) RETURNING id, amount::text, status`,
    [groupId, userId, input.toUserId, amount]
  );
  const actorName = await userName(pool, userId);
  await notify(pool, {
    recipientId: input.toUserId,
    actorId: userId,
    type: "payment_received",
    title: "Konfirmasi pembayaran",
    body: `${actorName} mencatat pembayaran Rp${Number(amount).toLocaleString("id-ID")}.`,
    entityType: "settlement",
    entityId: result.rows[0].id
  });
  return result.rows[0];
}

export async function confirmSettlement(userId: string, settlementId: string, status: "confirmed" | "cancelled") {
  const result = await pool.query(
    `UPDATE group_settlements SET status = $1, settled_at = now()
     WHERE id = $2 AND to_user_id = $3 AND status = 'pending'
     RETURNING id, from_user_id, amount::text`,
    [status, settlementId, userId]
  );
  if (!result.rowCount) throw notFound("Permintaan pembayaran tidak ditemukan");
  await notify(pool, {
    recipientId: result.rows[0].from_user_id,
    actorId: userId,
    type: `settlement_${status}`,
    title: status === "confirmed" ? "Pembayaran diterima" : "Pembayaran dibatalkan",
    body: `Nominal Rp${Number(result.rows[0].amount).toLocaleString("id-ID")}.`,
    entityType: "settlement",
    entityId: settlementId
  });
  return { id: settlementId, status };
}

export async function listWallets(userId: string) {
  const result = await pool.query(
    `SELECT w.id, w.name, w.description, w.spending_limit::text AS "spendingLimit",
            w.require_approval AS "requireApproval", w.storage_type AS "storageType",
            w.storage_provider AS "storageProvider", w.storage_account_number AS "storageAccountNumber",
            w.storage_account_id AS "storageAccountId", a.name AS "storageAccountName",
            wm.role, wm.status,
            CASE WHEN wm.status = 'accepted' THEN COALESCE(sum(CASE
              WHEN e.status = 'approved' AND e.entry_type = 'deposit' THEN e.amount
              WHEN e.status = 'approved' AND e.entry_type = 'expense' THEN -e.amount ELSE 0 END), 0)
              ELSE 0 END::text AS balance,
            CASE WHEN wm.status = 'accepted'
              THEN count(*) FILTER (WHERE e.status = 'pending')::int ELSE 0 END AS "pendingCount"
     FROM shared_wallets w
     JOIN shared_wallet_members wm ON wm.wallet_id = w.id AND wm.user_id = $1
     LEFT JOIN accounts a ON a.id = w.storage_account_id
     LEFT JOIN shared_wallet_entries e ON e.wallet_id = w.id
     WHERE wm.status IN ('accepted', 'pending')
     GROUP BY w.id, wm.role, wm.status, a.name
     ORDER BY CASE wm.status WHEN 'pending' THEN 0 ELSE 1 END, w.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createWallet(
  userId: string,
  input: {
    name: string;
    description?: string;
    spendingLimit?: unknown;
    requireApproval?: boolean;
    memberIds?: string[];
    adminIds?: string[];
    storageAccountId?: string | null;
    storageType: "cash" | "bank" | "e_wallet" | "other";
    storageProvider?: string;
    storageAccountNumber?: string;
  }
) {
  return withDbTransaction(async (client) => {
    const limit = input.spendingLimit === undefined || input.spendingLimit === ""
      ? null
      : normalizeMoney(input.spendingLimit);
    let storageAccount: { account_type: string; provider_name: string | null; account_number: string | null } | null = null;
    if (input.storageAccountId) {
      const account = await client.query(
        `SELECT account_type, provider_name, account_number
         FROM accounts WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [input.storageAccountId, userId]
      );
      if (!account.rowCount) throw badRequest("Akun sumber dana tidak ditemukan");
      storageAccount = account.rows[0];
      const provider = storageAccount.provider_name || input.storageProvider?.trim();
      const accountNumber = storageAccount.account_number || input.storageAccountNumber?.trim();
      if (storageAccount.account_type !== "cash" && (!provider || !accountNumber)) {
        throw badRequest("Bank/penyedia dan nomor rekening/e-money wajib diisi untuk akun ini");
      }
      if (provider !== storageAccount.provider_name || accountNumber !== storageAccount.account_number) {
        await client.query(
          `UPDATE accounts SET provider_name = $1, account_number = $2, updated_at = now()
           WHERE id = $3 AND user_id = $4`,
          [provider || null, accountNumber || null, input.storageAccountId, userId]
        );
        storageAccount = { ...storageAccount, provider_name: provider || null, account_number: accountNumber || null };
      }
    }
    const wallet = await client.query(
      `INSERT INTO shared_wallets
       (owner_id, name, description, spending_limit, require_approval, storage_account_id,
        storage_type, storage_provider, storage_account_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, storage_type AS "storageType", storage_provider AS "storageProvider",
                 storage_account_number AS "storageAccountNumber"`,
      [
        userId,
        input.name,
        input.description ?? null,
        limit,
        input.requireApproval ?? true,
        input.storageAccountId || null,
        storageAccount?.account_type === "e_wallet" ? "e_wallet" : storageAccount?.account_type === "cash" ? "cash" : storageAccount ? "bank" : input.storageType,
        storageAccount?.provider_name || input.storageProvider || null,
        storageAccount?.account_number || input.storageAccountNumber || null
      ]
    );
    await client.query(
      `INSERT INTO shared_wallet_members (wallet_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'accepted')`,
      [wallet.rows[0].id, userId]
    );
    for (const memberId of [...new Set(input.memberIds ?? [])]) {
      await assertFriend(userId, memberId);
      const privacy = await client.query(
        "SELECT allow_wallet_invites FROM user_privacy_settings WHERE user_id = $1",
        [memberId]
      );
      if (!privacy.rows[0]?.allow_wallet_invites) continue;
      await client.query(
        `INSERT INTO shared_wallet_members (wallet_id, user_id, role, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'pending'`,
        [wallet.rows[0].id, memberId, (input.adminIds ?? []).includes(memberId) ? "admin" : "member"]
      );
      await notify(client, {
        recipientId: memberId,
        actorId: userId,
        type: "wallet_invite",
        title: `Undangan dompet ${input.name}`,
        body: "Terima undangan untuk mulai menggunakan dompet bersama.",
        entityType: "wallet",
        entityId: wallet.rows[0].id
      });
    }
    return wallet.rows[0];
  });
}

async function assertWalletMember(userId: string, walletId: string) {
  const result = await pool.query(
    `SELECT role FROM shared_wallet_members WHERE wallet_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [walletId, userId]
  );
  if (!result.rowCount) throw forbidden("Anda bukan anggota dompet bersama ini");
  return result.rows[0].role as string;
}

export async function addWalletMember(
  userId: string,
  walletId: string,
  input: { userId: string; role: "admin" | "member" | "viewer" }
) {
  const role = await assertWalletMember(userId, walletId);
  if (!["owner", "admin"].includes(role)) throw forbidden("Hanya owner atau admin yang dapat menambah anggota");
  await assertFriend(userId, input.userId);
  const privacy = await pool.query(
    "SELECT allow_wallet_invites FROM user_privacy_settings WHERE user_id = $1",
    [input.userId]
  );
  if (!privacy.rows[0]?.allow_wallet_invites) {
    throw forbidden("Pengguna tidak mengizinkan undangan dompet bersama");
  }
  await pool.query(
    `INSERT INTO shared_wallet_members (wallet_id, user_id, role, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (wallet_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'pending'`,
    [walletId, input.userId, input.role]
  );
  const wallet = await pool.query("SELECT name FROM shared_wallets WHERE id = $1", [walletId]);
  await notify(pool, {
    recipientId: input.userId,
    actorId: userId,
    type: "wallet_invite",
    title: `Undangan dompet ${wallet.rows[0]?.name ?? ""}`,
    body: `Role Anda: ${input.role}. Terima undangan untuk bergabung.`,
    entityType: "wallet",
    entityId: walletId
  });
  return { invited: true, role: input.role, status: "pending" };
}

export async function respondWalletInvite(
  userId: string,
  walletId: string,
  status: "accepted" | "rejected"
) {
  const result = await pool.query(
    `UPDATE shared_wallet_members SET status = $1, joined_at = now()
     WHERE wallet_id = $2 AND user_id = $3 AND status = 'pending'
     RETURNING wallet_id`,
    [status, walletId, userId]
  );
  if (!result.rowCount) throw notFound("Undangan dompet bersama tidak ditemukan");
  return { walletId, status };
}

export async function walletDetail(userId: string, walletId: string) {
  await assertWalletMember(userId, walletId);
  const [wallet, members, entries, memberSummary] = await Promise.all([
    pool.query(
      `SELECT w.id, w.name, w.description, w.spending_limit::text AS "spendingLimit",
              w.require_approval AS "requireApproval", w.storage_type AS "storageType",
              w.storage_provider AS "storageProvider", w.storage_account_number AS "storageAccountNumber",
              w.storage_account_id AS "storageAccountId", a.name AS "storageAccountName",
              COALESCE(sum(CASE WHEN e.status = 'approved' AND e.entry_type = 'deposit'
                THEN e.amount ELSE 0 END), 0)::text AS "totalDeposit",
              COALESCE(sum(CASE WHEN e.status = 'approved' AND e.entry_type = 'expense'
                THEN e.amount ELSE 0 END), 0)::text AS "totalExpense",
              COALESCE(sum(CASE WHEN e.status = 'approved' AND e.entry_type = 'deposit' THEN e.amount
                WHEN e.status = 'approved' AND e.entry_type = 'expense' THEN -e.amount ELSE 0 END), 0)::text AS balance
       FROM shared_wallets w
       LEFT JOIN accounts a ON a.id = w.storage_account_id
       LEFT JOIN shared_wallet_entries e ON e.wallet_id = w.id
       WHERE w.id = $1 GROUP BY w.id, a.name`,
      [walletId]
    ),
    pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.username, u.avatar_url AS "avatarUrl",
              m.role, m.status
       FROM shared_wallet_members m JOIN users u ON u.id = m.user_id
       WHERE m.wallet_id = $1 AND m.status IN ('accepted', 'pending')
       ORDER BY CASE m.status WHEN 'pending' THEN 0 ELSE 1 END, m.role, u.full_name`,
      [walletId]
    ),
    pool.query(
      `SELECT e.id, e.entry_type AS "entryType", e.amount::text, e.description, e.status,
              e.transaction_date::text AS "transactionDate", e.receipt_id AS "receiptId",
              e.created_at AS "createdAt", creator.full_name AS "createdByName",
              approver.full_name AS "approvedByName"
       FROM shared_wallet_entries e
       JOIN users creator ON creator.id = e.created_by
       LEFT JOIN users approver ON approver.id = e.approved_by
       WHERE e.wallet_id = $1 ORDER BY e.transaction_date DESC, e.created_at DESC LIMIT 100`,
      [walletId]
    ),
    pool.query(
      `SELECT u.id AS "userId", u.full_name AS "fullName", m.role,
              COALESCE(sum(CASE WHEN e.status = 'approved' AND e.entry_type = 'deposit'
                THEN e.amount ELSE 0 END), 0)::text AS deposit,
              COALESCE(sum(CASE WHEN e.status = 'approved' AND e.entry_type = 'expense'
                THEN e.amount ELSE 0 END), 0)::text AS expense
       FROM shared_wallet_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN shared_wallet_entries e ON e.wallet_id = m.wallet_id AND e.created_by = m.user_id
       WHERE m.wallet_id = $1 AND m.status = 'accepted'
       GROUP BY u.id, u.full_name, m.role ORDER BY u.full_name`,
      [walletId]
    )
  ]);
  if (!wallet.rowCount) throw notFound("Dompet bersama tidak ditemukan");
  return { ...wallet.rows[0], members: members.rows, entries: entries.rows, memberSummary: memberSummary.rows };
}

export async function createWalletEntry(
  userId: string,
  walletId: string,
  input: {
    entryType: "deposit" | "expense";
    amount: unknown;
    description: string;
    transactionDate: string;
    receiptId?: string | null;
  }
) {
  const role = await assertWalletMember(userId, walletId);
  if (role === "viewer") throw forbidden("Viewer tidak dapat membuat transaksi");
  const wallet = await pool.query(
    `SELECT name, require_approval, spending_limit FROM shared_wallets WHERE id = $1`,
    [walletId]
  );
  const amount = normalizeMoney(input.amount);
  if (input.receiptId) {
    const receipt = await pool.query("SELECT 1 FROM receipts WHERE id = $1 AND user_id = $2", [input.receiptId, userId]);
    if (!receipt.rowCount) throw badRequest("Attachment tidak ditemukan");
  }
  if (input.entryType === "expense" && wallet.rows[0].spending_limit && Number(amount) > Number(wallet.rows[0].spending_limit)) {
    throw forbidden("Nominal melebihi batas pengeluaran dompet");
  }
  const autoApprove = input.entryType === "deposit" || !wallet.rows[0].require_approval || ["owner", "admin"].includes(role);
  const result = await pool.query(
    `INSERT INTO shared_wallet_entries
     (wallet_id, created_by, entry_type, amount, description, transaction_date, receipt_id,
      status, approved_by, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8::varchar, $9,
       CASE WHEN $8::varchar = 'approved' THEN now() ELSE NULL END)
     RETURNING id, entry_type AS "entryType", amount::text, status, transaction_date::text AS "transactionDate"`,
    [walletId, userId, input.entryType, amount, input.description, input.transactionDate,
      input.receiptId || null, autoApprove ? "approved" : "pending", autoApprove ? userId : null]
  );
  if (!autoApprove) {
    const approvers = await pool.query(
      `SELECT user_id FROM shared_wallet_members
       WHERE wallet_id = $1 AND role IN ('owner', 'admin') AND status = 'accepted'`,
      [walletId]
    );
    for (const approver of approvers.rows) {
      await notify(pool, {
        recipientId: approver.user_id,
        actorId: userId,
        type: "wallet_approval",
        title: "Approval transaksi dompet",
        body: input.description,
        entityType: "wallet_entry",
        entityId: result.rows[0].id
      });
    }
  }
  const actor = await userName(pool, userId);
  const members = await pool.query(
    `SELECT wm.user_id, COALESCE(u.preferred_language, 'id') AS language
     FROM shared_wallet_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.wallet_id = $1 AND wm.status = 'accepted' AND wm.user_id <> $2`,
    [walletId, userId]
  );
  const amountLabel = `Rp${Number(amount).toLocaleString("id-ID")}`;
  for (const member of members.rows) {
    const isEnglish = member.language === "en";
    await notify(pool, {
      recipientId: member.user_id,
      actorId: userId,
      type: "wallet_transaction",
      title: input.entryType === "deposit"
        ? (isEnglish ? "💚 Money just landed, bestie!" : "💚 Ada uang masuk, bestie!")
        : (isEnglish ? "🛍️ Shared wallet update!" : "🛍️ Dompet bareng dipakai"),
      body: isEnglish
        ? `${actor} ${input.entryType === "deposit" ? "added" : "spent"} ${amountLabel} in ${wallet.rows[0].name}. ${input.description} ✨`
        : `${actor} ${input.entryType === "deposit" ? "menabung" : "mencatat pengeluaran"} ${amountLabel} di ${wallet.rows[0].name}. ${input.description} ✨`,
      entityType: "wallet",
      entityId: walletId
    });
  }
  return result.rows[0];
}

export async function listWalletReminders(userId: string, walletId: string) {
  await assertWalletMember(userId, walletId);
  const result = await pool.query(
    `SELECT id, interval_type AS "intervalType", reminder_time::text AS "reminderTime",
            day_of_week AS "dayOfWeek", day_of_month AS "dayOfMonth",
            entry_type AS "entryType", message, timezone, is_active AS "isActive"
            , target_user_id AS "targetUserId"
     FROM shared_wallet_reminders
     WHERE wallet_id = $1 AND is_active = true
     ORDER BY reminder_time, created_at`,
    [walletId]
  );
  return result.rows;
}

export async function createWalletReminder(
  userId: string,
  walletId: string,
  input: {
    intervalType: "daily" | "weekly" | "monthly";
    reminderTime: string;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    entryType: "deposit" | "expense";
    message: string;
    targetUserId?: string | null;
    timezone: string;
  }
) {
  const role = await assertWalletMember(userId, walletId);
  if (!["owner", "admin"].includes(role)) throw forbidden("Hanya owner atau admin yang dapat membuat pengingat");
  if (input.targetUserId) {
    const target = await pool.query(
      `SELECT 1 FROM shared_wallet_members
       WHERE wallet_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [walletId, input.targetUserId]
    );
    if (!target.rowCount) throw badRequest("Target pengingat bukan anggota aktif");
  }
  const result = await pool.query(
    `INSERT INTO shared_wallet_reminders
     (wallet_id, created_by, interval_type, reminder_time, day_of_week, day_of_month,
      entry_type, message, timezone, target_user_id)
     VALUES ($1, $2, $3, $4::time, $5, $6, $7, $8, $9, $10)
     RETURNING id, interval_type AS "intervalType", reminder_time::text AS "reminderTime",
               day_of_week AS "dayOfWeek", day_of_month AS "dayOfMonth",
               entry_type AS "entryType", message, timezone, is_active AS "isActive",
               target_user_id AS "targetUserId"`,
    [
      walletId,
      userId,
      input.intervalType,
      input.reminderTime,
      input.intervalType === "weekly" ? input.dayOfWeek : null,
      input.intervalType === "monthly" ? input.dayOfMonth : null,
      input.entryType,
      input.message,
      input.timezone,
      input.targetUserId || null
    ]
  );
  return result.rows[0];
}

export async function approveWalletEntry(userId: string, entryId: string, status: "approved" | "rejected") {
  const entry = await pool.query(
    `SELECT e.id, e.wallet_id, e.created_by, e.description
     FROM shared_wallet_entries e WHERE e.id = $1 AND e.status = 'pending'`,
    [entryId]
  );
  if (!entry.rowCount) throw notFound("Permintaan approval tidak ditemukan");
  const role = await assertWalletMember(userId, entry.rows[0].wallet_id);
  if (!["owner", "admin"].includes(role)) throw forbidden("Hanya owner atau admin yang dapat menyetujui");
  await pool.query(
    `UPDATE shared_wallet_entries SET status = $1, approved_by = $2, approved_at = now(), updated_at = now()
     WHERE id = $3`,
    [status, userId, entryId]
  );
  await notify(pool, {
    recipientId: entry.rows[0].created_by,
    actorId: userId,
    type: `wallet_${status}`,
    title: status === "approved" ? "Transaksi disetujui" : "Transaksi ditolak",
    body: entry.rows[0].description,
    entityType: "wallet_entry",
    entityId: entryId
  });
  return { id: entryId, status };
}

export async function listActivity(userId: string, limit = 20, offset = 0) {
  const result = await pool.query(
    `SELECT e.id, e.event_type AS "eventType", e.title, e.body,
            e.entity_type AS "entityType", e.entity_id AS "entityId",
            e.is_read AS "isRead", e.created_at AS "createdAt",
            actor.full_name AS "actorName", actor.avatar_url AS "actorAvatarUrl"
     FROM social_events e LEFT JOIN users actor ON actor.id = e.actor_id
     WHERE e.recipient_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function markActivityRead(userId: string, eventId?: string) {
  await pool.query(
    `UPDATE social_events SET is_read = true
     WHERE recipient_id = $1 AND ($2::uuid IS NULL OR id = $2)`,
    [userId, eventId ?? null]
  );
  return { updated: true };
}

export async function getPrivacy(userId: string) {
  const result = await pool.query(
    `SELECT allow_wallet_invites AS "allowWalletInvites", allow_group_invites AS "allowGroupInvites",
            searchable_by AS "searchableBy", hide_phone AS "hidePhone"
     FROM user_privacy_settings WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

export async function updatePrivacy(
  userId: string,
  input: { allowWalletInvites: boolean; allowGroupInvites: boolean; searchableBy: string; hidePhone: boolean }
) {
  const result = await pool.query(
    `INSERT INTO user_privacy_settings
      (user_id, allow_wallet_invites, allow_group_invites, searchable_by, hide_phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       allow_wallet_invites = EXCLUDED.allow_wallet_invites,
       allow_group_invites = EXCLUDED.allow_group_invites,
       searchable_by = EXCLUDED.searchable_by,
       hide_phone = EXCLUDED.hide_phone,
       updated_at = now()
     RETURNING allow_wallet_invites AS "allowWalletInvites", allow_group_invites AS "allowGroupInvites",
               searchable_by AS "searchableBy", hide_phone AS "hidePhone"`,
    [userId, input.allowWalletInvites, input.allowGroupInvites, input.searchableBy, input.hidePhone]
  );
  return result.rows[0];
}

async function canAccessCommentEntity(userId: string, entityType: string, entityId: string) {
  if (entityType === "group") return assertGroupMember(pool, userId, entityId);
  if (entityType === "group_expense") {
    const result = await pool.query(
      `SELECT e.group_id FROM group_expenses e
       JOIN financial_group_members gm ON gm.group_id = e.group_id
       WHERE e.id = $1 AND gm.user_id = $2 AND gm.status = 'accepted'`,
      [entityId, userId]
    );
    if (!result.rowCount) throw forbidden("Anda tidak dapat mengakses diskusi ini");
    return;
  }
  if (entityType === "wallet_entry") {
    const result = await pool.query(
      `SELECT e.wallet_id FROM shared_wallet_entries e
       JOIN shared_wallet_members wm ON wm.wallet_id = e.wallet_id
       WHERE e.id = $1 AND wm.user_id = $2 AND wm.status = 'accepted'`,
      [entityId, userId]
    );
    if (!result.rowCount) throw forbidden("Anda tidak dapat mengakses diskusi ini");
    return;
  }
  if (entityType === "transaction") {
    const result = await pool.query(
      `SELECT 1 FROM transactions t LEFT JOIN transaction_viewers v ON v.transaction_id = t.id
       WHERE t.id = $1 AND (t.user_id = $2 OR v.user_id = $2)`,
      [entityId, userId]
    );
    if (!result.rowCount) throw forbidden("Anda tidak dapat mengakses diskusi ini");
    return;
  }
  throw badRequest("Jenis komentar belum didukung");
}

export async function listComments(userId: string, entityType: string, entityId: string) {
  await canAccessCommentEntity(userId, entityType, entityId);
  const result = await pool.query(
    `SELECT c.id, c.message, c.created_at AS "createdAt",
            u.id AS "authorId", u.full_name AS "authorName", u.avatar_url AS "avatarUrl"
     FROM social_comments c JOIN users u ON u.id = c.author_id
     WHERE c.entity_type = $1 AND c.entity_id = $2 ORDER BY c.created_at`,
    [entityType, entityId]
  );
  return result.rows;
}

export async function addComment(userId: string, entityType: string, entityId: string, message: string) {
  await canAccessCommentEntity(userId, entityType, entityId);
  const result = await pool.query(
    `INSERT INTO social_comments (author_id, entity_type, entity_id, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, message, created_at AS "createdAt"`,
    [userId, entityType, entityId, message]
  );
  return result.rows[0];
}
