import fs from 'fs';

const fp = "apps/client/src/App.tsx";
const content = fs.readFileSync(fp, "utf-8");
let m = content;

// 1. Add showWalletEditForm state
const old = "const [showWalletEntryForm, setShowWalletEntryForm] = useState(false);";
const formState = old + "\n  const [showWalletEditForm, setShowWalletEditForm] = useState(false);";
m = m.replace(old, formState);

// 2. Add gold display after storage info in wallet header
const target = 'selectedWallet.storageAccountNumber && <p className="mt-0.5 text-xs text-white/75">{selectedWallet.storageAccountNumber}</p>}';
const goldBlock = target + `
            {selectedWallet.storageType === "gold" && (
              <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase text-white/60">Saldo Emas</p>
                <p className="mt-1 text-sm font-semibold">
                  {Number(selectedWallet.goldWeightGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} gram
                </p>
                {selectedWallet.goldPricePerGram && (
                  <p className="mt-0.5 text-xs text-white/75">
                    Harga: Rp{Number(selectedWallet.goldPricePerGram).toLocaleString("id-ID")}/gram
                  </p>
                )}
              </div>
            )}
`;
if (m.includes(target)) { m = m.replace(target, goldBlock); console.log("✅ Gold display"); }
else { console.log("❌ Gold target not found"); }

// 3. Add edit wallet form after wallet header card
const marker = '{selectedWallet.storageType === "gold" && (';
const idx = m.indexOf(marker);
if (idx >= 0) {
  const endGold = m.indexOf(")}", idx) + 2;
  const afterGold = m.indexOf("\n", endGold) + 1;
  const editForm = `
          {["owner", "admin"].includes(selectedWallet.role) && (
            <div className="rounded-[22px] bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Edit Dompet</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Perbarui nama, deskripsi, atau pengaturan dompet.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
                  onClick={() => setShowWalletEditForm((v) => !v)}
                >
                  <Settings size={14} />
                  {showWalletEditForm ? "Tutup" : "Edit"}
                </button>
              </div>
              {showWalletEditForm && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const payload = {};
                    const name = String(formData.get("name") || "");
                    const description = String(formData.get("description") || "");
                    const spendingLimit = String(formData.get("spendingLimit") || "");
                    const requireApproval = formData.get("requireApproval") === "on";
                    if (name && name !== selectedWallet.name) payload.name = name;
                    if (description !== (selectedWallet.description || "")) payload.description = description || undefined;
                    if (spendingLimit !== (selectedWallet.spendingLimit || "0")) payload.spendingLimit = spendingLimit || undefined;
                    if (requireApproval !== selectedWallet.requireApproval) payload.requireApproval = requireApproval;
                    runAction(
                      async () => {
                        await request(\`/social/wallets/\${selectedWallet.id}\`, {
                          method: "PUT",
                          body: JSON.stringify(payload)
                        });
                        setShowWalletEditForm(false);
                        await openWallet(selectedWallet.id);
                      },
                      "Dompet berhasil diperbarui"
                    );
                  }}
                >
                  <div className="space-y-3">
                    <input className="input" name="name" defaultValue={selectedWallet.name} placeholder="Nama dompet" required />
                    <textarea className="input min-h-20 resize-none" name="description" defaultValue={selectedWallet.description || ""} placeholder="Deskripsi (opsional)" />
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                      <input className="input pl-9" name="spendingLimit" inputMode="numeric" defaultValue={moneyInputValue(selectedWallet.spendingLimit)} onInput={handleMoneyInput} placeholder="Batas pengeluaran" />
                    </div>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-xs font-semibold text-slate-700">Perlu approval</span>
                      <input type="checkbox" name="requireApproval" defaultChecked={selectedWallet.requireApproval} className="h-4 w-4 accent-[#16A34A]" />
                    </label>
                    <button className="btn-primary w-full" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
`;
  m = m.slice(0, afterGold) + editForm + m.slice(afterGold);
  console.log("✅ Edit form added");
} else { console.log("❌ Marker not found"); }

// 4. Update amount input for gold wallet
const idxEntry = m.indexOf('<form ref={walletEntryFormRef}');
if (idxEntry >= 0) {
  const sec = m.substring(idxEntry, idxEntry + 2000);
  const oldAmt = '<input className="input" name="amount" inputMode="numeric" placeholder="Nominal" onInput={handleMoneyInput} required />';
  if (sec.includes(oldAmt)) {
    const newAmt = `{selectedWallet.storageType === "gold" ? (
                  <div className="space-y-2">
                    <input
                      className="input"
                      name="goldWeightGrams"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="Berat emas (gram)"
                      required
                    />
                    <p className="text-[11px] text-slate-500">
                      Nilai rupiah akan dihitung otomatis berdasarkan harga emas Pegadaian terkini
                    </p>
                  </div>
                ) : (
                  <input className="input" name="amount" inputMode="numeric" placeholder="Nominal" onInput={handleMoneyInput} required />
                )}`;
    const newSec = sec.replace(oldAmt, newAmt);
    m = m.substring(0, idxEntry) + newSec + m.substring(idxEntry + 2000);
    console.log("✅ Amount input updated");
  } else { console.log("❌ Amount not found in entry form"); }
} else { console.log("❌ walletEntryFormRef not found"); }

// 5. Update submission payload
const oldSub = `body: JSON.stringify({
                  entryType: String(form.get("entryType")),
                  amount: String(form.get("amount")),
                  description: String(form.get("description")),
                  transactionDate: String(form.get("transactionDate")),
                  receiptId: walletEntryReceiptId
                })`;
const newSub = `body: JSON.stringify({
                  entryType: String(form.get("entryType")),
                  amount: selectedWallet.storageType === "gold" ? undefined : String(form.get("amount")),
                  goldWeightGrams: selectedWallet.storageType === "gold" ? Number(form.get("goldWeightGrams")) : null,
                  description: String(form.get("description")),
                  transactionDate: String(form.get("transactionDate")),
                  receiptId: walletEntryReceiptId
                })`;
if (m.includes(oldSub)) { m = m.replace(oldSub, newSub); console.log("✅ Payload updated"); }
else { console.log("❌ Payload not found"); }

fs.writeFileSync(fp, m, "utf-8");
console.log("✅ Done!");
