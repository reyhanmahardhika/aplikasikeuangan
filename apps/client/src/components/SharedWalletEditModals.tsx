import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Settings, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { formatRupiahInput, localDate } from "../lib/format";

type RequestFn = <T>(path: string, options?: RequestInit) => Promise<T>;

export type SharedWalletMember = {
  id: string;
  fullName: string;
  username: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "accepted" | "pending" | "rejected";
  displayName?: string | null;
  memberNote?: string | null;
};

export type SharedWalletAccount = {
  id: string;
  name: string;
  description?: string | null;
  spendingLimit?: string | null;
  requireApproval?: boolean;
  expenseSplitRule?: "equal" | "percentage" | "manual";
  activeUntil?: string | null;
  storageAccountId?: string | null;
};

type EditableStorageAccount = {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
  isSharedWalletAccount?: boolean;
};

type ModalFrameProps = {
  title: string;
  caption: string;
  icon: JSX.Element;
  children: JSX.Element;
  onClose: () => void;
};

function ModalFrame({ title, caption, icon, children, onClose }: ModalFrameProps) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-slate-950/20 backdrop-blur-[1px]"
        aria-label="Tutup modal"
        onClick={onClose}
      />
      <section className="fixed inset-x-3 top-[5rem] z-50 mx-auto max-h-[calc(100dvh-6.5rem)] max-w-2xl overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] lg:top-16">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{caption}</p>
            </div>
          </div>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" onClick={onClose} aria-label="Tutup">
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-4">{children}</div>
      </section>
    </>
  );
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

type WalletAccountEditModalProps = {
  wallet: SharedWalletAccount;
  accounts: EditableStorageAccount[];
  request: RequestFn;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

export function WalletAccountEditModal({
  wallet,
  accounts,
  request,
  onClose,
  onSaved
}: WalletAccountEditModalProps) {
  const [name, setName] = useState(wallet.name);
  const [description, setDescription] = useState(wallet.description || "");
  const [spendingLimit, setSpendingLimit] = useState(wallet.spendingLimit ? formatRupiahInput(String(wallet.spendingLimit)) : "");
  const [storageAccountId, setStorageAccountId] = useState(wallet.storageAccountId || "");
  const [expenseSplitRule, setExpenseSplitRule] = useState(wallet.expenseSplitRule || "equal");
  const [requireApproval, setRequireApproval] = useState(Boolean(wallet.requireApproval));
  const [hasExpiry, setHasExpiry] = useState(Boolean(wallet.activeUntil));
  const [activeUntil, setActiveUntil] = useState(wallet.activeUntil ? new Date(wallet.activeUntil).toISOString().slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableAccounts = accounts.filter((account) => (
    account.isActive
    && (!account.isSharedWalletAccount || account.id === wallet.storageAccountId)
  ));
  const originalActiveUntil = wallet.activeUntil ? new Date(wallet.activeUntil).toISOString().slice(0, 16) : "";

  const isDirty = useMemo(() => (
    name.trim() !== wallet.name
    || description.trim() !== (wallet.description || "")
    || normalizeMoneyInput(spendingLimit) !== String(wallet.spendingLimit || "")
    || storageAccountId !== (wallet.storageAccountId || "")
    || expenseSplitRule !== (wallet.expenseSplitRule || "equal")
    || requireApproval !== Boolean(wallet.requireApproval)
    || hasExpiry !== Boolean(wallet.activeUntil)
    || (hasExpiry && activeUntil !== originalActiveUntil)
  ), [activeUntil, description, expenseSplitRule, hasExpiry, name, originalActiveUntil, requireApproval, spendingLimit, storageAccountId, wallet.activeUntil, wallet.description, wallet.expenseSplitRule, wallet.name, wallet.requireApproval, wallet.spendingLimit, wallet.storageAccountId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama dompet wajib diisi.");
      return;
    }
    if (hasExpiry && !activeUntil) {
      setError("Tanggal expired wajib diisi jika masa berlaku diaktifkan.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextActiveUntil = hasExpiry && activeUntil
        ? new Date(activeUntil).toISOString()
        : null;
      const response = await request<{ pendingApproval?: boolean; message?: string }>(`/social/wallets/${wallet.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          spendingLimit: normalizeMoneyInput(spendingLimit) || undefined,
          storageAccountId: storageAccountId || null,
          requireApproval,
          expenseSplitRule,
          activeUntil: nextActiveUntil
        })
      });
      await onSaved(response?.message || (response?.pendingApproval ? "Perubahan dompet menunggu persetujuan." : "Akun shared wallet berhasil diperbarui"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan akun shared wallet gagal disimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame
      title="Edit akun wallet"
      caption="Ubah nama wallet, deskripsi, batas transaksi, dan pengaturan yang diizinkan."
      icon={<Settings size={18} />}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={submit}>
        {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Nama wallet</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Deskripsi</span>
          <textarea className="input min-h-24 resize-none" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Batas transaksi</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
            <input
              className="input pl-9"
              inputMode="numeric"
              value={spendingLimit}
              onChange={(event) => setSpendingLimit(formatRupiahInput(event.target.value))}
              placeholder="Opsional"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Akun penyimpanan</span>
          <select className="input" value={storageAccountId} onChange={(event) => setStorageAccountId(event.target.value)}>
            <option value="">Tanpa akun penyimpanan</option>
            {availableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {formatRupiahInput(account.currentBalance)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Aturan pembagian biaya</span>
          <select className="input" value={expenseSplitRule} onChange={(event) => setExpenseSplitRule(event.target.value as typeof expenseSplitRule)}>
            <option value="equal">Merata</option>
            <option value="percentage">Persentase</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-700">Ada expired</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">Aktifkan jika dompet punya batas masa berlaku.</span>
          </span>
          <input type="checkbox" checked={hasExpiry} onChange={(event) => setHasExpiry(event.target.checked)} className="h-4 w-4 accent-[#16A34A]" />
        </label>
        {hasExpiry && (
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Tanggal expired</span>
            <input className="input" type="datetime-local" value={activeUntil} onChange={(event) => setActiveUntil(event.target.value)} required />
          </label>
        )}
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-700">Perlu approval transaksi</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">Aktifkan jika transaksi tertentu harus ditinjau terlebih dulu.</span>
          </span>
          <input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} className="h-4 w-4 accent-[#16A34A]" />
        </label>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
          <button type="submit" className="btn-primary" disabled={saving || !isDirty}>
            {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
            Simpan perubahan
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

type WalletMembersEditModalProps = {
  walletId: string;
  walletName: string;
  currentUserRole: "owner" | "admin" | "member" | "viewer";
  members: SharedWalletMember[];
  request: RequestFn;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

export function WalletMembersEditModal({
  walletId,
  walletName,
  currentUserRole,
  members,
  request,
  onClose,
  onSaved
}: WalletMembersEditModalProps) {
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { displayName: string; memberNote: string; role: SharedWalletMember["role"] }>>({});

  const canManage = ["owner", "admin"].includes(currentUserRole);

  useEffect(() => {
    setDrafts(Object.fromEntries(members.map((member) => [
      member.id,
      {
        displayName: member.displayName || member.fullName,
        memberNote: member.memberNote || "",
        role: member.role
      }
    ])));
  }, [members]);

  const updateDraft = (memberId: string, patch: Partial<{ displayName: string; memberNote: string; role: SharedWalletMember["role"] }>) => {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...(current[memberId] ?? { displayName: "", memberNote: "", role: "member" as const }),
        ...patch
      }
    }));
  };

  const saveMember = async (member: SharedWalletMember) => {
    const draft = drafts[member.id];
    if (!draft) return;
    if (!draft.displayName.trim()) {
      setError("Nama tampilan anggota wajib diisi.");
      return;
    }

    setBusyMemberId(member.id);
    setError(null);
    try {
      await request(`/social/wallets/${walletId}/members/${member.id}`, {
        method: "PUT",
        body: JSON.stringify({
          role: member.role === "owner" ? undefined : draft.role,
          displayName: draft.displayName.trim(),
          memberNote: draft.memberNote.trim() || null
        })
      });
      await onSaved(`Data anggota ${member.fullName} berhasil diperbarui`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan anggota gagal disimpan");
    } finally {
      setBusyMemberId(null);
    }
  };

  const removeMember = async (member: SharedWalletMember) => {
    if (!window.confirm(`Hapus ${member.fullName} dari ${walletName}?`)) return;

    setBusyMemberId(member.id);
    setError(null);
    try {
      await request(`/social/wallets/${walletId}/members/${member.id}`, { method: "DELETE" });
      await onSaved(`Akses ${member.fullName} berhasil dihapus`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Anggota tidak dapat dihapus");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <ModalFrame
      title="Edit anggota wallet"
      caption="Kelola role, akses, dan informasi profil anggota yang tergabung di shared wallet."
      icon={<UserCog size={18} />}
      onClose={onClose}
    >
      <div className="space-y-3">
        {error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
        {!canManage && (
          <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Hanya owner atau admin yang dapat mengubah anggota dompet.
          </p>
        )}
        {members.map((member) => {
          const draft = drafts[member.id];
          const disabled = !canManage || member.role === "owner" || busyMemberId === member.id;
          return (
            <article key={member.id} className="rounded-[20px] border border-slate-100 p-3 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{member.fullName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    @{member.username} · {member.status === "pending" ? "Menunggu" : member.status === "rejected" ? "Ditolak" : "Aktif"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    <ShieldCheck size={12} /> {member.role}
                  </p>
                </div>
                {member.status === "pending" && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                    Menunggu undangan
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Nama tampilan</span>
                  <input
                    className="input"
                    value={draft?.displayName ?? ""}
                    onChange={(event) => updateDraft(member.id, { displayName: event.target.value })}
                    disabled={!canManage}
                    maxLength={120}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Catatan profil</span>
                  <textarea
                    className="input min-h-20 resize-none"
                    value={draft?.memberNote ?? ""}
                    onChange={(event) => updateDraft(member.id, { memberNote: event.target.value })}
                    disabled={!canManage}
                    maxLength={255}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Hak akses</span>
                  <select
                    className="input"
                    value={draft?.role ?? member.role}
                    onChange={(event) => updateDraft(member.id, { role: event.target.value as SharedWalletMember["role"] })}
                    disabled={disabled}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {canManage && member.role !== "owner" && (
                  <button type="button" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => removeMember(member)} disabled={busyMemberId === member.id}>
                    {busyMemberId === member.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    Hapus akses
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={() => saveMember(member)} disabled={!canManage || busyMemberId === member.id}>
                  {busyMemberId === member.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  Simpan anggota
                </button>
              </div>
            </article>
          );
        })}
        <p className="text-[11px] text-slate-500">
          Perubahan anggota akan dicatat untuk audit. Status undangan dan profil terakhir diperbarui mengikuti data terbaru dari wallet.
          {members.some((member) => member.status === "pending") && ` Ada ${members.filter((member) => member.status === "pending").length} undangan yang masih menunggu respons.`}
        </p>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Terakhir diperiksa: {localDate(new Date().toISOString())}
        </div>
      </div>
    </ModalFrame>
  );
}