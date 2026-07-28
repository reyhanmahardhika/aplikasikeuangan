import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { normalizeMoney } from "../utils/money.js";
import { writeAuditLog } from "./auditService.js";
import { getCurrentGoldPriceInfo, syncGoldPrice } from "./goldPriceService.js";
import { sendPushToUser } from "./pushNotificationService.js";

type WalletMemberRole = "owner" | "admin" | "member" | "viewer";
type WalletMemberStatus = "accepted" | "pending" | "rejected" | "removed";

type WalletUpdateInput = {
  name?: string;
  description?: string;
  spendingLimit?: unknown;
  requireApproval?: boolean;
  storageAccountId?: string | null;
  storageType?: "cash" | "bank" | "e_wallet" | "gold" | "other";
  storageProvider?: string;
  storageAccountNumber?: string;
  expenseSplitRule?: "equal" | "percentage" | "manual";
  activeUntil?: string | null;
};

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
  }).catch((error) => console.error("Wallet social push failed", error));
}

async function userName(db: DbClient, userId: string) {
  const result = await db.query("SELECT full_name FROM users WHERE id = $1", [userId]);
  if (!result.rowCount) throw notFound("Pengguna tidak ditemukan");
  return result.rows[0].full_name as string;
}

async function assertWalletMember(db: DbClient, userId: string, walletId: string) {
  const result = await db.query(
    `SELECT role FROM shared_wallet_members
     WHERE wallet_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [walletId, userId]
  );
  if (!result.rowCount) throw forbidden("Anda bukan anggota dompet bersama ini");
  return result.rows[0].role as WalletMemberRole;
}

async function getAcceptedWalletMemberIds(db: DbClient, walletId: string, excludeIds: string[] = []) {
  const result = await db.query<{ user_id: string }>(
    `SELECT user_id
     FROM shared_wallet_members
     WHERE wallet_id = $1
       AND status = 'accepted'
       AND NOT (user_id = ANY($2::uuid[]))`,
    [walletId, excludeIds]
  );
  return result.rows.map((row) => row.user_id);
}

async function notifyWalletMembers(
  db: DbClient,
  input: {
    walletId: string;
    actorId: string;
    type: string;
    title: string;
    body: string;
    excludeIds?: string[];
  }
) {
  const recipients = await getAcceptedWalletMemberIds(db, input.walletId, input.excludeIds ?? []);
  for (const recipientId of recipients) {
    await notify(db, {
      recipientId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: "wallet",
      entityId: input.walletId
    });
  }
}

async function resolveStorageInput(
  client: DbClient,
  userId: string,
  currentWallet: Record<string, any>,
  input: WalletUpdateInput
) {
  type StorageAccount = {
    account_type: string;
    provider_name: string | null;
    account_number: string | null;
  };

  let storageType = input.storageType ?? currentWallet.storage_type;
  let storageProvider = input.storageProvider ?? currentWallet.storage_provider;
  let storageAccountNumber = input.storageAccountNumber ?? currentWallet.storage_account_number;
  let storageAccountId = input.storageAccountId !== undefined ? input.storageAccountId : currentWallet.storage_account_id;

  if (input.storageAccountId !== undefined) {
    if (input.storageAccountId) {
      const accountResult = await client.query<StorageAccount>(
        `SELECT account_type, provider_name, account_number
         FROM accounts
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [input.storageAccountId, userId]
      );

      const account = accountResult.rows[0];
      if (!account) throw badRequest("Akun sumber dana tidak ditemukan");

      const provider = account.provider_name || input.storageProvider?.trim() || null;
      const accountNumber = account.account_number || input.storageAccountNumber?.trim() || null;

      if (account.account_type !== "cash" && (!provider || !accountNumber)) {
        throw badRequest("Bank/penyedia dan nomor rekening/e-money wajib diisi untuk akun ini");
      }

      if (provider !== account.provider_name || accountNumber !== account.account_number) {
        await client.query(
          `UPDATE accounts
           SET provider_name = $1, account_number = $2, updated_at = now()
           WHERE id = $3 AND user_id = $4`,
          [provider, accountNumber, input.storageAccountId, userId]
        );
      }

      storageType = account.account_type === "e_wallet" ? "e_wallet"
        : account.account_type === "cash" ? "cash"
        : "bank";
      storageProvider = provider;
      storageAccountNumber = accountNumber;
      storageAccountId = input.storageAccountId;
    } else {
      storageAccountId = null;
      storageProvider = input.storageProvider ?? null;
      storageAccountNumber = input.storageAccountNumber ?? null;
    }
  }

  return { storageType, storageProvider, storageAccountNumber, storageAccountId };
}

function normalizeWalletUpdatePayload(wallet: Record<string, any>, input: WalletUpdateInput, storage: Awaited<ReturnType<typeof resolveStorageInput>>) {
  const nextLimit = input.spendingLimit === undefined || input.spendingLimit === ""
    ? wallet.spending_limit
    : normalizeMoney(input.spendingLimit);

  return {
    name: input.name ?? wallet.name,
    description: input.description ?? wallet.description,
    spendingLimit: nextLimit,
    requireApproval: input.requireApproval ?? wallet.require_approval,
    storageAccountId: storage.storageAccountId,
    storageType: storage.storageType,
    storageProvider: storage.storageProvider,
    storageAccountNumber: storage.storageAccountNumber,
    expenseSplitRule: input.expenseSplitRule ?? wallet.expense_split_rule ?? "equal",
    activeUntil: input.activeUntil === undefined ? wallet.active_until : input.activeUntil
  };
}

function buildWalletChangeTitle(payload: ReturnType<typeof normalizeWalletUpdatePayload>) {
  return `Perubahan dompet: ${payload.name}`;
}

async function applyWalletSettingsChange(
  client: DbClient,
  walletId: string,
  payload: ReturnType<typeof normalizeWalletUpdatePayload>
) {
  const updated = await client.query(
    `UPDATE shared_wallets
     SET name = $2,
         description = $3,
         spending_limit = $4,
         require_approval = $5,
         storage_account_id = $6,
         storage_type = $7,
         storage_provider = $8,
         storage_account_number = $9,
         expense_split_rule = $10,
         active_until = $11,
         updated_at = now()
     WHERE id = $1
     RETURNING id,
               name,
               description,
               spending_limit::text AS "spendingLimit",
               require_approval AS "requireApproval",
               storage_type AS "storageType",
               storage_provider AS "storageProvider",
               storage_account_number AS "storageAccountNumber",
               storage_account_id AS "storageAccountId",
               expense_split_rule AS "expenseSplitRule",
               active_until AS "activeUntil"`,
    [
      walletId,
      payload.name,
      payload.description,
      payload.spendingLimit,
      payload.requireApproval,
      payload.storageAccountId,
      payload.storageType,
      payload.storageProvider,
      payload.storageAccountNumber,
      payload.expenseSplitRule,
      payload.activeUntil
    ]
  );
  return updated.rows[0];
}

async function createWalletSettingsChangeRequest(
  client: DbClient,
  userId: string,
  walletId: string,
  payload: ReturnType<typeof normalizeWalletUpdatePayload>
) {
  const totalMembersResult = await client.query<{ total: number }>(
    `SELECT count(*)::int AS total
     FROM shared_wallet_members
     WHERE wallet_id = $1 AND status = 'accepted'`,
    [walletId]
  );
  const totalMembers = totalMembersResult.rows[0]?.total ?? 1;
  const requiredApprovals = Math.max(1, Math.floor(totalMembers / 2) + 1);

  const created = await client.query(
    `INSERT INTO shared_wallet_change_requests
      (wallet_id, requested_by, title, change_payload, required_approvals, approved_count)
     VALUES ($1, $2, $3, $4::jsonb, $5, 1)
     RETURNING id, status, required_approvals AS "requiredApprovals",
               approved_count AS "approvedCount", rejected_count AS "rejectedCount",
               created_at AS "createdAt"`,
    [walletId, userId, buildWalletChangeTitle(payload), JSON.stringify(payload), requiredApprovals]
  );

  await client.query(
    `INSERT INTO shared_wallet_change_approvals (request_id, user_id, decision, comment)
     VALUES ($1, $2, 'approved', 'Pengusul perubahan')`,
    [created.rows[0].id, userId]
  );

  return { ...created.rows[0], payload };
}

export async function updateWallet(userId: string, walletId: string, input: WalletUpdateInput) {
  return withDbTransaction(async (client) => {
    const role = await assertWalletMember(client, userId, walletId);
    if (!["owner", "admin"].includes(role)) throw forbidden("Hanya owner atau admin yang dapat mengedit dompet");

    const current = await client.query(`SELECT * FROM shared_wallets WHERE id = $1`, [walletId]);
    if (!current.rowCount) throw notFound("Dompet bersama tidak ditemukan");

    const wallet = current.rows[0];
    const storage = await resolveStorageInput(client, userId, wallet, input);
    const payload = normalizeWalletUpdatePayload(wallet, input, storage);

    const acceptedMembers = await client.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM shared_wallet_members
       WHERE wallet_id = $1 AND status = 'accepted'`,
      [walletId]
    );
    const memberCount = acceptedMembers.rows[0]?.total ?? 1;

    if (memberCount > 1) {
      const request = await createWalletSettingsChangeRequest(client, userId, walletId, payload);
      const actor = await userName(client, userId);
      await notifyWalletMembers(client, {
        walletId,
        actorId: userId,
        type: "wallet_change_requested",
        title: "Perubahan dompet menunggu persetujuan",
        body: `${actor} mengusulkan perubahan pengaturan dompet. Minimal ${request.requiredApprovals} persetujuan diperlukan.`,
        excludeIds: [userId]
      });
      await writeAuditLog(client, {
        userId,
        action: "REQUEST_WALLET_CHANGE",
        entityName: "SharedWalletChangeRequest",
        entityId: request.id,
        previousValue: wallet,
        newValue: request.payload
      });
      return {
        pendingApproval: true,
        message: "Perubahan besar menunggu persetujuan mayoritas anggota.",
        request
      };
    }

    const updated = await applyWalletSettingsChange(client, walletId, payload);
    await writeAuditLog(client, {
      userId,
      action: "UPDATE",
      entityName: "SharedWallet",
      entityId: walletId,
      previousValue: wallet,
      newValue: updated
    });
    return updated;
  });
}

export async function updateWalletMember(
  userId: string,
  walletId: string,
  targetUserId: string,
  input: {
    role?: "admin" | "member" | "viewer";
    status?: WalletMemberStatus;
    displayName?: string;
    memberNote?: string | null;
  }
) {
  return withDbTransaction(async (client) => {
    const selfResponseOnly = targetUserId === userId
      && !!input.status
      && !input.role
      && input.displayName === undefined
      && input.memberNote === undefined;

    const actorRole = selfResponseOnly ? null : await assertWalletMember(client, userId, walletId);
    if (!selfResponseOnly && actorRole && !["owner", "admin"].includes(actorRole)) {
      throw forbidden("Hanya owner atau admin yang dapat mengubah anggota");
    }

    const member = await client.query(
      `SELECT role, status, display_name AS "displayName", member_note AS "memberNote"
       FROM shared_wallet_members
       WHERE wallet_id = $1 AND user_id = $2`,
      [walletId, targetUserId]
    );
    if (!member.rowCount) throw notFound("Anggota tidak ditemukan");

    if (member.rows[0].role === "owner" && input.role) {
      throw forbidden("Role owner tidak dapat diubah");
    }

    if (selfResponseOnly && member.rows[0].status !== "pending") {
      throw badRequest("Undangan anggota ini tidak menunggu respons");
    }

    const newRole = input.role ?? member.rows[0].role;
    const newStatus = input.status ?? member.rows[0].status;
    const displayName = input.displayName === undefined ? member.rows[0].displayName : input.displayName || null;
    const memberNote = input.memberNote === undefined ? member.rows[0].memberNote : input.memberNote || null;

    const result = await client.query(
      `UPDATE shared_wallet_members
       SET role = $1,
           status = $2,
           display_name = $3,
           member_note = $4,
           updated_at = now(),
           joined_at = CASE
             WHEN $2 = 'accepted' AND status <> 'accepted' THEN now()
             ELSE joined_at
           END
       WHERE wallet_id = $5 AND user_id = $6
       RETURNING role, status, display_name AS "displayName", member_note AS "memberNote"`,
      [newRole, newStatus, displayName, memberNote, walletId, targetUserId]
    );

    const actor = await userName(client, userId);
    const wallet = await client.query("SELECT name FROM shared_wallets WHERE id = $1", [walletId]);
    const targetName = await userName(client, targetUserId);

    await writeAuditLog(client, {
      userId,
      action: "UPDATE_MEMBER",
      entityName: "SharedWalletMember",
      entityId: walletId,
      previousValue: member.rows[0],
      newValue: { userId: targetUserId, ...result.rows[0] }
    });

    await notifyWalletMembers(client, {
      walletId,
      actorId: userId,
      type: "wallet_member_updated",
      title: "Daftar anggota dompet diperbarui",
      body: `${actor} memperbarui data anggota ${targetName} di ${wallet.rows[0]?.name ?? "dompet bersama"}.`,
      excludeIds: []
    });

    if (input.status && input.status !== member.rows[0].status) {
      await notify(client, {
        recipientId: targetUserId,
        actorId: userId,
        type: input.status === "accepted" ? "wallet_accepted" : "wallet_rejected",
        title: input.status === "accepted" ? "Anda bergabung ke dompet bersama" : "Perubahan keanggotaan dompet",
        body: `${wallet.rows[0]?.name ?? "Dompet bersama"} sekarang berstatus ${input.status}.`,
        entityType: "wallet",
        entityId: walletId
      });
    }

    return result.rows[0];
  });
}

export async function removeWalletMember(userId: string, walletId: string, targetUserId: string) {
  return withDbTransaction(async (client) => {
    const role = await assertWalletMember(client, userId, walletId);
    if (!["owner", "admin"].includes(role)) throw forbidden("Hanya owner atau admin yang dapat menghapus anggota");

    const targetMember = await client.query(
      `SELECT role
       FROM shared_wallet_members
       WHERE wallet_id = $1 AND user_id = $2`,
      [walletId, targetUserId]
    );
    if (!targetMember.rowCount) throw notFound("Anggota tidak ditemukan");
    if (targetMember.rows[0].role === "owner") {
      throw forbidden("Anda tidak dapat menghapus owner dari dompet");
    }

    await client.query(
      `DELETE FROM shared_wallet_members
       WHERE wallet_id = $1 AND user_id = $2`,
      [walletId, targetUserId]
    );

    const actor = await userName(client, userId);
    const targetName = await userName(client, targetUserId);
    const wallet = await client.query("SELECT name FROM shared_wallets WHERE id = $1", [walletId]);

    await writeAuditLog(client, {
      userId,
      action: "REMOVE_MEMBER",
      entityName: "SharedWalletMember",
      entityId: walletId,
      previousValue: { userId: targetUserId, role: targetMember.rows[0].role },
      newValue: null
    });

    await notifyWalletMembers(client, {
      walletId,
      actorId: userId,
      type: "wallet_member_removed",
      title: "Anggota dompet dihapus",
      body: `${actor} menghapus ${targetName} dari ${wallet.rows[0]?.name ?? "dompet bersama"}.`
    });

    await notify(client, {
      recipientId: targetUserId,
      actorId: userId,
      type: "wallet_removed",
      title: "Dihapus dari dompet bersama",
      body: `Anda telah dihapus dari ${wallet.rows[0]?.name ?? "dompet bersama"}.`,
      entityType: "wallet",
      entityId: walletId
    });

    return { removed: true };
  });
}

export async function listWalletChangeRequests(userId: string, walletId: string) {
  await assertWalletMember(pool, userId, walletId);
  const requests = await pool.query(
    `SELECT r.id,
            r.title,
            r.status,
            r.required_approvals AS "requiredApprovals",
            r.approved_count AS "approvedCount",
            r.rejected_count AS "rejectedCount",
            r.change_payload AS payload,
            r.created_at AS "createdAt",
            r.updated_at AS "updatedAt",
            r.applied_at AS "appliedAt",
            u.full_name AS "requestedByName",
            EXISTS (
              SELECT 1
              FROM shared_wallet_change_approvals a
              WHERE a.request_id = r.id
                AND a.user_id = $2
            ) AS "hasReviewed"
     FROM shared_wallet_change_requests r
     JOIN users u ON u.id = r.requested_by
     WHERE r.wallet_id = $1
     ORDER BY r.created_at DESC`,
    [walletId, userId]
  );
  return requests.rows;
}

export async function reviewWalletChangeRequest(
  userId: string,
  walletId: string,
  requestId: string,
  input: { decision: "approved" | "rejected"; comment?: string }
) {
  return withDbTransaction(async (client) => {
    await assertWalletMember(client, userId, walletId);

    const requestResult = await client.query(
      `SELECT r.*, w.name AS wallet_name
       FROM shared_wallet_change_requests r
       JOIN shared_wallets w ON w.id = r.wallet_id
       WHERE r.id = $1 AND r.wallet_id = $2
       FOR UPDATE`,
      [requestId, walletId]
    );
    if (!requestResult.rowCount) throw notFound("Permintaan perubahan tidak ditemukan");

    const changeRequest = requestResult.rows[0];
    if (changeRequest.status !== "pending") {
      throw badRequest("Permintaan perubahan ini sudah selesai diproses");
    }
    if (changeRequest.requested_by === userId) {
      throw badRequest("Pengusul tidak perlu meninjau permintaannya sendiri");
    }

    const existingDecision = await client.query(
      `SELECT 1 FROM shared_wallet_change_approvals
       WHERE request_id = $1 AND user_id = $2`,
      [requestId, userId]
    );
    if (existingDecision.rowCount) throw badRequest("Anda sudah meninjau permintaan ini");

    await client.query(
      `INSERT INTO shared_wallet_change_approvals (request_id, user_id, decision, comment)
       VALUES ($1, $2, $3, $4)`,
      [requestId, userId, input.decision, input.comment ?? null]
    );

    const summary = await client.query<{ approved: number; rejected: number; total: number }>(
      `SELECT
         count(*) FILTER (WHERE decision = 'approved')::int AS approved,
         count(*) FILTER (WHERE decision = 'rejected')::int AS rejected,
         count(*)::int AS total
       FROM shared_wallet_change_approvals
       WHERE request_id = $1`,
      [requestId]
    );

    const approvedCount = summary.rows[0]?.approved ?? 0;
    const rejectedCount = summary.rows[0]?.rejected ?? 0;
    const totalMembersResult = await client.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM shared_wallet_members
       WHERE wallet_id = $1 AND status = 'accepted'`,
      [walletId]
    );
    const totalMembers = totalMembersResult.rows[0]?.total ?? 1;
    const rejectionThreshold = totalMembers - changeRequest.required_approvals + 1;

    let nextStatus = "pending";
    let appliedWallet: Record<string, unknown> | null = null;

    if (approvedCount >= changeRequest.required_approvals) {
      appliedWallet = await applyWalletSettingsChange(client, walletId, changeRequest.change_payload);
      nextStatus = "applied";
    } else if (rejectedCount >= rejectionThreshold) {
      nextStatus = "rejected";
    }

    await client.query(
      `UPDATE shared_wallet_change_requests
       SET approved_count = $2,
           rejected_count = $3,
           status = $4,
           updated_at = now(),
           resolved_at = CASE WHEN $4 <> 'pending' THEN now() ELSE resolved_at END,
           applied_at = CASE WHEN $4 = 'applied' THEN now() ELSE applied_at END
       WHERE id = $1`,
      [requestId, approvedCount, rejectedCount, nextStatus]
    );

    const actor = await userName(client, userId);
    if (nextStatus === "applied") {
      await notifyWalletMembers(client, {
        walletId,
        actorId: userId,
        type: "wallet_change_applied",
        title: "Perubahan dompet disetujui",
        body: `Perubahan pengaturan ${changeRequest.wallet_name} telah disetujui mayoritas anggota.`
      });
      await writeAuditLog(client, {
        userId,
        action: "APPLY_WALLET_CHANGE",
        entityName: "SharedWalletChangeRequest",
        entityId: requestId,
        previousValue: changeRequest.change_payload,
        newValue: appliedWallet
      });
    } else if (nextStatus === "rejected") {
      await notifyWalletMembers(client, {
        walletId,
        actorId: userId,
        type: "wallet_change_rejected",
        title: "Perubahan dompet ditolak",
        body: `Perubahan pengaturan ${changeRequest.wallet_name} ditolak setelah peninjauan anggota.`
      });
      await writeAuditLog(client, {
        userId,
        action: "REJECT_WALLET_CHANGE",
        entityName: "SharedWalletChangeRequest",
        entityId: requestId,
        previousValue: changeRequest.change_payload,
        newValue: { decisionBy: actor, decision: "rejected" }
      });
    }

    return {
      id: requestId,
      status: nextStatus,
      approvedCount,
      rejectedCount
    };
  });
}

export async function listGoldPrices(limit = 30) {
  const result = await pool.query(
    `SELECT id,
            price_per_gram AS "pricePerGram",
            source,
            fetched_at AS "fetchedAt",
            valid_until AS "validUntil",
            created_at AS "createdAt"
     FROM gold_prices
     ORDER BY fetched_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getCurrentGoldPrice() {
  try {
    return await getCurrentGoldPriceInfo();
  } catch {
    throw badRequest("Gagal mengambil harga emas terkini");
  }
}

export async function syncGoldPriceNow() {
  return syncGoldPrice(true);
}
