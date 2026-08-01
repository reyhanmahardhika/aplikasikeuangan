import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import { pool, withDbTransaction } from "../db/pool.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { findCategoryByName } from "./categoryService.js";
import { createTransaction } from "./transactionService.js";
import { parseReceiptText } from "./receiptParser.js";
import { runOcr } from "./ocrService.js";
import { writeAuditLog } from "./auditService.js";
import { downloadReceiptObject, uploadReceiptObject } from "./storageService.js";
import { compressAttachment } from "./attachmentCompressionService.js";

function contentTypeFromFileName(fileName: string, fallback?: string) {
  const extension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if ([".heic", ".heif"].includes(extension)) return "image/heic";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".pdf") return "application/pdf";
  return fallback || "application/octet-stream";
}

async function getUploadBuffer(file: Express.Multer.File) {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);
  throw badRequest("File struk tidak dapat dibaca");
}

async function hashBuffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeStorageName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function receiptBufferFromStorage(receipt: { storage_path: string | null; file_data: Buffer | null }) {
  if (receipt.storage_path) {
    return downloadReceiptObject(receipt.storage_path);
  }
  return receipt.file_data;
}

async function withReceiptTempFile<T>(receipt: { id: string; file_name: string; file_url: string; storage_path: string | null; file_data: Buffer | null }, callback: (filePath: string) => Promise<T>) {
  const fileBuffer = await receiptBufferFromStorage(receipt);
  if (!fileBuffer) {
    return callback(receipt.file_url);
  }
  const extension = path.extname(receipt.file_name) || ".upload";
  const filePath = path.join(os.tmpdir(), `receipt-${receipt.id}-${Date.now()}${extension}`);
  await fs.writeFile(filePath, fileBuffer);
  try {
    return await callback(filePath);
  } finally {
    await fs.rm(filePath, { force: true });
  }
}

export async function uploadReceipt(userId: string, file?: Express.Multer.File) {
  if (!file) throw badRequest("File struk diperlukan");
  const fileBuffer = await getUploadBuffer(file);
  const compressedFile = await compressAttachment(file.originalname, contentTypeFromFileName(file.originalname, file.mimetype), fileBuffer);
  const fileHash = await hashBuffer(compressedFile.buffer);
  const contentType = compressedFile.contentType;
  const receiptId = crypto.randomUUID();
  const storagePath = await uploadReceiptObject(`${userId}/${receiptId}/${Date.now()}-${safeStorageName(compressedFile.fileName)}`, compressedFile.buffer, contentType);

  const result = await pool.query(
    `INSERT INTO receipts (id, user_id, file_name, file_url, file_hash, storage_path, file_data, content_type, processing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded')
     RETURNING id, file_name AS "fileName", processing_status AS "processingStatus", created_at AS "createdAt"`,
    [receiptId, userId, compressedFile.fileName, storagePath ? `supabase://${storagePath}` : `db://receipts/${receiptId}`, fileHash, storagePath, storagePath ? null : compressedFile.buffer, contentType]
  );
  await writeAuditLog(pool, { userId, action: "UPLOAD", entityName: "Receipt", entityId: result.rows[0].id });
  return {
    ...result.rows[0],
    fileUrl: `/api/receipts/${result.rows[0].id}/file`,
    originalSize: compressedFile.originalSize,
    storedSize: compressedFile.storedSize,
    compressed: compressedFile.compressed
  };
}

export async function processReceipt(userId: string, receiptId: string) {
  const receipt = await pool.query("SELECT * FROM receipts WHERE id = $1 AND user_id = $2", [receiptId, userId]);
  const row = receipt.rows[0];
  if (!row) throw notFound("Struk tidak ditemukan");
  if (row.processing_status === "confirmed") throw conflict("Struk sudah dikonfirmasi");

  await pool.query("UPDATE receipts SET processing_status = 'processing' WHERE id = $1", [receiptId]);
  try {
    const rawText = await withReceiptTempFile(row, (filePath) => runOcr(filePath, contentTypeFromFileName(row.file_name, row.content_type)));
    const parsed = await parseReceiptText(rawText);
    const status = parsed.confidenceScore < 0.7 ? "needs_review" : "processed";
    await pool.query(
      `UPDATE receipts
       SET raw_ocr_text = $1, parsed_json = $2, confidence_score = $3, processing_status = $4
       WHERE id = $5`,
      [rawText, JSON.stringify(parsed), parsed.confidenceScore, status, receiptId]
    );
    return {
      receiptId,
      rawOcrText: rawText,
      parsed,
      processingStatus: status,
      message:
        parsed.confidenceScore < 0.7
          ? "Beberapa informasi pada struk tidak terbaca dengan jelas. Silakan periksa kembali data sebelum menyimpan transaksi."
          : null
    };
  } catch (error) {
    await pool.query("UPDATE receipts SET processing_status = 'failed' WHERE id = $1", [receiptId]);
    throw error;
  }
}

export async function getReceiptResult(userId: string, receiptId: string) {
  const result = await pool.query(
    `SELECT id, file_name AS "fileName", raw_ocr_text AS "rawOcrText", parsed_json AS parsed,
            processing_status AS "processingStatus", confidence_score AS "confidenceScore", created_at AS "createdAt"
     FROM receipts WHERE id = $1 AND user_id = $2`,
    [receiptId, userId]
  );
  if (!result.rowCount) throw notFound("Struk tidak ditemukan");
  return {
    ...result.rows[0],
    fileUrl: `/api/receipts/${receiptId}/file`
  };
}

export async function getReceiptFile(userId: string, receiptId: string) {
  const result = await pool.query(
    `SELECT r.file_url, r.file_name, r.storage_path, r.file_data, r.content_type
     FROM receipts r
     WHERE r.id = $1
       AND (
         r.user_id = $2
         OR EXISTS (
           SELECT 1
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           WHERE t.receipt_id = r.id
             AND (
               a.user_id = $2
               OR EXISTS (
                 SELECT 1
                 FROM account_collaborators ac
                 WHERE ac.account_id = a.id
                   AND ac.user_id = $2
                   AND ac.status = 'accepted'
               )
             )
         )
       )`,
    [receiptId, userId]
  );
  if (!result.rowCount) throw notFound("Struk tidak ditemukan");
  const row = result.rows[0] as { file_url: string; file_name: string; storage_path: string | null; file_data: Buffer | null; content_type: string | null };
  const storageData = await receiptBufferFromStorage(row);
  return { ...row, file_data: storageData, content_type: row.content_type || contentTypeFromFileName(row.file_name) };
}

export async function confirmReceipt(userId: string, receiptId: string, input: {
  accountId: string;
  categoryId?: string | null;
  merchantName: string;
  transactionDate: string;
  amount: unknown;
  paymentMethod?: string | null;
  notes?: string | null;
  items: Array<{ itemName: string; quantity?: string | number; unitPrice?: string | number; totalPrice?: string | number }>;
}) {
  return withDbTransaction(async (client) => {
    const receipt = await client.query("SELECT * FROM receipts WHERE id = $1 AND user_id = $2 FOR UPDATE", [receiptId, userId]);
    const row = receipt.rows[0];
    if (!row) throw notFound("Struk tidak ditemukan");
    if (!["processed", "needs_review"].includes(row.processing_status)) {
      throw badRequest("Struk harus diproses sebelum dikonfirmasi");
    }
    let categoryId = input.categoryId ?? null;
    if (!categoryId && row.parsed_json?.suggestedCategory) {
      const suggested = await findCategoryByName(client, userId, row.parsed_json.suggestedCategory, "expense");
      categoryId = suggested?.id ?? null;
    }

    const transaction = await createTransaction(
      userId,
      {
        accountId: input.accountId,
        transactionType: "expense",
        transactionDate: input.transactionDate,
        amount: input.amount,
        categoryId,
        merchantName: input.merchantName,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        sourceType: "receipt",
        receiptId,
        items: input.items
      },
      client
    );

    await client.query("UPDATE receipts SET processing_status = 'confirmed' WHERE id = $1", [receiptId]);
    await writeAuditLog(client, { userId, action: "CONFIRM", entityName: "Receipt", entityId: receiptId, newValue: transaction });
    return transaction;
  });
}
