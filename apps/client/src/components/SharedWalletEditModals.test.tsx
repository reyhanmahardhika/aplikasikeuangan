import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletAccountEditModal, WalletMembersEditModal } from "./SharedWalletEditModals";

describe("SharedWalletEditModals", () => {
  it("menyimpan perubahan akun shared wallet lewat modal edit akun", async () => {
    const request = vi.fn().mockResolvedValue({ pendingApproval: false });
    const onSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <WalletAccountEditModal
        wallet={{
          id: "wallet-1",
          name: "Dompet Liburan",
          description: "Trip keluarga",
          spendingLimit: "2500000",
          requireApproval: true,
          expenseSplitRule: "equal",
          activeUntil: null
        }}
        request={request}
        onClose={() => undefined}
        onSaved={onSaved}
      />
    );

    const [nameInput] = screen.getAllByRole("textbox");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Dompet Healing");
    await userEvent.click(screen.getByRole("button", { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith("/social/wallets/wallet-1", expect.objectContaining({
        method: "PUT"
      }));
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it("menonaktifkan edit anggota untuk user tanpa izin", () => {
    render(
      <WalletMembersEditModal
        walletId="wallet-1"
        walletName="Dompet Bareng"
        currentUserRole="viewer"
        members={[{
          id: "member-1",
          fullName: "Demo User",
          username: "demo",
          role: "member",
          status: "accepted",
          displayName: "Demo User",
          memberNote: ""
        }]}
        request={vi.fn()}
        onClose={() => undefined}
        onSaved={async () => undefined}
      />
    );

    expect(screen.getByText("Hanya owner atau admin yang dapat mengubah anggota dompet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan anggota/i })).toBeDisabled();
  });
});
