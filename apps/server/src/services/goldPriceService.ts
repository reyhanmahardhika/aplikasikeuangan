import { config } from "../config.js";
import { pool } from "../db/pool.js";

type GoldPriceRow = {
  pricePerGram: string | number;
  fetchedAt: string;
  validUntil: string | null;
  source: string;
};

function normalizePriceCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(normalized) && normalized > 0) return normalized;
  }
  return null;
}

function pickNestedPrice(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const keys = [
    "pricePerGram",
    "price_per_gram",
    "sellPrice",
    "sellingPrice",
    "hargaJual",
    "harga_jual",
    "salePrice",
    "value"
  ];

  for (const key of keys) {
    const value = normalizePriceCandidate(record[key]);
    if (value) return value;
  }

  const nestedKeys = ["data", "result", "payload", "response"];
  for (const key of nestedKeys) {
    const nested = pickNestedPrice(record[key]);
    if (nested) return nested;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const value = pickNestedPrice(item);
      if (value) return value;
    }
  }

  return null;
}

async function getLatestGoldPriceRow(): Promise<GoldPriceRow | null> {
  const result = await pool.query<GoldPriceRow>(
    `SELECT price_per_gram AS "pricePerGram",
            fetched_at AS "fetchedAt",
            valid_until AS "validUntil",
            source
     FROM gold_prices
     ORDER BY fetched_at DESC
     LIMIT 1`
  );
  return result.rows[0] ?? null;
}

async function getLatestValidPegadaianPriceRow(): Promise<GoldPriceRow | null> {
  const result = await pool.query<GoldPriceRow>(
    `SELECT price_per_gram AS "pricePerGram",
            fetched_at AS "fetchedAt",
            valid_until AS "validUntil",
            source
     FROM gold_prices
     WHERE source = 'pegadaian'
       AND valid_until > now()
     ORDER BY fetched_at DESC
     LIMIT 1`
  );
  return result.rows[0] ?? null;
}

async function cacheGoldPrice(pricePerGram: number, source = "pegadaian") {
  const validUntilHours = Math.max(1, config.goldPriceSyncHours);
  await pool.query(
    `INSERT INTO gold_prices (price_per_gram, source, valid_until)
     VALUES ($1, $2, now() + make_interval(hours => $3))`,
    [pricePerGram, source, validUntilHours]
  );

  await pool.query(
    `UPDATE shared_wallets
     SET gold_price_per_gram = $1,
         gold_price_fetched_at = now(),
         updated_at = now()
     WHERE storage_type = 'gold'`,
    [pricePerGram]
  );

  return {
    pricePerGram,
    fetchedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + validUntilHours * 60 * 60 * 1000).toISOString(),
    source,
    isFallback: false
  };
}

async function fetchFromPegadaianApi(): Promise<number | null> {
  if (!config.pegadaianGoldPriceApiUrl) return null;

  const headers = new Headers({ Accept: "application/json" });
  if (config.pegadaianGoldPriceApiKey) {
    headers.set(config.pegadaianGoldPriceApiAuthHeader, config.pegadaianGoldPriceApiKey);
  }

  const response = await fetch(config.pegadaianGoldPriceApiUrl, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    throw new Error(`Pegadaian API mengembalikan status ${response.status}`);
  }

  const payload = await response.json();
  return pickNestedPrice(payload);
}

export async function syncGoldPrice(force = false) {
  const cached = await getLatestValidPegadaianPriceRow();
  if (!force && cached) {
    return {
      pricePerGram: Number(cached.pricePerGram),
      fetchedAt: cached.fetchedAt,
      validUntil: cached.validUntil,
      source: cached.source,
      isFallback: false
    };
  }

  try {
    const externalPrice = await fetchFromPegadaianApi();
    if (externalPrice) {
      return await cacheGoldPrice(externalPrice, "pegadaian");
    }
  } catch (error) {
    console.error("Gold price sync failed:", error);
  }

  const latest = await getLatestGoldPriceRow();
  if (latest) {
    return {
      pricePerGram: Number(latest.pricePerGram),
      fetchedAt: latest.fetchedAt,
      validUntil: latest.validUntil,
      source: latest.source,
      isFallback: true
    };
  }

  const seedPrice = 650000;
  return cacheGoldPrice(seedPrice, "pegadaian-seeded");
}

export async function fetchGoldPrice(): Promise<number> {
  const result = await syncGoldPrice(false);
  return result.pricePerGram;
}

export async function getCurrentGoldPriceInfo() {
  const result = await syncGoldPrice(false);
  return {
    pricePerGram: result.pricePerGram,
    fetchedAt: result.fetchedAt,
    validUntil: result.validUntil,
    source: result.source,
    isFallback: result.isFallback,
    currency: "IDR",
    syncHours: config.goldPriceSyncHours
  };
}

export async function updateGoldPrice(pricePerGram: number): Promise<number> {
  const normalized = Math.max(1, Math.round(pricePerGram));
  await cacheGoldPrice(normalized, "manual");
  return normalized;
}

export async function calculateGoldValue(weightGrams: number): Promise<number> {
  const pricePerGram = await fetchGoldPrice();
  return Number((weightGrams * pricePerGram).toFixed(0));
}

export async function calculateGoldWeight(valueRupiah: number): Promise<number> {
  const pricePerGram = await fetchGoldPrice();
  return Number((valueRupiah / pricePerGram).toFixed(4));
}
