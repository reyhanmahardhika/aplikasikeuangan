/**
 * Testing Suite untuk Wallet Management & Gold Wallet Features
 * Gunakan dengan Jest + Supertest
 */

import request from "supertest";
import app from "../../app";
import { pool } from "../../db/pool";

describe("Wallet Management API", () => {
  let userId: string;
  let walletId: string;
  let memberId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create test users
    const userResult = await pool.query(
      "INSERT INTO users (email, username, full_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      ["test@example.com", "testuser", "Test User", "hashed_password"]
    );
    userId = userResult.rows[0].id;

    const memberResult = await pool.query(
      "INSERT INTO users (email, username, full_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      ["member@example.com", "memberuser", "Member User", "hashed_password"]
    );
    memberId = memberResult.rows[0].id;

    // Create friendship
    await pool.query(
      "INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')",
      [userId, memberId]
    );

    // Mock auth token
    authToken = "test-token";
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("PUT /api/social/wallets/:id", () => {
    beforeEach(async () => {
      // Create wallet
      const result = await pool.query(
        `INSERT INTO shared_wallets (owner_id, name, storage_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, "Test Wallet", "cash"]
      );
      walletId = result.rows[0].id;

      // Add user as owner
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'owner', 'accepted')",
        [walletId, userId]
      );
    });

    it("should update wallet name", async () => {
      const res = await request(app)
        .put(`/api/social/wallets/${walletId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated Wallet Name" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Wallet Name");
    });

    it("should update wallet with storage type gold", async () => {
      const res = await request(app)
        .put(`/api/social/wallets/${walletId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ storageType: "gold" });

      expect(res.status).toBe(200);
      expect(res.body.storageType).toBe("gold");
    });

    it("should update spending limit", async () => {
      const res = await request(app)
        .put(`/api/social/wallets/${walletId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ spendingLimit: 5000000 });

      expect(res.status).toBe(200);
      expect(res.body.spendingLimit).toBe("5000000");
    });

    it("should reject non-owner/admin edit", async () => {
      // Add another user as viewer
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'viewer', 'accepted')",
        [walletId, memberId]
      );

      const res = await request(app)
        .put(`/api/social/wallets/${walletId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-User-Id", memberId)
        .send({ name: "Unauthorized Update" });

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/social/wallets/:id/members/:targetUserId", () => {
    beforeEach(async () => {
      // Create wallet
      const result = await pool.query(
        `INSERT INTO shared_wallets (owner_id, name, storage_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, "Test Wallet", "cash"]
      );
      walletId = result.rows[0].id;

      // Add user as owner
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'owner', 'accepted')",
        [walletId, userId]
      );

      // Add member
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'member', 'pending')",
        [walletId, memberId]
      );
    });

    it("should update member role to admin", async () => {
      const res = await request(app)
        .put(`/api/social/wallets/${walletId}/members/${memberId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("admin");
    });

    it("should accept member invitation", async () => {
      const res = await request(app)
        .put(`/api/social/wallets/${walletId}/members/${memberId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-User-Id", memberId)
        .send({ status: "accepted" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("accepted");
    });
  });

  describe("DELETE /api/social/wallets/:id/members/:targetUserId", () => {
    beforeEach(async () => {
      // Create wallet
      const result = await pool.query(
        `INSERT INTO shared_wallets (owner_id, name, storage_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, "Test Wallet", "cash"]
      );
      walletId = result.rows[0].id;

      // Add users
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'owner', 'accepted')",
        [walletId, userId]
      );

      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'member', 'accepted')",
        [walletId, memberId]
      );
    });

    it("should remove member from wallet", async () => {
      const res = await request(app)
        .delete(`/api/social/wallets/${walletId}/members/${memberId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.removed).toBe(true);
    });

    it("should prevent non-owner/admin from removing members", async () => {
      const res = await request(app)
        .delete(`/api/social/wallets/${walletId}/members/${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-User-Id", memberId);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/social/gold-prices", () => {
    beforeEach(async () => {
      // Insert test gold prices
      await pool.query(
        `INSERT INTO gold_prices (price_per_gram, source, valid_until)
         VALUES ($1, 'pegadaian', now() + INTERVAL '24 hours')`,
        [650000]
      );
    });

    it("should fetch gold price history", async () => {
      const res = await request(app)
        .get("/api/social/gold-prices")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].pricePerGram).toBe(650000);
    });

    it("should respect limit parameter", async () => {
      const res = await request(app)
        .get("/api/social/gold-prices?limit=5")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe("GET /api/social/gold-prices/current", () => {
    beforeEach(async () => {
      // Insert valid gold price
      await pool.query(
        `INSERT INTO gold_prices (price_per_gram, source, valid_until)
         VALUES ($1, 'pegadaian', now() + INTERVAL '24 hours')`,
        [650000]
      );
    });

    it("should fetch current gold price", async () => {
      const res = await request(app)
        .get("/api/social/gold-prices/current")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pricePerGram).toBe(650000);
      expect(res.body.currency).toBe("IDR");
    });
  });

  describe("Gold Wallet Entries", () => {
    beforeEach(async () => {
      // Create gold wallet
      const result = await pool.query(
        `INSERT INTO shared_wallets (owner_id, name, storage_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, "Gold Wallet", "gold"]
      );
      walletId = result.rows[0].id;

      // Add owner
      await pool.query(
        "INSERT INTO shared_wallet_members (wallet_id, user_id, role, status) VALUES ($1, $2, 'owner', 'accepted')",
        [walletId, userId]
      );

      // Insert gold price
      await pool.query(
        `INSERT INTO gold_prices (price_per_gram, source, valid_until)
         VALUES ($1, 'pegadaian', now() + INTERVAL '24 hours')`,
        [650000]
      );
    });

    it("should create gold entry with weight in grams", async () => {
      const res = await request(app)
        .post(`/api/social/wallets/${walletId}/entries`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          entryType: "deposit",
          goldWeightGrams: 10.5,
          description: "Menabung emas",
          transactionDate: "2024-01-15"
        });

      expect(res.status).toBe(201);
      expect(res.body.goldWeightGrams).toBe(10.5);
      // Should calculate: 10.5 * 650000 = 6,825,000
      expect(parseInt(res.body.amount)).toBe(6825000);
    });

    it("should reject gold entry without goldWeightGrams", async () => {
      const res = await request(app)
        .post(`/api/social/wallets/${walletId}/entries`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          entryType: "deposit",
          amount: 1000000, // Should be ignored for gold wallet
          description: "Invalid entry",
          transactionDate: "2024-01-15"
        });

      expect(res.status).toBe(400);
    });
  });
});
