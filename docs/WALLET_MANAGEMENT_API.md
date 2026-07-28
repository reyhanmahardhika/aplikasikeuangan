# Wallet Management API Documentation

## Overview

API untuk mengelola shared wallet termasuk mengedit detail wallet, mengatur anggota, dan fitur emas (gram).

## Endpoints

### Update Wallet Details

**PUT** `/api/social/wallets/:id`

Update informasi dompet seperti nama, deskripsi, batas pengeluaran, dan jenis penyimpanan.

#### Request Body

```typescript
{
  name?: string;              // Nama dompet (max 120 karakter)
  description?: string;       // Deskripsi (max 500 karakter)
  spendingLimit?: number | string; // Batas pengeluaran (opsional)
  requireApproval?: boolean;  // Apakah transaksi perlu approval
  storageAccountId?: string | null; // ID akun penyimpanan
  storageType?: "cash" | "bank" | "e_wallet" | "gold" | "other";
  storageProvider?: string;   // Nama provider (bank/e-wallet)
  storageAccountNumber?: string; // Nomor rekening/e-money
}
```

#### Response

```typescript
{
  id: string;
  name: string;
  description: string;
  spendingLimit: string;
  requireApproval: boolean;
  storageType: "cash" | "bank" | "e_wallet" | "gold" | "other";
  storageProvider: string | null;
  storageAccountNumber: string | null;
}
```

#### Example

```bash
curl -X PUT http://localhost:3000/api/social/wallets/wallet-123 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dompet Emas Keluarga",
    "spendingLimit": 5000000,
    "storageType": "gold"
  }'
```

---

### Update Wallet Member

**PUT** `/api/social/wallets/:id/members/:targetUserId`

Ubah role atau status anggota dompet.

#### Request Body

```typescript
{
  role?: "admin" | "member" | "viewer";  // Role anggota
  status?: "accepted" | "rejected" | "pending"; // Status keanggotaan
}
```

#### Response

```typescript
{
  role: "admin" | "member" | "viewer";
  status: "accepted" | "rejected" | "pending";
}
```

#### Example

```bash
curl -X PUT http://localhost:3000/api/social/wallets/wallet-123/members/user-456 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin",
    "status": "accepted"
  }'
```

---

### Remove Wallet Member

**DELETE** `/api/social/wallets/:id/members/:targetUserId`

Hapus anggota dari dompet.

#### Response

```typescript
{
  removed: boolean;
}
```

#### Example

```bash
curl -X DELETE http://localhost:3000/api/social/wallets/wallet-123/members/user-456 \
  -H "Authorization: Bearer token"
```

---

### Get Gold Prices

**GET** `/api/social/gold-prices?limit=30`

Dapatkan riwayat harga emas.

#### Query Parameters

- `limit` (optional): Jumlah riwayat yang diminta (default: 30, max: 100)

#### Response

```typescript
[
  {
    id: string;
    pricePerGram: number;     // Harga per gram dalam IDR
    source: "pegadaian";
    fetchedAt: string;        // ISO datetime
    validUntil: string;       // ISO datetime (24 jam dari fetchedAt)
    createdAt: string;        // ISO datetime
  }
]
```

#### Example

```bash
curl http://localhost:3000/api/social/gold-prices?limit=10 \
  -H "Authorization: Bearer token"
```

---

### Get Current Gold Price

**GET** `/api/social/gold-prices/current`

Dapatkan harga emas terkini.

#### Response

```typescript
{
  pricePerGram: number;  // Harga per gram dalam IDR
  currency: "IDR";
}
```

#### Example

```bash
curl http://localhost:3000/api/social/gold-prices/current \
  -H "Authorization: Bearer token"
```

---

## Gold Wallet Feature

### Overview

Fitur Gold Wallet memungkinkan pencatatan emas dalam satuan gram. Nilai rupiah otomatis dihitung berdasarkan harga jual emas Pegadaian terkini.

### How It Works

1. **Storage Type**: Pilih `gold` sebagai `storageType` saat membuat/edit wallet
2. **Weight Entry**: Saat membuat transaksi, gunakan `goldWeightGrams` bukan `amount`
3. **Automatic Conversion**: Sistem otomatis mengkonversi gram ke rupiah
4. **Price Updates**: Harga diperbarui setiap 24 jam dari Pegadaian

### Create Gold Wallet

```bash
curl -X POST http://localhost:3000/api/social/wallets \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tabungan Emas",
    "description": "Tabungan emas keluarga",
    "storageType": "gold",
    "requireApproval": true
  }'
```

### Create Gold Entry

```bash
curl -X POST http://localhost:3000/api/social/wallets/wallet-123/entries \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "entryType": "deposit",
    "goldWeightGrams": 10.5,
    "description": "Menabung emas dari gajian",
    "transactionDate": "2024-01-15"
  }'
```

### Display Gold Entry

Saat menampilkan entri emas:

```typescript
// Response akan berisi:
{
  id: string;
  entryType: "deposit" | "expense";
  amount: string;              // Nilai dalam rupiah
  goldWeightGrams: 10.5;       // Berat dalam gram
  description: string;
  status: "approved" | "pending" | "rejected";
  transactionDate: string;
  createdAt: string;
}

// Di UI, tampilkan:
// - "10.5 gram emas" untuk weight
// - "Rp 6,825,000" untuk value (jika harga 650k/gram)
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Akun sumber dana tidak ditemukan"
}
```

### 403 Forbidden

```json
{
  "error": "Hanya owner atau admin yang dapat mengedit dompet"
}
```

### 404 Not Found

```json
{
  "error": "Dompet bersama tidak ditemukan"
}
```

---

## Database Schema Updates

### Added Columns to shared_wallets

- `gold_weight_grams`: DECIMAL(15, 4) - Total berat emas dalam gram
- `gold_price_per_gram`: DECIMAL(12, 2) - Harga per gram saat ini

### New Table: gold_prices

```sql
CREATE TABLE gold_prices (
  id UUID PRIMARY KEY,
  price_per_gram DECIMAL(12, 2) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'pegadaian',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Added Columns to shared_wallet_entries

- `gold_weight_grams`: DECIMAL(15, 4) - Berat emas untuk entri ini

### Storage Type Constraint Update

```sql
CHECK (storage_type IN ('cash', 'bank', 'e_wallet', 'gold', 'other'))
```

---

## Example Workflow

### 1. Create Gold Wallet

```bash
POST /api/social/wallets
{
  "name": "Tabungan Emas Keluarga",
  "description": "Tempat menabung emas bersama",
  "storageType": "gold",
  "requireApproval": true,
  "memberIds": ["user-2", "user-3"]
}
```

Response:
```json
{
  "id": "wallet-123",
  "name": "Tabungan Emas Keluarga",
  "storageType": "gold"
}
```

### 2. Add Gold Entry

```bash
POST /api/social/wallets/wallet-123/entries
{
  "entryType": "deposit",
  "goldWeightGrams": 5.25,
  "description": "Nabung dari gajian",
  "transactionDate": "2024-01-15"
}
```

Response:
```json
{
  "id": "entry-456",
  "entryType": "deposit",
  "amount": "3412500",  // 5.25 * 650000
  "goldWeightGrams": 5.25,
  "status": "pending",  // Menunggu approval
  "transactionDate": "2024-01-15"
}
```

### 3. Check Wallet Balance

```bash
GET /api/social/wallets/wallet-123
```

Response akan menampilkan:
- Total berat emas
- Total nilai dalam rupiah
- List semua anggota dan kontribusi mereka

---

## Migration File

Jalankan migration untuk menambahkan support emas:

```bash
# File: database/migrations/014_wallet_gold_support.sql
```

Migration mencakup:
- Update storage_type constraint
- Tambah gold_weight_grams dan gold_price_per_gram ke shared_wallets
- Create gold_prices table
- Add gold_weight_grams ke shared_wallet_entries
