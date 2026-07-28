[OPEN] Debug Session: login-error

## Ringkasan
- Masalah: Request API login berhasil, tapi UI tidak pindah ke halaman home/dashboard.
- Dampak: Pengguna tetap berada di halaman login walaupun kredensial benar.

## Expected vs Actual
- Expected: Setelah login sukses, aplikasi menampilkan Dashboard.
- Actual: Tetap di halaman login (tidak “redirect”).

## Langkah Reproduksi
1. Buka aplikasi.
2. Isi email + password yang valid.
3. Klik "Masuk".
4. Network menunjukkan response 200 + payload session.
5. UI tidak pindah ke dashboard.

## Hipotesis (awal)
1. `acceptSession()` menolak object session karena validasi `isValidSession()` mengharuskan `lastActivityAt`, sedangkan response login tidak menyertakannya.
2. `onSignedIn()` terpanggil, tapi terjadi error runtime setelah login (misalnya exception di acceptSession / state update) sehingga view tidak berubah.
3. Session sempat terset tapi langsung dibersihkan oleh effect yang memvalidasi session dan menghapus localStorage bila invalid.
4. `view` tetap tidak berubah karena ada state lain yang mengoverride (mis. query `?view=` / logic init).

## Bukti (log / network / stacktrace)
- Response login hanya mengandung `user`, `accessToken`, `refreshToken` (tanpa `lastActivityAt`).
- Log NDJSON menunjukkan `accept_session_called.valid=false` dan `accept_session_invalid` karena `hasLastActivityAt=false`:
  - `apps/server/.dbg/trae-debug-log-login-error.ndjson` event `accept_session_called` dengan `valid:false`

## Perubahan Instrumentasi
- Tambah endpoint dev-only untuk menerima & membaca log: `POST/GET/DELETE /api/__debug/log*`
- Tambah pengiriman event dari client saat response login diterima dan saat `acceptSession()` dipanggil

## Analisis
- Akar masalah: `acceptSession()` memvalidasi response `Session` memakai `isValidSession()` yang sebenarnya untuk `StoredSession` (wajib ada `lastActivityAt`). Akibatnya session selalu dianggap tidak valid dan app tetap render `AuthView`.

## Fix
- Di `acceptSession()`, ubah `Session` menjadi `StoredSession` via `saveSession(localStorage, nextSession)` lalu set ke state.

## Verifikasi (post-fix)

