import { pool, withDbTransaction, type DbClient } from "../db/pool.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors.js";
import { fromCents, normalizeMoney, normalizeNonNegativeMoney, toCents } from "../utils/money.js";
import { writeAuditLog } from "./auditService.js";
import { sendPushToUser } from "./pushNotificationService.js";

type Visibility = "private" | "summary_only" | "shared";

type PrivacyInput = Partial<{
  incomeVisibility: Visibility;
  expenseVisibility: Visibility;
  accountsVisibility: Visibility;
  transactionsVisibility: Visibility;
  assetsVisibility: Visibility;
  liabilitiesVisibility: Visibility;
  investmentsVisibility: Visibility;
  goalsVisibility: Visibility;
}>;

type CreateRelationshipInput = {
  partnerUserId: string;
  workspaceName: string;
  relationshipType: "partner" | "married_couple" | "family";
  privacy?: PrivacyInput;
};

type GoalInput = {
  name: string;
  goalType?: "wedding" | "home" | "vehicle" | "vacation" | "education" | "emergency_fund" | "investment" | "business" | "retirement" | "custom";
  icon?: string;
  targetAmount: string | number;
  currentAmount?: string | number;
  deadline?: string | null;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "active" | "completed" | "paused" | "cancelled";
  description?: string | null;
  trackingMode?: "contribution" | "linked_account";
  linkedAccountId?: string | null;
};

type GoalContributionInput = {
  amount: string | number;
  contributionDate?: string | null;
  contributorUserId?: string | null;
  sourceType?: "manual" | "transaction" | "linked_account" | "shared_wallet" | "scheduled" | "income_allocation" | "adjustment";
  accountId?: string | null;
  transactionId?: string | null;
  sharedWalletEntryId?: string | null;
  notes?: string | null;
  status?: "pending" | "completed" | "cancelled";
  adjustmentReason?: string | null;
};

function moneyNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeSignedMoney(value: unknown) {
  const raw = String(value ?? "").trim();
  const negative = raw.startsWith("-");
  const absoluteRaw = negative ? raw.slice(1) : raw;
  const normalized = normalizeNonNegativeMoney(absoluteRaw);
  const cents = toCents(normalized);
  return fromCents(negative ? -cents : cents);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function monthsUntil(deadline?: string | null) {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(months, 0);
}

function mapPrivacy(input?: PrivacyInput) {
  return {
    income: input?.incomeVisibility ?? "summary_only",
    expense: input?.expenseVisibility ?? "summary_only",
    accounts: input?.accountsVisibility ?? "private",
    transactions: input?.transactionsVisibility ?? "private",
    assets: input?.assetsVisibility ?? "summary_only",
    liabilities: input?.liabilitiesVisibility ?? "summary_only",
    investments: input?.investmentsVisibility ?? "private",
    goals: input?.goalsVisibility ?? "shared"
  };
}

async function userName(db: DbClient, userId: string) {
  const result = await db.query("SELECT full_name FROM users WHERE id = $1", [userId]);
  if (!result.rowCount) throw notFound("Pengguna tidak ditemukan");
  return result.rows[0].full_name as string;
}

async function notify(db: DbClient, input: {
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  body?: string;
  relationshipId: string;
}) {
  if (input.recipientId === input.actorId) return;
  await db.query(
    `INSERT INTO social_events (recipient_id, actor_id, event_type, title, body, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, 'relationship_finance', $6)`,
    [input.recipientId, input.actorId, input.type, input.title, input.body ?? null, input.relationshipId]
  );
  void sendPushToUser(input.recipientId, {
    title: input.title,
    body: input.body,
    url: `/?view=social&relationshipId=${input.relationshipId}`,
    tag: `${input.type}-${input.relationshipId}`
  }).catch((error) => console.error("Relationship Finance push failed", error));
}

async function timeline(db: DbClient, relationshipId: string, actorUserId: string | null, eventType: string, entityType?: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await db.query(
    `INSERT INTO relationship_timeline_events
      (relationship_finance_id, actor_user_id, event_type, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [relationshipId, actorUserId, eventType, entityType ?? null, entityId ?? null, JSON.stringify(metadata)]
  );
}

async function assertMember(db: DbClient, userId: string, relationshipId: string) {
  const result = await db.query(
    `SELECT m.role, m.status, rf.status AS "workspaceStatus"
     FROM relationship_finance_members m
     JOIN relationship_finances rf ON rf.id = m.relationship_finance_id
     WHERE m.relationship_finance_id = $1 AND m.user_id = $2`,
    [relationshipId, userId]
  );
  const row = result.rows[0];
  if (!row) throw forbidden("Anda tidak memiliki akses ke Relationship Finance ini");
  if (row.status !== "accepted") throw forbidden("Relationship Finance belum aktif untuk akun Anda");
  return row as { role: "owner" | "partner"; status: string; workspaceStatus: string };
}

async function assertAcceptedRelationshipUser(db: DbClient, relationshipId: string, userId: string) {
  const result = await db.query(
    `SELECT 1 FROM relationship_finance_members
     WHERE relationship_finance_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [relationshipId, userId]
  );
  if (!result.rowCount) throw badRequest("Kontributor harus anggota aktif Relationship Finance");
}

async function assertGoal(db: DbClient, relationshipId: string, goalId: string) {
  const result = await db.query(
    `SELECT id, tracking_mode AS "trackingMode"
     FROM relationship_goals
     WHERE id = $1 AND relationship_finance_id = $2`,
    [goalId, relationshipId]
  );
  if (!result.rowCount) throw notFound("Goal tidak ditemukan");
  return result.rows[0] as { id: string; trackingMode: "contribution" | "linked_account" };
}

async function validateLinkedAccount(db: DbClient, relationshipId: string, accountId: string, exceptGoalId?: string) {
  const result = await db.query(
    `SELECT a.id
     FROM accounts a
     JOIN relationship_finance_members m ON m.user_id = a.user_id
     WHERE a.id = $1
       AND m.relationship_finance_id = $2
       AND m.status = 'accepted'
       AND a.is_active = true`,
    [accountId, relationshipId]
  );
  if (!result.rowCount) throw badRequest("Akun tertaut harus milik anggota aktif Relationship Finance");
  const used = await db.query(
    `SELECT id FROM relationship_goals
     WHERE linked_account_id = $1
       AND tracking_mode = 'linked_account'
       AND status = 'active'
       AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [accountId, exceptGoalId ?? null]
  );
  if (used.rowCount) throw conflict("Akun ini sudah dipakai oleh goal aktif lain");
}

async function ensureAcceptedFriend(db: DbClient, userId: string, partnerUserId: string) {
  const result = await db.query(
    `SELECT 1 FROM friendships
     WHERE status = 'accepted'
       AND LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
    [userId, partnerUserId]
  );
  if (!result.rowCount) throw badRequest("Partner harus sudah menjadi teman aktif");
}

async function ensureNoActiveRelationship(db: DbClient, userId: string, partnerUserId: string) {
  const result = await db.query(
    `SELECT 1 FROM relationship_finance_invitations
     WHERE status IN ('pending', 'accepted')
       AND LEAST(inviter_id, invitee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(inviter_id, invitee_id) = GREATEST($1::uuid, $2::uuid)
     LIMIT 1`,
    [userId, partnerUserId]
  );
  if (result.rowCount) throw conflict("Relationship Finance dengan partner ini sudah ada atau sedang menunggu persetujuan");
}

export async function listRelationshipFinances(userId: string) {
  const result = await pool.query(
    `SELECT rf.id, rf.workspace_name AS "workspaceName", rf.relationship_type AS "relationshipType",
            rf.status, rf.accepted_at AS "acceptedAt", rf.created_at AS "createdAt",
            m.role, partner.id AS "partnerUserId", partner.full_name AS "partnerName",
            partner.username AS "partnerUsername", partner.avatar_url AS "partnerAvatarUrl",
            inv.id AS "invitationId", inv.status AS "invitationStatus",
            inv.invitee_id = $1 AS "incomingInvitation"
     FROM relationship_finance_members m
     JOIN relationship_finances rf ON rf.id = m.relationship_finance_id
     LEFT JOIN relationship_finance_members pm
       ON pm.relationship_finance_id = rf.id AND pm.user_id <> $1
     LEFT JOIN users partner ON partner.id = pm.user_id
     LEFT JOIN relationship_finance_invitations inv ON inv.relationship_finance_id = rf.id
     WHERE m.user_id = $1 AND m.status <> 'removed'
     ORDER BY rf.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRelationshipFinance(userId: string, input: CreateRelationshipInput) {
  if (userId === input.partnerUserId) throw badRequest("Partner tidak boleh akun sendiri");
  return withDbTransaction(async (client) => {
    await ensureAcceptedFriend(client, userId, input.partnerUserId);
    await ensureNoActiveRelationship(client, userId, input.partnerUserId);

    const workspace = await client.query(
      `INSERT INTO relationship_finances (workspace_name, relationship_type, status, created_by)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id, workspace_name AS "workspaceName", relationship_type AS "relationshipType", status, created_at AS "createdAt"`,
      [input.workspaceName, input.relationshipType, userId]
    );
    const relationshipId = workspace.rows[0].id as string;
    await client.query(
      `INSERT INTO relationship_finance_members (relationship_finance_id, user_id, role, status, joined_at)
       VALUES ($1, $2, 'owner', 'accepted', now()), ($1, $3, 'partner', 'pending', NULL)`,
      [relationshipId, userId, input.partnerUserId]
    );
    const privacy = mapPrivacy(input.privacy);
    await client.query(
      `INSERT INTO relationship_finance_privacy_settings
        (relationship_finance_id, user_id, income_visibility, expense_visibility, accounts_visibility,
         transactions_visibility, assets_visibility, liabilities_visibility, investments_visibility, goals_visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [relationshipId, userId, privacy.income, privacy.expense, privacy.accounts, privacy.transactions, privacy.assets, privacy.liabilities, privacy.investments, privacy.goals]
    );
    await client.query(
      `INSERT INTO relationship_finance_privacy_settings (relationship_finance_id, user_id)
       VALUES ($1, $2)`,
      [relationshipId, input.partnerUserId]
    );
    const invitation = await client.query(
      `INSERT INTO relationship_finance_invitations (relationship_finance_id, inviter_id, invitee_id)
       VALUES ($1, $2, $3)
       RETURNING id, status, expires_at AS "expiresAt"`,
      [relationshipId, userId, input.partnerUserId]
    );
    await timeline(client, relationshipId, userId, "workspace_created", "relationship_finance", relationshipId, { workspaceName: input.workspaceName });
    await timeline(client, relationshipId, userId, "invitation_sent", "relationship_invitation", invitation.rows[0].id, { partnerUserId: input.partnerUserId });
    await writeAuditLog(client, { userId, action: "CREATE", entityName: "RelationshipFinance", entityId: relationshipId, newValue: input });
    const actorName = await userName(client, userId);
    await notify(client, {
      recipientId: input.partnerUserId,
      actorId: userId,
      type: "relationship_invitation",
      title: "Undangan Relationship Finance",
      body: `${actorName} mengundang Anda mengelola keuangan bersama.`,
      relationshipId
    });
    return { ...workspace.rows[0], invitation: invitation.rows[0] };
  });
}

export async function respondRelationshipInvitation(userId: string, invitationId: string, action: "accept" | "decline" | "cancel") {
  return withDbTransaction(async (client) => {
    const current = await client.query(
      `SELECT inv.*, rf.status AS workspace_status
       FROM relationship_finance_invitations inv
       JOIN relationship_finances rf ON rf.id = inv.relationship_finance_id
       WHERE inv.id = $1
       FOR UPDATE`,
      [invitationId]
    );
    const invitation = current.rows[0];
    if (!invitation) throw notFound("Undangan tidak ditemukan");
    if (action === "cancel" && invitation.inviter_id !== userId) throw forbidden("Hanya pengirim yang dapat membatalkan undangan");
    if (action !== "cancel" && invitation.invitee_id !== userId) throw forbidden("Undangan ini bukan untuk akun Anda");

    if (invitation.status !== "pending") {
      if (action === "accept" && invitation.status === "accepted") {
        return { id: invitationId, status: "accepted", relationshipFinanceId: invitation.relationship_finance_id };
      }
      throw conflict("Undangan sudah diproses");
    }
    if (new Date(invitation.expires_at) <= new Date()) {
      await client.query("UPDATE relationship_finance_invitations SET status = 'expired', updated_at = now() WHERE id = $1", [invitationId]);
      await client.query("UPDATE relationship_finances SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1", [invitation.relationship_finance_id]);
      throw badRequest("Undangan sudah kedaluwarsa");
    }

    const nextStatus = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
    await client.query(
      `UPDATE relationship_finance_invitations
       SET status = $2, responded_at = now(), updated_at = now()
       WHERE id = $1`,
      [invitationId, nextStatus]
    );

    if (action === "accept") {
      await client.query(
        `UPDATE relationship_finance_members
         SET status = 'accepted', joined_at = now(), updated_at = now()
         WHERE relationship_finance_id = $1 AND user_id = $2`,
        [invitation.relationship_finance_id, userId]
      );
      await client.query(
        `UPDATE relationship_finances
         SET status = 'active', accepted_at = now(), updated_at = now()
         WHERE id = $1`,
        [invitation.relationship_finance_id]
      );
      await timeline(client, invitation.relationship_finance_id, userId, "invitation_accepted", "relationship_invitation", invitationId);
    } else {
      await client.query(
        `UPDATE relationship_finances
         SET status = 'cancelled', cancelled_at = now(), updated_at = now()
         WHERE id = $1`,
        [invitation.relationship_finance_id]
      );
      await client.query(
        `UPDATE relationship_finance_members
         SET status = CASE WHEN user_id = $2 THEN $3 ELSE status END, updated_at = now()
         WHERE relationship_finance_id = $1`,
        [invitation.relationship_finance_id, invitation.invitee_id, action === "decline" ? "declined" : "removed"]
      );
      await timeline(client, invitation.relationship_finance_id, userId, action === "decline" ? "invitation_declined" : "invitation_cancelled", "relationship_invitation", invitationId);
    }

    await writeAuditLog(client, { userId, action: action.toUpperCase(), entityName: "RelationshipFinanceInvitation", entityId: invitationId });
    const recipientId = action === "cancel" ? invitation.invitee_id : invitation.inviter_id;
    await notify(client, {
      recipientId,
      actorId: userId,
      type: `relationship_invitation_${nextStatus}`,
      title: action === "accept" ? "Relationship Finance aktif" : "Undangan Relationship Finance diperbarui",
      body: action === "accept" ? "Undangan keuangan bersama telah diterima." : "Status undangan keuangan bersama telah berubah.",
      relationshipId: invitation.relationship_finance_id
    });
    return { id: invitationId, status: nextStatus, relationshipFinanceId: invitation.relationship_finance_id };
  });
}

export async function getRelationshipFinance(userId: string, relationshipId: string) {
  await assertMember(pool, userId, relationshipId);
  const result = await pool.query(
    `SELECT rf.id, rf.workspace_name AS "workspaceName", rf.relationship_type AS "relationshipType",
            rf.status, rf.accepted_at AS "acceptedAt", rf.created_at AS "createdAt",
            json_agg(json_build_object(
              'userId', u.id,
              'fullName', u.full_name,
              'username', u.username,
              'avatarUrl', u.avatar_url,
              'role', m.role,
              'status', m.status
            ) ORDER BY m.role) AS members
     FROM relationship_finances rf
     JOIN relationship_finance_members m ON m.relationship_finance_id = rf.id
     JOIN users u ON u.id = m.user_id
     WHERE rf.id = $1
     GROUP BY rf.id`,
    [relationshipId]
  );
  if (!result.rowCount) throw notFound("Relationship Finance tidak ditemukan");
  return result.rows[0];
}

export async function getRelationshipPrivacy(userId: string, relationshipId: string) {
  await assertMember(pool, userId, relationshipId);
  const result = await pool.query(
    `SELECT income_visibility AS "incomeVisibility",
            expense_visibility AS "expenseVisibility",
            accounts_visibility AS "accountsVisibility",
            transactions_visibility AS "transactionsVisibility",
            assets_visibility AS "assetsVisibility",
            liabilities_visibility AS "liabilitiesVisibility",
            investments_visibility AS "investmentsVisibility",
            goals_visibility AS "goalsVisibility"
     FROM relationship_finance_privacy_settings
     WHERE relationship_finance_id = $1 AND user_id = $2`,
    [relationshipId, userId]
  );
  return result.rows[0] ?? mapPrivacy();
}

export async function updateRelationshipPrivacy(userId: string, relationshipId: string, input: PrivacyInput) {
  await assertMember(pool, userId, relationshipId);
  const privacy = mapPrivacy(input);
  const result = await pool.query(
    `INSERT INTO relationship_finance_privacy_settings
       (relationship_finance_id, user_id, income_visibility, expense_visibility, accounts_visibility,
        transactions_visibility, assets_visibility, liabilities_visibility, investments_visibility, goals_visibility)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (relationship_finance_id, user_id) DO UPDATE
       SET income_visibility = EXCLUDED.income_visibility,
           expense_visibility = EXCLUDED.expense_visibility,
           accounts_visibility = EXCLUDED.accounts_visibility,
           transactions_visibility = EXCLUDED.transactions_visibility,
           assets_visibility = EXCLUDED.assets_visibility,
           liabilities_visibility = EXCLUDED.liabilities_visibility,
           investments_visibility = EXCLUDED.investments_visibility,
           goals_visibility = EXCLUDED.goals_visibility,
           updated_at = now()
     RETURNING income_visibility AS "incomeVisibility",
               expense_visibility AS "expenseVisibility",
               accounts_visibility AS "accountsVisibility",
               transactions_visibility AS "transactionsVisibility",
               assets_visibility AS "assetsVisibility",
               liabilities_visibility AS "liabilitiesVisibility",
               investments_visibility AS "investmentsVisibility",
               goals_visibility AS "goalsVisibility"`,
    [relationshipId, userId, privacy.income, privacy.expense, privacy.accounts, privacy.transactions, privacy.assets, privacy.liabilities, privacy.investments, privacy.goals]
  );
  await timeline(pool, relationshipId, userId, "privacy_updated", "relationship_privacy", undefined, { fields: Object.keys(input) });
  return result.rows[0];
}

async function visibleMemberIds(relationshipId: string, visibilityColumn: string) {
  const result = await pool.query<{ userId: string }>(
    `SELECT user_id AS "userId"
     FROM relationship_finance_privacy_settings
     WHERE relationship_finance_id = $1 AND ${visibilityColumn} <> 'private'`,
    [relationshipId]
  );
  return result.rows.map((row) => row.userId);
}

async function sumTransactions(userIds: string[], type: "income" | "expense", start: Date, end: Date) {
  if (userIds.length === 0) return "0.00";
  const result = await pool.query(
    `SELECT COALESCE(sum(amount), 0)::text AS total
     FROM transactions
     WHERE user_id = ANY($1::uuid[])
       AND transaction_type = $2
       AND transaction_date >= $3
       AND transaction_date < $4`,
    [userIds, type, start, end]
  );
  return result.rows[0].total as string;
}

export async function relationshipOverview(userId: string, relationshipId: string) {
  await assertMember(pool, userId, relationshipId);
  const relationship = await getRelationshipFinance(userId, relationshipId);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const incomeUsers = await visibleMemberIds(relationshipId, "income_visibility");
  const expenseUsers = await visibleMemberIds(relationshipId, "expense_visibility");
  const [combinedIncome, combinedExpense, assets, liabilities, goals, timelineRows] = await Promise.all([
    sumTransactions(incomeUsers, "income", start, end),
    sumTransactions(expenseUsers, "expense", start, end),
    pool.query(`SELECT COALESCE(sum(current_value), 0)::text AS total FROM relationship_assets WHERE relationship_finance_id = $1`, [relationshipId]),
    pool.query(`SELECT COALESCE(sum(remaining_amount), 0)::text AS total, COALESCE(sum(monthly_payment), 0)::text AS "monthlyPayment" FROM relationship_liabilities WHERE relationship_finance_id = $1`, [relationshipId]),
    listRelationshipGoals(userId, relationshipId),
    listRelationshipTimeline(userId, relationshipId, 30)
  ]);
  const income = moneyNumber(combinedIncome);
  const expense = moneyNumber(combinedExpense);
  const saving = income - expense;
  const totalAssets = moneyNumber(assets.rows[0].total);
  const totalLiabilities = moneyNumber(liabilities.rows[0].total);
  const monthlyDebtPayment = moneyNumber(liabilities.rows[0].monthlyPayment);
  const savingRate = income > 0 ? (saving / income) * 100 : 0;
  const debtToIncomeRatio = income > 0 ? (monthlyDebtPayment / income) * 100 : 0;
  const insights = buildRelationshipInsights({
    income,
    expense,
    saving,
    savingRate,
    debtToIncomeRatio,
    goals
  });
  return {
    relationship,
    summary: {
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      combinedIncome: income.toFixed(2),
      combinedExpense: expense.toFixed(2),
      combinedSaving: saving.toFixed(2),
      savingRate: savingRate.toFixed(2),
      combinedNetWorth: (totalAssets - totalLiabilities).toFixed(2),
      emergencyFundCoverage: null,
      debtToIncomeRatio: debtToIncomeRatio.toFixed(2)
    },
    goals,
    insights,
    timeline: timelineRows
  };
}

function decorateGoal(row: any) {
  const target = moneyNumber(row.targetAmount);
  const current = moneyNumber(row.currentAmount);
  const remaining = Math.max(target - current, 0);
  const progress = target > 0 ? clampPercent((current / target) * 100) : 0;
  const months = monthsUntil(row.deadline);
  const monthlyRequired = months === null
    ? null
    : months <= 0
      ? remaining
      : remaining / months;
  const predictionStatus = row.status === "completed" || current >= target
    ? "completed"
    : !row.deadline
      ? "insufficient_data"
      : months === 0 && remaining > 0
        ? "at_risk"
        : monthlyRequired !== null && monthlyRequired > 0
          ? "needs_attention"
          : "on_track";
  return {
    ...row,
    progress: progress.toFixed(2),
    remainingAmount: remaining.toFixed(2),
    monthlyRequired: monthlyRequired === null ? null : monthlyRequired.toFixed(2),
    predictionStatus
  };
}

export async function listRelationshipGoals(userId: string, relationshipId: string) {
  await assertMember(pool, userId, relationshipId);
  const result = await pool.query(
    `WITH contribution_totals AS (
       SELECT relationship_goal_id,
              COALESCE(sum(amount) FILTER (WHERE status = 'completed' AND deleted_at IS NULL), 0) AS current_amount,
              count(*) FILTER (WHERE deleted_at IS NULL)::int AS contribution_count,
              max(contribution_date) FILTER (WHERE status = 'completed' AND deleted_at IS NULL) AS last_contribution_date
       FROM relationship_goal_contributions
       GROUP BY relationship_goal_id
     )
     SELECT g.id, g.name, g.goal_type AS "goalType", g.icon, g.target_amount::text AS "targetAmount",
            CASE
              WHEN g.tracking_mode = 'linked_account' THEN COALESCE(a.current_balance, 0)::text
              ELSE COALESCE(ct.current_amount, 0)::text
            END AS "currentAmount",
            g.deadline, g.priority, g.status, g.description,
            g.tracking_mode AS "trackingMode", g.linked_account_id AS "linkedAccountId", a.name AS "linkedAccountName",
            au.full_name AS "linkedAccountOwnerName",
            COALESCE(ct.contribution_count, 0) AS "totalContributions",
            ct.last_contribution_date AS "lastContributionDate",
            g.created_by AS "createdBy", g.created_at AS "createdAt", g.updated_at AS "updatedAt"
     FROM relationship_goals g
     LEFT JOIN contribution_totals ct ON ct.relationship_goal_id = g.id
     LEFT JOIN accounts a ON a.id = g.linked_account_id
     LEFT JOIN users au ON au.id = a.user_id
     WHERE g.relationship_finance_id = $1
     ORDER BY CASE g.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, g.created_at DESC`,
    [relationshipId]
  );
  return result.rows.map(decorateGoal);
}

export async function createRelationshipGoal(userId: string, relationshipId: string, input: GoalInput) {
  await assertMember(pool, userId, relationshipId);
  return withDbTransaction(async (client) => {
    const trackingMode = input.trackingMode ?? "linked_account";
    if (trackingMode === "linked_account") {
      if (!input.linkedAccountId) throw badRequest("Pilih akun tabungan untuk linked account mode");
      await validateLinkedAccount(client, relationshipId, input.linkedAccountId);
    }
    const result = await client.query(
      `INSERT INTO relationship_goals
         (relationship_finance_id, name, goal_type, icon, target_amount, current_amount, deadline,
          priority, status, description, tracking_mode, linked_account_id, created_by)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        relationshipId,
        input.name,
        input.goalType ?? "custom",
        input.icon ?? "Target",
        normalizeNonNegativeMoney(input.targetAmount),
        input.deadline ?? null,
        input.priority ?? "medium",
        input.status ?? "active",
        input.description ?? null,
        trackingMode,
        trackingMode === "linked_account" ? input.linkedAccountId : null,
        userId
      ]
    );
    const goalId = result.rows[0].id as string;
    if (input.currentAmount !== undefined && moneyNumber(input.currentAmount) > 0 && trackingMode === "contribution") {
      await createRelationshipGoalContributionInTx(client, userId, relationshipId, goalId, {
        amount: input.currentAmount,
        contributorUserId: userId,
        sourceType: "adjustment",
        notes: "Initial contribution",
        status: "completed",
        adjustmentReason: "Initial value"
      });
    }
    await timeline(client, relationshipId, userId, "goal_created", "relationship_goal", goalId, { goalName: input.name, trackingMode });
    await writeAuditLog(client, { userId, action: "CREATE", entityName: "RelationshipGoal", entityId: goalId, newValue: input });
    const created = await client.query(
      `WITH contribution_totals AS (
         SELECT relationship_goal_id,
                COALESCE(sum(amount) FILTER (WHERE status = 'completed' AND deleted_at IS NULL), 0) AS current_amount,
                count(*) FILTER (WHERE deleted_at IS NULL)::int AS contribution_count,
                max(contribution_date) FILTER (WHERE status = 'completed' AND deleted_at IS NULL) AS last_contribution_date
         FROM relationship_goal_contributions
         WHERE relationship_goal_id = $1
         GROUP BY relationship_goal_id
       )
       SELECT g.id, g.name, g.goal_type AS "goalType", g.icon, g.target_amount::text AS "targetAmount",
              CASE WHEN g.tracking_mode = 'linked_account' THEN COALESCE(a.current_balance, 0)::text ELSE COALESCE(ct.current_amount, 0)::text END AS "currentAmount",
              g.deadline, g.priority, g.status, g.description,
              g.tracking_mode AS "trackingMode", g.linked_account_id AS "linkedAccountId", a.name AS "linkedAccountName",
              au.full_name AS "linkedAccountOwnerName",
              COALESCE(ct.contribution_count, 0) AS "totalContributions",
              ct.last_contribution_date AS "lastContributionDate",
              g.created_by AS "createdBy", g.created_at AS "createdAt", g.updated_at AS "updatedAt"
       FROM relationship_goals g
       LEFT JOIN contribution_totals ct ON ct.relationship_goal_id = g.id
       LEFT JOIN accounts a ON a.id = g.linked_account_id
       LEFT JOIN users au ON au.id = a.user_id
       WHERE g.id = $1`,
      [goalId]
    );
    return decorateGoal(created.rows[0]);
  });
}

export async function updateRelationshipGoal(userId: string, relationshipId: string, goalId: string, input: Partial<GoalInput>) {
  await assertMember(pool, userId, relationshipId);
  const current = await pool.query("SELECT id FROM relationship_goals WHERE id = $1 AND relationship_finance_id = $2", [goalId, relationshipId]);
  if (!current.rowCount) throw notFound("Goal tidak ditemukan");
  if (input.trackingMode === "linked_account") {
    if (!input.linkedAccountId) throw badRequest("Pilih akun tabungan untuk linked account mode");
    await validateLinkedAccount(pool, relationshipId, input.linkedAccountId, goalId);
  }
  const result = await pool.query(
    `UPDATE relationship_goals
     SET name = COALESCE($3, name),
         goal_type = COALESCE($4, goal_type),
         icon = COALESCE($5, icon),
         target_amount = COALESCE($6, target_amount),
         tracking_mode = COALESCE($7, tracking_mode),
         deadline = $8,
         priority = COALESCE($9, priority),
         status = COALESCE($10, status),
         description = COALESCE($11, description),
         linked_account_id = $12,
         updated_at = now()
     WHERE id = $1 AND relationship_finance_id = $2
     RETURNING id, name, goal_type AS "goalType", icon, target_amount::text AS "targetAmount",
               current_amount::text AS "currentAmount", deadline, priority, status, description,
               tracking_mode AS "trackingMode", linked_account_id AS "linkedAccountId",
               created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      goalId,
      relationshipId,
      input.name ?? null,
      input.goalType ?? null,
      input.icon ?? null,
      input.targetAmount === undefined ? null : normalizeNonNegativeMoney(input.targetAmount),
      input.trackingMode ?? null,
      input.deadline === undefined ? null : input.deadline,
      input.priority ?? null,
      input.status ?? null,
      input.description ?? null,
      input.trackingMode === "linked_account" ? input.linkedAccountId ?? null : input.trackingMode === "contribution" ? null : input.linkedAccountId ?? null
    ]
  );
  await timeline(pool, relationshipId, userId, "goal_updated", "relationship_goal", goalId);
  const goals = await listRelationshipGoals(userId, relationshipId);
  return goals.find((goal) => goal.id === result.rows[0].id);
}

async function createRelationshipGoalContributionInTx(
  db: DbClient,
  userId: string,
  relationshipId: string,
  goalId: string,
  input: GoalContributionInput
) {
  const goal = await assertGoal(db, relationshipId, goalId);
  if (goal.trackingMode === "linked_account") throw badRequest("Goal linked account mengikuti saldo akun. Contribution manual dinonaktifkan.");
  const sourceType = input.sourceType ?? "manual";
  const contributorUserId = input.contributorUserId ?? userId;
  await assertAcceptedRelationshipUser(db, relationshipId, contributorUserId);
  const amount = sourceType === "adjustment"
    ? normalizeSignedMoney(input.amount)
    : normalizeMoney(input.amount);
  if (sourceType === "adjustment" && !input.adjustmentReason?.trim()) {
    throw badRequest("Alasan adjustment wajib diisi");
  }
  if (input.transactionId) {
    const duplicate = await db.query(
      `SELECT id FROM relationship_goal_contributions
       WHERE transaction_id = $1 AND deleted_at IS NULL`,
      [input.transactionId]
    );
    if (duplicate.rowCount) throw conflict("Transaksi ini sudah dialokasikan ke goal");
  }
  const result = await db.query(
    `INSERT INTO relationship_goal_contributions
       (relationship_goal_id, contributor_id, amount, contribution_date, source_type, source_id,
        account_id, transaction_id, shared_wallet_entry_id, notes, status, adjustment_reason, created_by)
     VALUES ($1, $2, $3, COALESCE($4::date, (now() AT TIME ZONE 'Asia/Jakarta')::date), $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, relationship_goal_id AS "relationshipGoalId", contributor_id AS "contributorUserId",
               amount::text, contribution_date AS "contributionDate", source_type AS "sourceType",
               account_id AS "accountId", transaction_id AS "transactionId",
               shared_wallet_entry_id AS "sharedWalletEntryId", notes, status,
               adjustment_reason AS "adjustmentReason", created_by AS "createdBy",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      goalId,
      contributorUserId,
      amount,
      input.contributionDate ?? null,
      sourceType,
      input.accountId ?? input.transactionId ?? input.sharedWalletEntryId ?? null,
      input.accountId ?? null,
      input.transactionId ?? null,
      input.sharedWalletEntryId ?? null,
      input.notes ?? null,
      input.status ?? "completed",
      input.adjustmentReason ?? null,
      userId
    ]
  );
  await timeline(db, relationshipId, userId, sourceType === "adjustment" ? "goal_adjusted" : "goal_contribution_added", "relationship_goal", goalId, {
    contributionId: result.rows[0].id,
    amount
  });
  await writeAuditLog(db, { userId, action: "CREATE", entityName: "RelationshipGoalContribution", entityId: result.rows[0].id, newValue: input });
  return result.rows[0];
}

export async function createRelationshipGoalContribution(userId: string, relationshipId: string, goalId: string, input: GoalContributionInput) {
  await assertMember(pool, userId, relationshipId);
  return withDbTransaction((client) => createRelationshipGoalContributionInTx(client, userId, relationshipId, goalId, input));
}

export async function listRelationshipGoalContributions(userId: string, relationshipId: string, goalId: string) {
  await assertMember(pool, userId, relationshipId);
  await assertGoal(pool, relationshipId, goalId);
  const result = await pool.query(
    `SELECT c.id, c.relationship_goal_id AS "relationshipGoalId", c.contributor_id AS "contributorUserId",
            u.full_name AS "contributorName", c.amount::text, c.contribution_date AS "contributionDate",
            c.source_type AS "sourceType", c.account_id AS "accountId", a.name AS "accountName",
            c.transaction_id AS "transactionId", c.shared_wallet_entry_id AS "sharedWalletEntryId",
            c.notes, c.status, c.adjustment_reason AS "adjustmentReason",
            c.created_by AS "createdBy", c.created_at AS "createdAt", c.updated_at AS "updatedAt"
     FROM relationship_goal_contributions c
     LEFT JOIN users u ON u.id = c.contributor_id
     LEFT JOIN accounts a ON a.id = c.account_id
     WHERE c.relationship_goal_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.contribution_date DESC, c.created_at DESC`,
    [goalId]
  );
  return result.rows;
}

export async function listRelationshipTimeline(userId: string, relationshipId: string, limit = 30) {
  await assertMember(pool, userId, relationshipId);
  const result = await pool.query(
    `SELECT t.id, t.event_type AS "eventType", t.entity_type AS "entityType", t.entity_id AS "entityId",
            t.metadata, t.created_at AS "createdAt",
            u.id AS "actorUserId", u.full_name AS "actorName"
     FROM relationship_timeline_events t
     LEFT JOIN users u ON u.id = t.actor_user_id
     WHERE t.relationship_finance_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2`,
    [relationshipId, Math.max(1, Math.min(limit, 100))]
  );
  return result.rows;
}

function buildRelationshipInsights(input: {
  income: number;
  expense: number;
  saving: number;
  savingRate: number;
  debtToIncomeRatio: number;
  goals: any[];
}) {
  const insights: Array<Record<string, unknown>> = [];
  if (input.income <= 0 && input.expense <= 0) {
    insights.push({
      type: "insufficient_data",
      severity: "info",
      titleKey: "relationshipFinance.insights.insufficientData.title",
      descriptionKey: "relationshipFinance.insights.insufficientData.description",
      parameters: {}
    });
  } else if (input.saving < 0) {
    insights.push({
      type: "cashflow_risk",
      severity: "warning",
      titleKey: "relationshipFinance.insights.cashflowRisk.title",
      descriptionKey: "relationshipFinance.insights.cashflowRisk.description",
      parameters: { deficit: Math.abs(input.saving).toFixed(2) }
    });
  } else {
    insights.push({
      type: "saving_rate",
      severity: input.savingRate >= 20 ? "positive" : "info",
      titleKey: "relationshipFinance.insights.savingRate.title",
      descriptionKey: "relationshipFinance.insights.savingRate.description",
      parameters: { savingRate: input.savingRate.toFixed(2), saving: input.saving.toFixed(2) }
    });
  }
  const riskyGoal = input.goals.find((goal) => goal.predictionStatus === "at_risk" || goal.predictionStatus === "needs_attention");
  if (riskyGoal) {
    insights.push({
      type: "goal_needs_attention",
      severity: riskyGoal.predictionStatus === "at_risk" ? "warning" : "info",
      titleKey: "relationshipFinance.insights.goalNeedsAttention.title",
      descriptionKey: "relationshipFinance.insights.goalNeedsAttention.description",
      parameters: { goalName: riskyGoal.name, monthlyRequired: riskyGoal.monthlyRequired }
    });
  }
  if (input.debtToIncomeRatio > 30) {
    insights.push({
      type: "debt_to_income",
      severity: "warning",
      titleKey: "relationshipFinance.insights.debtToIncome.title",
      descriptionKey: "relationshipFinance.insights.debtToIncome.description",
      parameters: { debtToIncomeRatio: input.debtToIncomeRatio.toFixed(2) }
    });
  }
  return insights.slice(0, 3);
}

export async function relationshipCopilotContext(userId: string, relationshipId: string, entityType?: string, entityId?: string) {
  const overview = await relationshipOverview(userId, relationshipId);
  const goals = await listRelationshipGoals(userId, relationshipId);
  const contributionSummary = await pool.query(
    `SELECT c.contributor_id AS "contributorUserId", u.full_name AS "contributorName",
            COALESCE(sum(c.amount) FILTER (WHERE c.status = 'completed' AND c.deleted_at IS NULL), 0)::text AS total,
            count(*) FILTER (WHERE c.deleted_at IS NULL)::int AS count
     FROM relationship_goal_contributions c
     JOIN relationship_goals g ON g.id = c.relationship_goal_id
     LEFT JOIN users u ON u.id = c.contributor_id
     WHERE g.relationship_finance_id = $1
     GROUP BY c.contributor_id, u.full_name
     ORDER BY sum(c.amount) DESC NULLS LAST
     LIMIT 5`,
    [relationshipId]
  );
  const recentContributions = await pool.query(
    `SELECT c.relationship_goal_id AS "goalId", g.name AS "goalName",
            c.contributor_id AS "contributorUserId", u.full_name AS "contributorName",
            c.amount::text, c.contribution_date AS "contributionDate",
            c.source_type AS "sourceType", c.status, c.notes
     FROM relationship_goal_contributions c
     JOIN relationship_goals g ON g.id = c.relationship_goal_id
     LEFT JOIN users u ON u.id = c.contributor_id
     WHERE g.relationship_finance_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.contribution_date DESC, c.created_at DESC
     LIMIT 10`,
    [relationshipId]
  );
  return {
    contextType: "relationship_finance",
    relationshipFinanceId: relationshipId,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    relationship: {
      id: relationshipId,
      workspaceName: overview.relationship.workspaceName,
      memberCount: Array.isArray(overview.relationship.members) ? overview.relationship.members.length : 2,
      activeSince: overview.relationship.acceptedAt ?? overview.relationship.createdAt
    },
    summary: overview.summary,
    goals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline,
      progress: goal.progress,
      status: goal.predictionStatus,
      remainingAmount: goal.remainingAmount,
      monthlyRequired: goal.monthlyRequired
    })),
    budgets: [],
    assets: [],
    liabilities: [],
    agreements: [],
    contributions: {
      byContributor: contributionSummary.rows,
      recent: recentContributions.rows
    },
    insights: overview.insights,
    privacy: {
      containsPrivateData: false
    }
  };
}
