import { Router } from "express";
import { pool, withDbTransaction } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { categorySchema, categoryUpdateSchema } from "../validators/schemas.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { writeAuditLog } from "../services/auditService.js";

export const categoryRoutes = Router();
categoryRoutes.use(requireAuth);

categoryRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT id, name, category_type AS "categoryType", icon, is_default AS "isDefault", is_active AS "isActive"
       FROM categories
       WHERE user_id = $1 AND is_active = true
       ORDER BY category_type, is_default DESC, name`,
      [req.user!.id]
    );
    res.json(result.rows);
  })
);

categoryRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = categorySchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, category_type, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, category_type AS "categoryType", icon, is_default AS "isDefault", is_active AS "isActive"`,
      [req.user!.id, payload.name, payload.categoryType, payload.icon]
    );
    await writeAuditLog(pool, { userId: req.user!.id, action: "CREATE", entityName: "Category", entityId: result.rows[0].id, newValue: result.rows[0] });
    res.status(201).json(result.rows[0]);
  })
);

categoryRoutes.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = categoryUpdateSchema.parse(req.body);
    const categoryId = String(req.params.id);
    const updated = await withDbTransaction(async (client) => {
      const current = await client.query(
        `SELECT * FROM categories
         WHERE id = $1 AND user_id = $2 AND is_active = true
         FOR UPDATE`,
        [categoryId, req.user!.id]
      );
      if (!current.rowCount) throw notFound("Kategori tidak ditemukan");

      const row = current.rows[0];
      if (row.is_default) throw forbidden("Kategori bawaan sistem tidak dapat diedit");
      const nextName = payload.name?.trim() ?? row.name;
      const nextType = payload.categoryType ?? row.category_type;
      const duplicate = await client.query(
        `SELECT id FROM categories
         WHERE user_id = $1 AND id <> $2 AND is_active = true
           AND lower(name) = lower($3) AND category_type = $4`,
        [req.user!.id, categoryId, nextName, nextType]
      );
      if (duplicate.rowCount) throw conflict("Nama kategori untuk tipe ini sudah digunakan");

      if (nextType !== row.category_type) {
        await client.query(
          `UPDATE transactions
           SET category_id = NULL, updated_at = now()
           WHERE user_id = $1 AND category_id = $2 AND transaction_type <> $3`,
          [req.user!.id, categoryId, nextType]
        );
        if (nextType === "income") {
          await client.query("DELETE FROM budgets WHERE user_id = $1 AND category_id = $2", [
            req.user!.id,
            categoryId
          ]);
          await client.query(
            "UPDATE schedules SET category_id = NULL, updated_at = now() WHERE user_id = $1 AND category_id = $2",
            [req.user!.id, categoryId]
          );
        }
      }

      const result = await client.query(
        `UPDATE categories
         SET name = $1, category_type = $2, icon = $3, updated_at = now()
         WHERE id = $4 AND user_id = $5
         RETURNING id, name, category_type AS "categoryType", icon,
                   is_default AS "isDefault", is_active AS "isActive"`,
        [nextName, nextType, payload.icon ?? row.icon, categoryId, req.user!.id]
      );
      await writeAuditLog(client, {
        userId: req.user!.id,
        action: "UPDATE",
        entityName: "Category",
        entityId: categoryId,
        previousValue: row,
        newValue: result.rows[0]
      });
      return result.rows[0];
    });
    res.json(updated);
  })
);

categoryRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const categoryId = String(req.params.id);
    await withDbTransaction(async (client) => {
      const current = await client.query(
        `SELECT id, name, category_type, icon, is_default, is_active
         FROM categories
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [categoryId, req.user!.id]
      );
      if (!current.rowCount || !current.rows[0].is_active) throw notFound("Kategori tidak ditemukan");
      if (current.rows[0].is_default) throw forbidden("Kategori bawaan sistem tidak dapat dihapus");

      await client.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [
        categoryId,
        req.user!.id
      ]);
      await writeAuditLog(client, {
        userId: req.user!.id,
        action: "DELETE",
        entityName: "Category",
        entityId: categoryId,
        previousValue: current.rows[0]
      });
    });
    res.status(204).send();
  })
);
