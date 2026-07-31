/**
 * Wallet Management UI Components
 * Komponen untuk edit wallet dan manage members
 */

import React, { useState } from "react";
import { DateInput } from "./app/AppPrimitives";
import {
  useUpdateWallet,
  useUpdateWalletMember,
  useRemoveWalletMember,
  useCurrentGoldPrice,
  useGoldValue
} from "../hooks/useWalletManagement";

interface WalletEditModalProps {
  walletId: string;
  wallet: {
    name: string;
    description?: string;
    spendingLimit?: string;
    requireApproval?: boolean;
    storageType: string;
    expenseSplitRule?: "equal" | "percentage" | "manual";
    activeUntil?: string | null;
    goldWeightGrams?: string | null;
    goldPricePerGram?: number | null;
  };
  onClose: () => void;
}

/**
 * Modal untuk edit wallet details
 */
export function WalletEditModal({ walletId, wallet, onClose }: WalletEditModalProps) {
  const [name, setName] = useState(wallet.name);
  const [description, setDescription] = useState(wallet.description || "");
  const [spendingLimit, setSpendingLimit] = useState(wallet.spendingLimit || "");
  const [requireApproval, setRequireApproval] = useState(Boolean(wallet.requireApproval));
  const [storageType, setStorageType] = useState(wallet.storageType);

  const updateMutation = useUpdateWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      walletId,
      data: {
        name: name !== wallet.name ? name : undefined,
        description: description !== (wallet.description || "") ? description : undefined,
        spendingLimit: spendingLimit !== (wallet.spendingLimit || "") ? spendingLimit : undefined,
        requireApproval: requireApproval !== wallet.requireApproval ? requireApproval : undefined,
        storageType: storageType as any
      }
    });
    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Edit Dompet</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Dompet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label>Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Batas Pengeluaran (Opsional)</label>
            <input
              type="number"
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(e.target.value)}
              min="0"
              step="1000"
            />
          </div>

          <div className="form-group">
            <label>Jenis Penyimpanan</label>
            <select value={storageType} onChange={(e) => setStorageType(e.target.value)}>
              <option value="cash">Tunai</option>
              <option value="bank">Bank</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="gold">Emas</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
              />
              Memerlukan Approval Transaksi
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface WalletMemberListProps {
  walletId: string;
  members: Array<{
    id: string;
    fullName: string;
    username: string;
    role: "owner" | "admin" | "member" | "viewer";
    status: "accepted" | "pending" | "rejected";
  }>;
  currentUserRole: "owner" | "admin" | "member" | "viewer";
  currentUserId?: string;
}

/**
 * Component untuk manage wallet members
 */
export function WalletMemberList({
  walletId,
  members,
  currentUserRole,
  currentUserId = ""
}: WalletMemberListProps) {
  const updateMember = useUpdateWalletMember();
  const removeMember = useRemoveWalletMember();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "member" | "viewer">("member");

  const canManageMembers = ["owner", "admin"].includes(currentUserRole);

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    await updateMember.mutateAsync({
      walletId,
      targetUserId: memberId,
      data: { role: newRole }
    });
    setEditingMemberId(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm("Hapus anggota ini dari dompet?")) {
      await removeMember.mutateAsync({ walletId, targetUserId: memberId });
    }
  };

  return (
    <div className="member-list">
      <h3>Anggota Dompet</h3>
      <ul>
        {members.map((member) => (
          <li key={member.id} className={`member-item ${member.status}`}>
            <div className="member-info">
              <span className="member-name">{member.fullName}</span>
              <span className="member-username">@{member.username}</span>
              <span className={`member-role ${member.role}`}>{member.role}</span>
              {member.status === "pending" && <span className="badge-pending">Menunggu</span>}
            </div>

            {canManageMembers && member.id !== currentUserId && (
              <div className="member-actions">
                {editingMemberId === member.id ? (
                  <div className="role-selector">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRoleChange(member.id, selectedRole)}
                      disabled={updateMember.isPending}
                      className="btn-small"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => setEditingMemberId(null)}
                      className="btn-small btn-secondary"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingMemberId(member.id);
                        setSelectedRole(member.role === "owner" ? "member" : member.role);
                      }}
                      className="btn-small"
                    >
                      Ubah Role
                    </button>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMember.isPending}
                        className="btn-small btn-danger"
                      >
                        Hapus
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface GoldWalletEntryFormProps {
  walletId: string;
  onSuccess?: () => void;
}

/**
 * Form untuk membuat entry di gold wallet
 */
export function GoldWalletEntryForm({ walletId, onSuccess }: GoldWalletEntryFormProps) {
  const [grams, setGrams] = useState<string>("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryType, setEntryType] = useState<"deposit" | "expense">("deposit");

  const { data: goldPrice } = useCurrentGoldPrice();
  const rupiah = useGoldValue(grams ? parseFloat(grams) : null);

  return (
    <form className="gold-entry-form">
      <h3>Entri Emas</h3>

      <div className="form-group">
        <label>Jenis Transaksi</label>
        <select value={entryType} onChange={(e) => setEntryType(e.target.value as any)}>
          <option value="deposit">Menabung</option>
          <option value="expense">Mengambil</option>
        </select>
      </div>

      <div className="form-group">
        <label>Berat Emas (gram)</label>
        <input
          type="number"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          placeholder="Contoh: 5.5"
          step="0.0001"
          min="0"
          required
        />
        {goldPrice && rupiah && (
          <small>
            ? Rp{rupiah.toLocaleString("id-ID")} (Harga: Rp{goldPrice.pricePerGram.toLocaleString("id-ID")}/gram)
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Deskripsi</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Tabungan dari gajian"
          required
        />
      </div>

      <div className="form-group">
        <label>Tanggal Transaksi</label>
        <DateInput
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn-primary">
        Simpan Entri Emas
      </button>
    </form>
  );
}

/**
 * Display untuk menampilkan harga emas terkini
 */
export function GoldPriceDisplay() {
  const { data, isLoading, error } = useCurrentGoldPrice();

  if (isLoading) return <div>Mengambil harga emas...</div>;
  if (error) return <div className="error">Gagal mengambil harga emas</div>;

  return (
    <div className="gold-price-display">
      <div className="price-label">Harga Emas Pegadaian</div>
      <div className="price-amount">
        Rp{data?.pricePerGram.toLocaleString("id-ID")} <span className="price-unit">/gram</span>
      </div>
      <small className="price-updated">
        Diperbarui otomatis setiap 24 jam
      </small>
    </div>
  );
}
