import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { pool, withDbTransaction } from "../db/pool.js";
import { badRequest, forbidden } from "../utils/errors.js";
import { normalizeMoney, normalizeNonNegativeMoney } from "../utils/money.js";
import { createTransaction } from "./transactionService.js";

type MutationType = "income" | "expense";

export type MutationImportDraft = {
  importKey: string;
  transactionDate: string;
  transactionType: MutationType;
  amount: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  duplicate: boolean;
  duplicateReason: string | null;
  confidence: number;
};

type CategoryRow = { id: string; name: string; category_type: MutationType };
type HistoricalCategoryRow = {
  category_id: string | null;
  category_name: string | null;
  transaction_type: MutationType;
  merchant_name: string | null;
  notes: string | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeDescription(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function dateToIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = cleanText(value);
  if (!raw) return null;
  const normalized = raw.replace(/,/g, " ").replace(/\s+/g, " ");
  const iso = normalized.match(/\b(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = normalized.match(/\b(\d{1,2})[-/. ]([A-Za-z]{3,}|\d{1,2})[-/. ](20\d{2}|19\d{2}|\d{2})\b/);
  if (!local) return null;
  const month = monthNumber(local[2]);
  if (!month) return null;
  const year = Number(local[3].length === 2 ? `20${local[3]}` : local[3]);
  return validIso(year, month, Number(local[1]));
}

function validIso(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function monthNumber(value: string) {
  const raw = value.toLowerCase().slice(0, 3);
  if (/^\d+$/.test(value)) return Number(value);
  return {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8,
    sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
  }[raw] ?? null;
}

function moneyFromCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 0) return null;
    return normalizeNonNegativeMoney(Math.abs(value));
  }
  const raw = cleanText(value);
  if (!raw || /^-+$/.test(raw)) return null;
  const negative = /^\(|^-/.test(raw);
  const candidate = raw
    .replace(/\((.*)\)/, "$1")
    .replace(/(?:rp|idr)/gi, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/^-/, "");
  if (!candidate || !/\d/.test(candidate)) return null;
  try {
    const normalized = normalizeNonNegativeMoney(candidate);
    return normalized === "0.00" ? null : (negative ? `-${normalized}` : normalized);
  } catch {
    return null;
  }
}

function positiveMoney(value: string) {
  return normalizeMoney(value.replace(/^-/, ""));
}

function fingerprint(accountId: string, row: Pick<MutationImportDraft, "transactionDate" | "transactionType" | "amount" | "description">) {
  const source = [accountId, row.transactionDate, row.transactionType, normalizeNonNegativeMoney(row.amount), normalizeDescription(row.description)].join("|");
  return crypto.createHash("sha256").update(source).digest("hex");
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === "," || char === ";" || char === "\t") && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function headerIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function rowsFromDelimited(text: string) {
  return text.split(/\r?\n/).map((line) => splitCsvLine(line)).filter((row) => row.some(Boolean));
}

async function rowsFromXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows: unknown[][] = [];
  worksheet.eachRow((row) => {
    rows.push(row.values instanceof Array ? row.values.slice(1) : []);
  });
  return rows;
}

async function textFromPdf(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

function parseStructuredRows(rows: unknown[][], accountId: string, categories: CategoryRow[], history: HistoricalCategoryRow[]) {
  const headerRowIndex = rows.findIndex((row) => row.filter((cell) => cleanText(cell)).length >= 2);
  if (headerRowIndex < 0) return [];
  const headers = rows[headerRowIndex].map((cell) => cleanText(cell).toLowerCase());
  const dateIdx = headerIndex(headers, ["tanggal", "date", "tgl", "posted"]);
  const descIdx = headerIndex(headers, ["description", "deskripsi", "keterangan", "remark", "uraian", "merchant", "transaksi"]);
  const debitIdx = headerIndex(headers, ["debit", "withdrawal", "keluar", "mutasi debet"]);
  const creditIdx = headerIndex(headers, ["credit", "kredit", "deposit", "masuk", "mutasi kredit"]);
  const amountIdx = headerIndex(headers, ["amount", "nominal", "jumlah", "nilai", "mutation"]);
  const typeIdx = headerIndex(headers, ["type", "tipe", "d/k", "debit/credit", "cr/db"]);
  if (dateIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) return [];

  return rows.slice(headerRowIndex + 1).map((row) => {
    const date = dateToIso(row[dateIdx]);
    if (!date) return null;
    const description = cleanText(descIdx >= 0 ? row[descIdx] : row.filter((_, index) => index !== dateIdx).join(" "));
    const debit = debitIdx >= 0 ? moneyFromCell(row[debitIdx]) : null;
    const credit = creditIdx >= 0 ? moneyFromCell(row[creditIdx]) : null;
    const amountCell = amountIdx >= 0 ? moneyFromCell(row[amountIdx]) : null;
    const typeText = cleanText(typeIdx >= 0 ? row[typeIdx] : "").toLowerCase();
    const type: MutationType = credit || /credit|kredit|cr|masuk|income/.test(typeText) ? "income" : "expense";
    const amount = positiveMoney(credit || debit || amountCell || "0");
    return decorateDraft(accountId, { transactionDate: date, transactionType: type, amount, description }, categories, history);
  }).filter((row): row is MutationImportDraft => Boolean(row));
}

function parseTextRows(text: string, accountId: string, categories: CategoryRow[], history: HistoricalCategoryRow[]) {
  return text.split(/\r?\n/).map((line) => {
    const date = dateToIso(line);
    const amounts = [...line.matchAll(/(?:rp|idr)?\s*-?\(?\d[\d.,]{2,}\)?/gi)].map((match) => moneyFromCell(match[0])).filter((value): value is string => Boolean(value));
    if (!date || !amounts.length) return null;
    const amount = amounts.at(-1)!;
    const lower = line.toLowerCase();
    const type: MutationType = /^-/.test(amount) || /\b(debit|db|keluar|tarik|withdraw|payment|bayar|pembelian|transfer ke)\b/.test(lower)
      ? "expense"
      : /\b(credit|cr|kredit|masuk|setor|deposit|terima|transfer dari)\b/.test(lower)
        ? "income"
        : "expense";
    const description = cleanText(line.replace(/\b\d{1,2}[-/. ][A-Za-z0-9]{1,4}[-/. ]\d{2,4}\b/g, "").replace(/(?:rp|idr)?\s*-?\(?\d[\d.,]{2,}\)?/gi, ""));
    return decorateDraft(accountId, { transactionDate: date, transactionType: type, amount: positiveMoney(amount), description }, categories, history);
  }).filter((row): row is MutationImportDraft => Boolean(row));
}

function decorateDraft(
  accountId: string,
  row: Pick<MutationImportDraft, "transactionDate" | "transactionType" | "amount" | "description">,
  categories: CategoryRow[],
  history: HistoricalCategoryRow[]
): MutationImportDraft {
  const normalized = normalizeDescription(row.description);
  const matchedHistory = history.find((item) => {
    if (item.transaction_type !== row.transactionType || !item.category_id) return false;
    const haystack = normalizeDescription([item.merchant_name, item.notes].filter(Boolean).join(" "));
    return haystack && (normalized.includes(haystack) || haystack.includes(normalized) || normalized.split(" ").some((part) => part.length > 4 && haystack.includes(part)));
  });
  const fallback = categories.find((category) => category.category_type === row.transactionType && /(transfer|admin|biaya|fee)/i.test(row.description) && /transfer|biaya|lainnya/i.test(category.name));
  const categoryId = matchedHistory?.category_id ?? fallback?.id ?? null;
  const categoryName = matchedHistory?.category_name ?? fallback?.name ?? null;
  const key = fingerprint(accountId, row);
  return { importKey: key, ...row, amount: normalizeNonNegativeMoney(row.amount), categoryId, categoryName, duplicate: false, duplicateReason: null, confidence: categoryId ? 0.82 : 0.64 };
}

async function loadCategoryContext(userId: string) {
  const [categories, history] = await Promise.all([
    pool.query<CategoryRow>("SELECT id, name, category_type FROM categories WHERE user_id = $1 AND is_active = true", [userId]),
    pool.query<HistoricalCategoryRow>(
      `SELECT t.category_id, c.name AS category_name, t.transaction_type, t.merchant_name, t.notes
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.category_id IS NOT NULL
       ORDER BY t.created_at DESC
       LIMIT 500`,
      [userId]
    )
  ]);
  return { categories: categories.rows, history: history.rows };
}

async function ensureAccountVisible(userId: string, accountId: string) {
  const account = await pool.query(
    `SELECT a.id FROM accounts a WHERE a.id = $1 AND (
       a.user_id = $2 OR EXISTS (
         SELECT 1 FROM account_collaborators ac
         WHERE ac.account_id = a.id AND ac.user_id = $2 AND ac.status = 'accepted'
       )
     )`,
    [accountId, userId]
  );
  if (!account.rowCount) throw forbidden("Pocket tidak dapat diakses");
}

async function markDuplicates(accountId: string, drafts: MutationImportDraft[]) {
  const seen = new Set<string>();
  const existing = drafts.length
    ? await pool.query<{ import_fingerprint: string }>(
      "SELECT import_fingerprint FROM transactions WHERE account_id = $1 AND import_fingerprint = ANY($2::text[])",
      [accountId, drafts.map((row) => row.importKey)]
    )
    : { rows: [] as Array<{ import_fingerprint: string }> };
  const existingKeys = new Set(existing.rows.map((row) => row.import_fingerprint));
  return drafts.map((draft) => {
    const inCurrentFile = seen.has(draft.importKey);
    seen.add(draft.importKey);
    return {
      ...draft,
      duplicate: existingKeys.has(draft.importKey) || inCurrentFile,
      duplicateReason: existingKeys.has(draft.importKey) ? "Sudah pernah diimport" : inCurrentFile ? "Duplikat di file ini" : null
    };
  });
}

export async function previewAccountMutationImport(userId: string, accountId: string, input: { text?: string; file?: Express.Multer.File }) {
  await ensureAccountVisible(userId, accountId);
  const { categories, history } = await loadCategoryContext(userId);
  let rows: MutationImportDraft[] = [];
  if (input.file) {
    const name = input.file.originalname.toLowerCase();
    const buffer = input.file.buffer;
    if (name.endsWith(".xlsx")) {
      rows = parseStructuredRows(await rowsFromXlsx(buffer), accountId, categories, history);
    } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = buffer.toString("utf8");
      rows = parseStructuredRows(rowsFromDelimited(text), accountId, categories, history);
      if (!rows.length) rows = parseTextRows(text, accountId, categories, history);
    } else if (name.endsWith(".pdf") || input.file.mimetype === "application/pdf") {
      rows = parseTextRows(await textFromPdf(buffer), accountId, categories, history);
    } else {
      throw badRequest("Format file tidak didukung. Gunakan CSV, XLSX, PDF, atau paste teks mutasi.");
    }
  } else if (input.text?.trim()) {
    const text = input.text.trim();
    rows = parseStructuredRows(rowsFromDelimited(text), accountId, categories, history);
    if (!rows.length) rows = parseTextRows(text, accountId, categories, history);
  } else {
    throw badRequest("Upload file atau paste teks mutasi terlebih dahulu");
  }

  rows = await markDuplicates(accountId, rows.slice(0, 300));
  return {
    rows,
    summary: {
      total: rows.length,
      duplicate: rows.filter((row) => row.duplicate).length,
      ready: rows.filter((row) => !row.duplicate).length,
      income: rows.filter((row) => row.transactionType === "income" && !row.duplicate).reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2),
      expense: rows.filter((row) => row.transactionType === "expense" && !row.duplicate).reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)
    }
  };
}

export async function commitAccountMutationImport(userId: string, accountId: string, rows: MutationImportDraft[]) {
  if (!rows.length) throw badRequest("Tidak ada mutasi yang dipilih");
  await ensureAccountVisible(userId, accountId);
  return withDbTransaction(async (client) => {
    const created = [];
    const skipped = [];
    for (const row of rows.slice(0, 300)) {
      const key = row.importKey || fingerprint(accountId, row);
      const duplicate = await client.query("SELECT id FROM transactions WHERE account_id = $1 AND import_fingerprint = $2", [accountId, key]);
      if (duplicate.rowCount) {
        skipped.push({ importKey: key, reason: "duplicate" });
        continue;
      }
      const transaction = await createTransaction(userId, {
        accountId,
        transactionType: row.transactionType,
        transactionDate: `${row.transactionDate}T12:00:00+07:00`,
        amount: row.amount,
        categoryId: row.categoryId,
        merchantName: row.description.slice(0, 180) || null,
        paymentMethod: "Mutasi",
        notes: "Import mutasi rekening",
        sourceType: "import",
        importFingerprint: key
      }, client);
      created.push(transaction);
    }
    return { created: created.length, skipped: skipped.length, transactions: created };
  });
}
