import { pool } from "../db/pool.js";

export type InviteSearchResult = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

function normalizeInviteQuery(query: string) {
  return query
    .trim()
    .replace(/^finance-ai:user:/i, "")
    .slice(0, 160);
}

export async function searchPocketInviteUsers(userId: string, query: string): Promise<InviteSearchResult[]> {
  const normalized = normalizeInviteQuery(query);
  if (normalized.length < 2) return [];

  const result = await pool.query<InviteSearchResult>(
    `SELECT u.id,
            u.full_name AS "fullName",
            u.username,
            u.email,
            u.avatar_url AS "avatarUrl",
            u.phone
     FROM users u
     LEFT JOIN user_privacy_settings privacy ON privacy.user_id = u.id
     WHERE u.id <> $1
       AND COALESCE(privacy.allow_wallet_invites, true) = true
       AND (
         lower(u.username) = lower($2)
         OR lower(u.email) = lower($2)
         OR regexp_replace(COALESCE(u.phone, ''), '[^0-9+]', '', 'g') = regexp_replace($2, '[^0-9+]', '', 'g')
         OR u.id::text = $2
       )
     ORDER BY u.full_name
     LIMIT 5`,
    [userId, normalized]
  );

  return result.rows;
}
