# Project Memory - Aplikasi Keuangan AI

## INSTRUKSI PENTING UNTUK AGENT
Setiap kali bekerja pada project ini, WAJIB membaca file ini dan memahami struktur project terlebih dahulu untuk mencegah bugs atau perubahan yang tidak diinginkan.

## Ringkasan Project
- **Nama**: Aplikasi Keuangan AI
- **Type**: Full-stack (monorepo dengan npm workspaces)
- **Tujuan**: Mencatat pemasukan, pengeluaran, saldo akun, scan struk, anggaran, laporan, dan assistant keuangan.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS (apps/client)
- **Backend**: Node.js + Express + TypeScript (apps/server)
- **Database**: PostgreSQL
- **Auth**: JWT (access token + refresh token)
- **OCR**: Tesseract OCR
- **Export**: CSV, XLSX, PDF
- **AI Provider**: Heuristic parser (siap diganti ke OpenAI)

## Struktur Project
- `apps/client/` - Frontend React + Vite + Tailwind
- `apps/server/` - Backend Express API TypeScript
  - `src/routes/` - API route handlers
  - `src/services/` - Business logic
  - `src/middleware/` - auth, error, rate-limit, upload
  - `src/db/` - pool, migrate, seed
  - `src/validators/` - Input validation schemas
  - `src/types/` - TypeScript type definitions
  - `src/utils/` - Utility functions
- `database/migrations/` - PostgreSQL migration SQL (001-019)

## Akun Demo / Test

### Akun 1
- **Email**: demo@keuangan.ic
- **Password**: password123

### Akun 2
- **Email**: test@mail.com
- **Password**: Admin234

## Environment Variables Utama
- `DATABASE_URL`: postgres://finance:finance@localhost:5432/finance_ai
- `JWT_ACCESS_EXPIRES_IN`: 15 menit
- `JWT_REFRESH_EXPIRES_IN`: 7 hari
- `PORT`: 4000 (backend API)
- `VITE_API_URL`: http://localhost:4000/api

## API Endpoints Utama
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh JWT
- `GET /api/dashboard/summary` - Dashboard summary
- `GET|POST|PUT|DELETE /api/accounts` - CRUD akun
- `GET|POST|PUT|DELETE /api/transactions` - CRUD transaksi
- `GET|POST /api/categories` - Kategori
- `GET|POST|PUT /api/budgets` - Anggaran
- `POST /api/transfers` - Transfer antar akun
- `POST /api/receipts/upload|process|confirm` - OCR struk
- `GET /api/reports/cash-flow|category-summary|monthly-comparison` - Laporan
- `POST /api/assistant/chat` - AI assistant
- `POST|DELETE /api/notifications/push/subscribe` - Notifikasi
- Social/Shared Wallet: `apps/server/src/routes/socialRoutes.ts`
- Wallet Management (Gold): `apps/server/src/routes/walletManagementRoutes.ts`

## Penting untuk Development
1. **Wajib baca struktur project dulu** sebelum modifikasi kode apapun
2. Backend TypeScript - gunakan tipe yang sesuai
3. PostgreSQL query parameter: $1, $2, etc.
4. **asyncHandler** untuk async route handlers
5. **auth middleware** di `middleware/auth.ts` untuk endpoint yang perlu JWT
6. **Validator schemas** di `validators/schemas.ts`
7. **Service layer** pisahkan business logic dari routes
8. **Custom errors** di `utils/errors.ts`

## Cara Menjalankan
```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

## PROSEDUR KERJA — WAJIB DIBACA SEBELUM MENGEDIT CODE

### Aturan Emas
1. **Jangan edit file besar langsung** — App.tsx punya 11000+ baris, gunakan Node.js script untuk perubahan struktural
2. **Compile setelah setiap perubahan** — Jalankan `npx tsc --noEmit` di `apps/client` setelah setiap perubahan untuk deteksi error dini
3. **Satu perubahan per commit logic** — Jangan campur perubahan state, JSX, dan helper dalam satu operasi
4. **Gunakan Node.js, BUKAN PowerShell** — Untuk string replacement kompleks, PowerShell merusak template literal `${...}` dan backtick
5. **Selalu restore dulu sebelum gagal** — `git show HEAD:apps/client/src/App.tsx` untuk dapat versi original tanpa index lock

### Checklist Modifikasi Code
- [ ] Baca PROJECT_MEMORY.md dulu
- [ ] Cek struktur komponen yang akan diubah
- [ ] Cek state variables yang diperlukan
- [ ] Cek imports yang diperlukan (icon lucide-react, dll)
- [ ] Jalankan `npx tsc --noEmit` setelah setiap perubahan
- [ ] Jangan gunakan PowerShell string replacement untuk konten JSX
- [ ] Untuk template literal `${...}` di JS/JSX, gunakan Node.js script
- [ ] Untuk changes yang melibatkan banyak baris, lakukan bertahap

### File Structure Penting
- `apps/client/src/App.tsx` — Semua frontend dalam satu file (SPA)
- `apps/client/src/lib/api.ts` — API fetch helper
- `apps/client/src/lib/format.ts` — Format rupiah, tanggal
- `apps/server/src/routes/` — Backend API routes
- `apps/server/src/services/` — Business logic
- `database/migrations/` — SQL migrations

### Cara Test Cepat
```bash
cd apps/client
npx tsc --noEmit
```
