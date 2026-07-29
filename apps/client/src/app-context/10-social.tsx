/**
 * AI context chunk: Social, friends, shared wallet, and relationship finance
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
function SocialMetric({
  label,
  value,
  tone,
  icon
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
  icon: JSX.Element;
}) {
  const tones = {
    income: "bg-emerald-50 text-[#16A34A]",
    expense: "bg-rose-50 text-rose-600",
    neutral: "bg-sky-50 text-sky-700"
  };
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
      </div>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
    </div>
  );
}


function SocialSkeleton() {
  return (
    <div className="space-y-3" aria-label="Memuat data sosial">
      {[104, 188, 112].map((height) => (
        <div key={height} className="animate-pulse rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft" style={{ height }}>
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="mt-3 h-10 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}


function SocialFriendPicker({
  friends,
  selectedIds,
  onToggle,
  excludedIds = new Set<string>(),
  title = "Pilih anggota"
}: {
  friends: SocialFriend[];
  selectedIds: Set<string>;
  onToggle: (friendId: string) => void;
  excludedIds?: Set<string>;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const acceptedFriends = friends.filter(
    (friend) => friend.status === "accepted" && !excludedIds.has(friend.userId)
  );
  const selectedFriends = acceptedFriends.filter((friend) => selectedIds.has(friend.userId));
  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = acceptedFriends
    .filter((friend) => !selectedIds.has(friend.userId))
    .filter((friend) => !normalizedQuery
      || friend.fullName.toLowerCase().includes(normalizedQuery)
      || friend.username.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Hanya teman Anda yang dapat dipilih.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#16A34A]">
          {selectedIds.size} dipilih
        </span>
      </div>
      {acceptedFriends.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={17} /></span>
          <div>
            <p className="text-xs font-medium text-slate-700">Belum ada teman yang dapat dipilih</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Tambahkan teman dan tunggu hingga permintaan diterima.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {selectedFriends.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedFriends.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-100"
                  onClick={() => onToggle(friend.userId)}
                  title="Hapus pilihan"
                >
                  <span className="max-w-32 truncate">{friend.fullName}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-2xl border bg-white px-3 transition ${
            open ? "border-[#16A34A] ring-2 ring-emerald-100" : "border-slate-200"
          }`}>
            <Search size={15} className="shrink-0 text-slate-400" />
            <input
              className="h-11 min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 140)}
              placeholder="Cari nama atau username..."
              autoComplete="off"
            />
            <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
          </div>
          {open && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
              {suggestions.length > 0 ? suggestions.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onToggle(friend.userId);
                    setQuery("");
                  }}
                >
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt="" />
                    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-900">{friend.fullName}</span>
                    <span className="block truncate text-[10px] text-slate-500">@{friend.username}</span>
                  </span>
                  <Plus size={15} className="shrink-0 text-[#16A34A]" />
                </button>
              )) : (
                <p className="px-3 py-3 text-xs text-slate-500">
                  {selectedIds.size === acceptedFriends.length ? "Semua teman sudah dipilih." : "Teman tidak ditemukan."}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



function WalletMembersManageModal({
  walletId,
  walletName,
  members,
  friends,
  request,
  onClose,
  onSaved
}: {
  walletId: string;
  walletName: string;
  members: WalletDetail["members"];
  friends: SocialFriend[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingMemberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members]
  );

  const toggleMember = (userId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const addMembers = async () => {
    if (selectedIds.size === 0 || loading) return;

    try {
      setLoading(true);
      setError(null);

      await Promise.all(
        [...selectedIds].map((userId) =>
          request(`/social/wallets/${walletId}/members`, {
            method: "POST",
            body: JSON.stringify({ userId, role: "member" })
          })
        )
      );

      setSelectedIds(new Set());
      await onSaved(`${selectedIds.size} anggota berhasil ditambahkan`);
    } catch {
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (member: WalletDetail["members"][number]) => {
    if (member.role === "owner" || removingMemberId) return;
    if (!window.confirm(`Hapus ${member.fullName} dari dompet ${walletName}?`)) return;

    try {
      setRemovingMemberId(member.id);
      setError(null);

      await request(`/social/wallets/${walletId}/members/${member.id}`, {
        method: "DELETE"
      });

      await onSaved(`${member.fullName} berhasil dihapus dari dompet`);
    } catch {
      setError(null);
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Tutup" onClick={onClose} />

      <section className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[26px] bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-[26px]">
        <SectionHeader
          title="Kelola anggota"
          caption={`Tambah atau hapus anggota dari ${walletName}.`}
          action={(
            <button type="button" className="mobile-icon-btn" aria-label="Tutup" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        />

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 p-3">
            <SocialFriendPicker
              friends={friends}
              selectedIds={selectedIds}
              excludedIds={existingMemberIds}
              title="Tambah anggota"
              onToggle={toggleMember}
            />

            <button
              type="button"
              className="btn-primary mt-3 w-full justify-center"
              disabled={selectedIds.size === 0 || loading}
              onClick={addMembers}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? "Menambahkan..." : `Tambahkan ${selectedIds.size || ""} anggota`}
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-700">Anggota saat ini</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {members.length} anggota
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const isOwner = member.role === "owner";
                const isRemoving = removingMemberId === member.id;

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        @{member.username} � {member.status === "pending" ? "Menunggu" : "Aktif"}
                      </p>
                    </div>

                    {isOwner ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Pemilik</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                        disabled={Boolean(removingMemberId)}
                        onClick={() => removeMember(member)}
                      >
                        {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {isRemoving ? "Menghapus" : "Hapus"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          )}
        </div>
      </section>
    </div>
  );
}


function SocialFriendsPanel({
  currentUser,
  friends,
  groups,
  summary,
  qrDataUrl,
  searchResults,
  searchPerson,
  scanQrFile,
  shareQr,
  runAction,
  request,
  onNavigate,
  onOpenGroups,
  onOpenPrivacy,
  selectedFriend,
  setSelectedFriend,
  friendSearchRef
}: {
  currentUser: Session["user"];
  friends: SocialFriend[];
  groups: SocialGroup[];
  summary: SocialSummary | null;
  qrDataUrl: string;
  searchResults: any[];
  searchPerson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  scanQrFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  shareQr: () => Promise<void>;
  runAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onNavigate: (view: View) => void;
  onOpenGroups: (create?: boolean) => void;
  onOpenPrivacy: () => void;
  selectedFriend: any;
  setSelectedFriend: (friend: any) => void;
  friendSearchRef: { current: HTMLInputElement | null };
}) {
  const accepted = friends.filter((friend) => friend.status === "accepted");
  const incoming = friends.filter((friend) => friend.status === "pending" && friend.incoming);
  const outgoing = friends.filter((friend) => friend.status === "pending" && !friend.incoming);
  const focusSearch = () => {
    friendSearchRef.current?.focus();
    friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-3">
      <form className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
        <SectionHeader title="Tambah teman" caption="Cari menggunakan username, email, nomor, atau QR Code." />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              ref={friendSearchRef}
              className="input h-11 w-full pl-9 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              name="query"
              placeholder="Cari username atau email..."
              required
            />
          </div>
          <button className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] px-4 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97]" aria-label="Cari pengguna">
            <Search size={17} /><span className="ml-1.5 hidden sm:inline">Cari</span>
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-[#E5E7EB] pt-3">
            {searchResults.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{person.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{person.username}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] disabled:text-slate-400"
                  disabled={person.relationshipStatus !== "none"}
                  onClick={() => runAction(
                    () => request("/social/friends/request", {
                      method: "POST",
                      body: JSON.stringify({ identifier: person.username })
                    }),
                    "Permintaan pertemanan dikirim"
                  )}
                >
                  {person.relationshipStatus === "none" ? "Tambah" : "Terhubung"}
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="QR akun Anda" caption="Tunjukkan atau bagikan agar teman dapat menemukan Anda." />
        <div className="flex flex-col items-center">
          <div className="rounded-[20px] border border-slate-100 bg-white p-3 shadow-sm">
            {qrDataUrl
              ? <img src={qrDataUrl} className="h-40 w-40 rounded-xl" alt={`QR akun @${currentUser.username ?? ""}`} />
              : <span className="flex h-40 w-40 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={54} /></span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-[#111827]">@{currentUser.username ?? "atur-username"}</p>
          <p className="mt-0.5 max-w-full truncate text-[11px] text-[#6B7280]">ID {currentUser.id}</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] transition active:scale-[0.98]" onClick={shareQr}>
              <Share2 size={16} /> Bagikan
            </button>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-xs font-semibold text-white shadow-sm transition active:scale-[0.98]">
              <QrCode size={16} /> Scan QR
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
            </label>
          </div>
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title={`Permintaan pertemanan${incoming.length ? ` (${incoming.length})` : ""}`} caption="Tinjau orang yang ingin terhubung dengan Anda." />
        {incoming.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400"><UserPlus size={16} /></span>
            <p className="text-xs text-[#6B7280]">Tidak ada permintaan baru.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((friend) => (
              <div key={friend.id} className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] p-3">
                {friend.avatarUrl
                  ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt="" />
                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#16A34A]"><UserRound size={17} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                  <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                </div>
                <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition active:scale-95" onClick={() => runAction(
                  () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                  "Pertemanan diterima"
                )}>Terima</button>
                <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#6B7280] transition active:scale-95" onClick={() => runAction(
                  () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                  "Permintaan ditolak"
                )}>Tolak</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="social-enter grid grid-cols-4 gap-2">
        {[
          { label: "Teman", value: String(accepted.length), tone: "text-[#16A34A]" },
          { label: "Grup", value: String(groups.filter((group) => group.status === "accepted").length), tone: "text-sky-700" },
          { label: "Piutang", value: rupiah(summary?.totalReceivable ?? 0), tone: "text-[#16A34A]" },
          { label: "Utang", value: rupiah(summary?.totalPayable ?? 0), tone: "text-rose-600" }
        ].map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-[18px] border border-[#E5E7EB] bg-white px-2 py-3 text-center shadow-soft">
            <p className="text-[10px] text-[#6B7280]">{metric.label}</p>
            <p className={`mt-1 truncate text-xs font-semibold ${metric.tone}`} title={metric.value}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="social-enter overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {[
            { label: "Split Bill", icon: Users, action: () => onOpenGroups() },
            { label: "Request Money", icon: CircleDollarSign, action: focusSearch },
            { label: "Transfer", icon: ArrowLeftRight, action: () => onNavigate("accounts") },
            { label: "Buat Grup", icon: UserPlus, action: () => onOpenGroups(true) }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} type="button" className="flex w-[108px] flex-col items-center gap-2 rounded-[18px] border border-[#E5E7EB] bg-white px-3 py-3 text-[11px] font-medium text-[#374151] shadow-soft transition active:scale-[0.97]" onClick={action.action}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><Icon size={17} strokeWidth={1.9} /></span>
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="social-enter rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-soft lg:rounded-lg">
        <SectionHeader title="Teman" caption={`${accepted.length} teman${outgoing.length ? ` � ${outgoing.length} menunggu` : ""}`} />
        {accepted.length === 0 ? (
          <div className="rounded-[18px] bg-[#F8FAFC] px-4 py-6 text-center">
            <div className="relative mx-auto h-20 w-28" aria-hidden="true">
              <span className="absolute left-3 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserRound size={22} /></span>
              <span className="absolute right-3 top-2 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#F8FAFC] bg-white text-sky-600 shadow-sm"><UserPlus size={21} /></span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#111827]">Belum ada teman.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#6B7280]">Mulai tambahkan teman untuk berbagi pengeluaran, split bill, dan utang piutang.</p>
            <button type="button" className="mt-4 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={focusSearch}>Tambah teman</button>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((friend) => (
              <div key={friend.id} className="rounded-[18px] border border-[#E5E7EB] p-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  onClick={async () => setSelectedFriend({
                    ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                    friendshipId: friend.id,
                    userId: friend.userId
                  })}
                >
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-11 w-11 rounded-2xl object-cover" alt="" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><UserRound size={18} /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111827]">{friend.fullName}</p>
                    <p className="truncate text-xs text-[#6B7280]">@{friend.username}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Lihat transaksi bersama</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E5E7EB] pt-3">
                  <button type="button" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => onOpenGroups()}>Split Bill</button>
                  <button type="button" className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-[#374151]" onClick={focusSearch}>Request</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedFriend && (
          <div className="mt-3 rounded-[18px] bg-[#F8FAFC] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{selectedFriend.fullName}</p>
                <p className="text-xs text-[#6B7280]">@{selectedFriend.username} � {selectedFriend.commonGroups} grup bersama</p>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500" onClick={() => setSelectedFriend(null)}><X size={15} /></button>
            </div>
            <p className="mt-3 text-xs text-[#6B7280]">Posisi dengan Anda</p>
            <p className={`mt-0.5 text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
              {Number(selectedFriend.balance) === 0 ? "Selesai" : rupiah(Math.abs(Number(selectedFriend.balance)))}
            </p>
            <div className="mt-3 space-y-2">
              {selectedFriend.sharedTransactions?.map((row: any) => (
                <div key={row.id} className="flex justify-between gap-3 border-t border-[#E5E7EB] pt-2 text-xs">
                  <span>{row.description} � {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="social-enter min-h-[108px] rounded-[20px] bg-[#16A34A] p-4 text-white shadow-[0_14px_34px_rgba(22,163,74,0.16)] lg:rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase text-emerald-100">Keuangan sosial</span>
            <h3 className="mt-2 text-base font-semibold">Bayar bareng tanpa buka data pribadi</h3>
            <p className="mt-1 text-[11px] leading-4 text-emerald-50/80">Hanya transaksi yang melibatkan teman yang akan terlihat.</p>
          </div>
          <button type="button" className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-[#16A34A]" onClick={onOpenPrivacy}>Pelajari</button>
        </div>
      </div>
    </div>
  );
}


function SocialHubView({
  request,
  accounts,
  token,
  currentUser,
  summary,
  language,
  onChanged,
  onChildFrameStateChange,
  onOpenAssistantContext
}: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  accounts: Account[];
  token: string;
  currentUser: Session["user"];
  summary: SocialSummary | null;
  language: AppLanguage;
  onChanged: () => Promise<void>;
  onChildFrameStateChange?: (state: ChildFrameState) => void;
  onOpenAssistantContext: (context: AssistantContext) => void;
}) {
  const [tab, setTab] = useState<"friends" | "groups" | "wallets" | "relationships" | "activity" | "privacy" | null>(null);
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [wallets, setWallets] = useState<SocialWallet[]>([]);
  const [relationships, setRelationships] = useState<RelationshipFinanceListItem[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipFinanceListItem | null>(null);
  const [relationshipOverviewData, setRelationshipOverviewData] = useState<RelationshipOverview | null>(null);
  const [relationshipPartnerId, setRelationshipPartnerId] = useState("");
  const [relationshipDetailTab, setRelationshipDetailTab] = useState<"goals" | "timeline">("goals");
  const [relationshipGoalFilterId, setRelationshipGoalFilterId] = useState("");
  const [showCreateRelationship, setShowCreateRelationship] = useState(false);
  const [goalFormMode, setGoalFormMode] = useState<null | "add" | "edit">(null);
  const [editingGoal, setEditingGoal] = useState<RelationshipGoal | null>(null);
  const [goalAction, setGoalAction] = useState<null | { goal: RelationshipGoal; type: "contribution" | "adjustment" | "history" }>(null);
  const [goalContributions, setGoalContributions] = useState<RelationshipGoalContribution[]>([]);
  const [goalContributionLoading, setGoalContributionLoading] = useState(false);
  const [activity, setActivity] = useState<SocialActivity[]>([]);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(true);
  const [privacy, setPrivacy] = useState({
    allowWalletInvites: true,
    allowGroupInvites: true,
    searchableBy: "username",
    hidePhone: true
  });
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletDetail | null>(null);
  const [walletReminders, setWalletReminders] = useState<WalletReminder[]>([]);
  const [showWalletReminderForm, setShowWalletReminderForm] = useState(false);
  const [showWalletEntryForm, setShowWalletEntryForm] = useState(false);
  const [showWalletEditModal, setShowWalletEditModal] = useState(false);
  const [showWalletMembersModal, setShowWalletMembersModal] = useState(false);
  const [walletEntryReceiptId, setWalletEntryReceiptId] = useState<string | null>(null);
  const [walletEntryAttachmentName, setWalletEntryAttachmentName] = useState("");
  const [walletEntryAttachmentMessage, setWalletEntryAttachmentMessage] = useState<string | null>(null);
  const [walletEntryDate, setWalletEntryDate] = useState(isoDateInput());
  const [walletEntryAttachmentLoading, setWalletEntryAttachmentLoading] = useState(false);
  const [walletStorageMode, setWalletStorageMode] = useState<"account" | "manual">("account");
  const [walletStorageAccountId, setWalletStorageAccountId] = useState("");
  const [walletAdminIds, setWalletAdminIds] = useState<Set<string>>(new Set());
  const [walletReminderInterval, setWalletReminderInterval] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchAttempted, setFriendSearchAttempted] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState<Set<string>>(new Set());
  const [walletMemberIds, setWalletMemberIds] = useState<Set<string>>(new Set());
  const [walletInviteActionId, setWalletInviteActionId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingGroupExpense, setEditingGroupExpense] = useState<GroupDetail["expenses"][number] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const friendSearchRef = useRef<HTMLInputElement>(null);
  const activitySentinelRef = useRef<HTMLDivElement>(null);
  const walletEntryFormRef = useRef<HTMLFormElement>(null);
  const walletDeepLinkHandled = useRef(false);
  const toggleSelectedFriend = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    friendId: string
  ) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };
  const socialEnumLabel = (value: string) => {
    const labels: Record<string, { en: string; id: string }> = {
      accepted: { en: "Accepted", id: "Diterima" },
      pending: { en: "Pending", id: "Menunggu" },
      rejected: { en: "Rejected", id: "Ditolak" },
      blocked: { en: "Blocked", id: "Diblokir" },
      approved: { en: "Approved", id: "Disetujui" },
      cancelled: { en: "Cancelled", id: "Dibatalkan" },
      owner: { en: "Owner", id: "Pemilik" },
      admin: { en: "Admin", id: "Admin" },
      member: { en: "Member", id: "Anggota" },
      viewer: { en: "Viewer", id: "Pengamat" }
    };
    return labels[value]?.[language] ?? value;
  };

  const pendingWallets = wallets.filter((wallet) => wallet.status === "pending");
  const activeWallets = wallets.filter((wallet) => wallet.status === "accepted");
  const activeWalletBalance = activeWallets.reduce((total, wallet) => total + Number(wallet.balance || 0), 0);
  const pendingWalletApprovals = activeWallets.reduce((total, wallet) => total + Number(wallet.pendingCount || 0), 0);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextFriends, nextGroups, nextWallets, nextActivity, nextPrivacy] = await Promise.all([
        request<SocialFriend[]>("/social/friends"),
        request<SocialGroup[]>("/social/groups"),
        request<SocialWallet[]>("/social/wallets"),
        request<SocialActivity[]>("/social/activity?limit=20&offset=0"),
        request<typeof privacy>("/social/privacy")
      ]);
      const nextRelationships = await request<RelationshipFinanceListItem[]>("/relationship-finances").catch(() => []);
      setFriends(nextFriends);
      setGroups(nextGroups);
      setWallets(nextWallets);
      setRelationships(nextRelationships);
      setActivity(nextActivity);
      setActivityHasMore(nextActivity.length === 20);
      setPrivacy(nextPrivacy);
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const resetSocialState = () => {
      setSelectedGroup(null);
      setSelectedWallet(null);
      setSelectedRelationship(null);
      setRelationshipOverviewData(null);
      setRelationshipDetailTab("goals");
      setRelationshipGoalFilterId("");
      setGoalFormMode(null);
      setEditingGoal(null);
      setSelectedFriend(null);
      setShowCreateGroup(false);
      setShowCreateWallet(false);
      setShowCreateRelationship(false);
      setGroupMemberIds(new Set());
      setWalletMemberIds(new Set());
      setShowWalletReminderForm(false);
      setShowWalletEntryForm(false);
    };

    onChildFrameStateChange?.({
      active: tab !== null && !showWalletEditModal && !showWalletMembersModal,
      onBack: tab === null
        ? null
        : () => {
            if (selectedGroup) {
              setSelectedGroup(null);
              return;
            }
            if (selectedWallet) {
              setSelectedWallet(null);
              setShowWalletReminderForm(false);
              setShowWalletEntryForm(false);
              return;
            }
            if (goalFormMode || goalAction) {
              setGoalFormMode(null);
              setEditingGoal(null);
              setGoalAction(null);
              return;
            }
            if (selectedRelationship) {
              setSelectedRelationship(null);
              setRelationshipOverviewData(null);
              setRelationshipDetailTab("goals");
              setRelationshipGoalFilterId("");
              setGoalFormMode(null);
              setEditingGoal(null);
              return;
            }
            if (showCreateGroup) {
              setShowCreateGroup(false);
              setGroupMemberIds(new Set());
              return;
            }
            if (showCreateWallet) {
              setShowCreateWallet(false);
              setWalletMemberIds(new Set());
              return;
            }
            if (showCreateRelationship) {
              setShowCreateRelationship(false);
              setRelationshipPartnerId("");
              return;
            }
            if (selectedFriend) {
              setSelectedFriend(null);
              return;
            }
            setTab(null);
            resetSocialState();
          },
      onRefresh: refresh
    });
  }, [
    onChildFrameStateChange,
    selectedFriend,
    selectedGroup,
    selectedRelationship,
    selectedWallet,
    showCreateGroup,
    showCreateRelationship,
    showCreateWallet,
    showWalletEditModal,
    showWalletMembersModal,
    tab
  ]);

  useEffect(() => {
    const query = friendSearchQuery.trim();
    if (tab !== "friends" || query.length < 2) {
      setSearchResults([]);
      setFriendSearchAttempted(false);
      setFriendSearchLoading(false);
      if (tab === "friends") setMessage(null);
      return;
    }

    let active = true;
    setMessage(null);
    const timer = window.setTimeout(async () => {
      setFriendSearchLoading(true);
      try {
        const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
        if (!active) return;
        setSearchResults(results);
        setFriendSearchAttempted(true);
        if (results.length > 0) setMessage(null);
      } catch {
        if (!active) return;
        setSearchResults([]);
        setFriendSearchAttempted(true);
      } finally {
        if (active) setFriendSearchLoading(false);
      }
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [friendSearchQuery, tab]);

  useEffect(() => {
    if (!currentUser.username) return;
    QRCode.toDataURL(`finance-ai:user:${currentUser.username}`, {
      width: 220,
      margin: 1,
      color: { dark: "#16A34A", light: "#ffffff" }
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [currentUser.username]);

  const scanQrFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const Detector = (window as any).BarcodeDetector;
      const bitmap = await createImageBitmap(file);
      let value = "";
      if (Detector) {
        const detector = new Detector({ formats: ["qr_code"] });
        const codes = await detector.detect(bitmap);
        value = String(codes[0]?.rawValue ?? "");
      } else {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = context?.getImageData(0, 0, canvas.width, canvas.height);
        value = pixels ? jsQR(pixels.data, pixels.width, pixels.height)?.data ?? "" : "";
      }
      bitmap.close();
      if (!value) throw new Error("QR code tidak terbaca");
      setSearchResults(await request<any[]>(`/social/people/search?q=${encodeURIComponent(value)}`));
      setMessage(null);
    } catch {
      setMessage(null);
    } finally {
      event.target.value = "";
    }
  };

  const runAction = async (work: () => Promise<unknown>, success: string) => {
    setMessage(null);
    try {
      await work();
      setMessage(success);
      await refresh();
      await onChanged();
    } catch {
      setMessage(null);
    }
  };

  const respondWalletInvitation = async (wallet: SocialWallet, status: "accepted" | "rejected") => {
    if (walletInviteActionId) return;

    setWalletInviteActionId(wallet.id);
    setMessage(null);
    try {
      await request(`/social/wallets/${wallet.id}/invite`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      setMessage(status === "accepted" ? `Anda bergabung ke ${wallet.name}` : `Undangan ${wallet.name} ditolak`);
      await refresh();
      await onChanged();
    } catch {
      setMessage(null);
    } finally {
      setWalletInviteActionId(null);
    }
  };

  const searchPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = friendSearchQuery.trim() || String(new FormData(event.currentTarget).get("query") || "").trim();
    if (query.length < 2) return;
    setFriendSearchLoading(true);
    try {
      const results = await request<any[]>(`/social/people/search?q=${encodeURIComponent(query)}`);
      setSearchResults(results);
      setFriendSearchAttempted(true);
      if (results.length > 0) setMessage(null);
    } catch {
      setMessage(null);
    } finally {
      setFriendSearchLoading(false);
    }
  };

  const shareAccountQr = async () => {
    const accountCode = `finance-ai:user:${currentUser.username ?? currentUser.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Tambah saya di Finly AI",
          text: `Temukan saya dengan username @${currentUser.username ?? currentUser.id}\n${accountCode}`
        });
      } else {
        await navigator.clipboard.writeText(accountCode);
        setMessage("Kode akun berhasil disalin");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Kode akun belum dapat dibagikan");
    }
  };

  const uploadWalletEntryAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWalletEntryAttachmentLoading(true);
    setWalletEntryAttachmentName(file.name);
    setWalletEntryAttachmentMessage("Mengunggah file...");
    try {
      const uploadForm = new FormData();
      uploadForm.set("receipt", file);
      try {
        const uploaded = await request<{ id: string }>("/receipts/upload", {
          method: "POST",
          body: uploadForm
        });
        setWalletEntryReceiptId(uploaded.id);
      } catch (error) {
        const duplicateId = error instanceof ApiError && error.status === 409 && error.details && typeof error.details === "object"
          ? String((error.details as { receiptId?: unknown }).receiptId ?? "")
          : "";
        if (!duplicateId) throw error;
        setWalletEntryReceiptId(duplicateId);
      }
      setMessage("Attachment berhasil diunggah");
      setWalletEntryAttachmentMessage("File siap disimpan bersama transaksi dompet.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Attachment gagal diunggah";
      setWalletEntryAttachmentMessage(errorMessage);
      setMessage(errorMessage);
    } finally {
      setWalletEntryAttachmentLoading(false);
      event.target.value = "";
    }
  };

  const openWalletAttachment = async (receiptId: string) => {
    try {
      const response = await fetch(downloadUrl(`/receipts/${receiptId}/file`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Attachment tidak dapat dimuat");
      const blob = await response.blob();
      const signature = new TextDecoder("ascii").decode(await blob.slice(4, 16).arrayBuffer());
      const isHeic = /image\/hei[cf]/i.test(blob.type) || /ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/i.test(signature);
      const previewBlob = isHeic
        ? (await heic2any({ blob, toType: "image/jpeg", quality: 0.9 }))
        : blob;
      const resolvedBlob = Array.isArray(previewBlob) ? previewBlob[0] : previewBlob;
      const url = URL.createObjectURL(resolvedBlob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setMessage(null);
    }
  };

  const openGroup = async (id: string) => {
    setSelectedGroup(await request<GroupDetail>(`/social/groups/${id}`));
    setGroupMemberIds(new Set());
    setShowExpenseForm(false);
  };

  const openWallet = async (id: string) => {
    const [wallet, reminders] = await Promise.all([
      request<WalletDetail>(`/social/wallets/${id}`),
      request<WalletReminder[]>(`/social/wallets/${id}/reminders`).catch(() => [])
    ]);
    setSelectedWallet(wallet);
    setShowWalletEditModal(false);
    setShowWalletMembersModal(false);
    setWalletMemberIds(new Set());
    setWalletReminders(reminders);
    setShowWalletEntryForm(false);
    setWalletEntryReceiptId(null);
    setWalletEntryAttachmentName("");
    setWalletEntryAttachmentMessage(null);
    setWalletEntryDate(isoDateInput());
  };

  const openRelationship = async (item: RelationshipFinanceListItem) => {
    setSelectedRelationship(item);
    setShowCreateRelationship(false);
    setRelationshipPartnerId("");
    setRelationshipDetailTab("goals");
    setRelationshipGoalFilterId("");
    setGoalFormMode(null);
    setEditingGoal(null);
    setGoalAction(null);
    if (item.status === "active") {
      setRelationshipOverviewData(await request<RelationshipOverview>(`/relationship-finances/${item.id}/overview`));
    } else {
      setRelationshipOverviewData(null);
    }
  };

  const respondRelationship = async (item: RelationshipFinanceListItem, action: "accept" | "decline" | "cancel") => {
    if (!item.invitationId) return;
    await runAction(
      async () => {
        try {
          await request(`/relationship-finances/${item.id}/invitations/${item.invitationId}/${action}`, { method: "POST" });
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            await request(`/relationship-finances/invitations/${item.invitationId}/${action}`, { method: "POST" });
            return;
          }
          throw error;
        }
      },
      action === "accept"
        ? (language === "en" ? "Relationship Finance is active" : "Relationship Finance sudah aktif")
        : (language === "en" ? "Invitation updated" : "Undangan diperbarui")
    );
    setSelectedRelationship(null);
    setRelationshipOverviewData(null);
  };

  const createRelationship = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runAction(
      () => request("/relationship-finances", {
        method: "POST",
        body: JSON.stringify({
          partnerUserId: relationshipPartnerId,
          workspaceName: String(data.get("workspaceName") ?? ""),
          relationshipType: String(data.get("relationshipType") ?? "partner"),
          privacy: {
            incomeVisibility: String(data.get("incomeVisibility") ?? "summary_only"),
            expenseVisibility: String(data.get("expenseVisibility") ?? "summary_only"),
            accountsVisibility: String(data.get("accountsVisibility") ?? "private"),
            transactionsVisibility: String(data.get("transactionsVisibility") ?? "private"),
            assetsVisibility: String(data.get("assetsVisibility") ?? "summary_only"),
            liabilitiesVisibility: String(data.get("liabilitiesVisibility") ?? "summary_only"),
            investmentsVisibility: "private",
            goalsVisibility: "shared"
          }
        })
      }),
      language === "en" ? "Invitation sent" : "Undangan dikirim"
    );
    setShowCreateRelationship(false);
    setRelationshipPartnerId("");
  };

  const submitRelationshipGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRelationship) return;
    const data = new FormData(event.currentTarget);
    const trackingMode = String(data.get("trackingMode") ?? "linked_account") as "contribution" | "linked_account";
    const isEdit = goalFormMode === "edit" && editingGoal;
    await runAction(
      () => request(isEdit
        ? `/relationship-finances/${selectedRelationship.id}/goals/${editingGoal.id}`
        : `/relationship-finances/${selectedRelationship.id}/goals`, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          goalType: String(data.get("goalType") ?? "custom"),
          targetAmount: String(data.get("targetAmount") ?? "0"),
          deadline: String(data.get("deadline") || "") || null,
          priority: String(data.get("priority") ?? "medium"),
          description: String(data.get("description") || "") || null,
          trackingMode,
          linkedAccountId: trackingMode === "linked_account" ? String(data.get("linkedAccountId") || "") || null : null
        })
      }),
      isEdit
        ? (language === "en" ? "Goal updated" : "Goal diperbarui")
        : (language === "en" ? "Goal added" : "Goal ditambahkan")
    );
    await openRelationship(selectedRelationship);
    setGoalFormMode(null);
    setEditingGoal(null);
    event.currentTarget.reset();
  };

  const openGoalHistory = async (goal: RelationshipGoal, type: "history" | "contribution" | "adjustment") => {
    setGoalAction({ goal, type });
    setGoalFormMode(null);
    setEditingGoal(null);
    setGoalContributionLoading(true);
    try {
      const rows = await request<RelationshipGoalContribution[]>(`/relationship-finances/${selectedRelationship?.id}/goals/${goal.id}/contributions`);
      setGoalContributions(rows);
    } catch {
      setMessage(null);
      setGoalContributions([]);
    } finally {
      setGoalContributionLoading(false);
    }
  };

  const submitGoalContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRelationship || !goalAction) return;
    const data = new FormData(event.currentTarget);
    const isAdjustment = goalAction.type === "adjustment";
    await runAction(
      () => request(`/relationship-finances/${selectedRelationship.id}/goals/${goalAction.goal.id}/${isAdjustment ? "adjustments" : "contributions"}`, {
        method: "POST",
        body: JSON.stringify({
          amount: String(data.get("amount") ?? ""),
          contributionDate: String(data.get("contributionDate") || "") || null,
          contributorUserId: String(data.get("contributorUserId") || "") || currentUser.id,
          sourceType: isAdjustment ? "adjustment" : String(data.get("sourceType") || "manual"),
          notes: String(data.get("notes") || "") || null,
          adjustmentReason: isAdjustment ? String(data.get("adjustmentReason") || "") : null,
          status: "completed"
        })
      }),
      isAdjustment
        ? (language === "en" ? "Goal adjusted" : "Goal disesuaikan")
        : (language === "en" ? "Contribution added" : "Kontribusi ditambahkan")
    );
    await openRelationship(selectedRelationship);
    await openGoalHistory(goalAction.goal, "history");
  };

  useEffect(() => {
    if (loading || walletDeepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const walletId = params.get("walletId");
    if (!walletId) return;
    walletDeepLinkHandled.current = true;
    setTab("wallets");
    openWallet(walletId)
      .then(() => {
        if (params.get("walletAction") === "record") {
          setShowWalletEntryForm(true);
          window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
        }
      })
      .catch(() => setMessage("Dompet bersama tidak dapat dibuka"));
  }, [loading]);

  const loadMoreActivity = async () => {
    if (activityLoadingMore || !activityHasMore) return;
    setActivityLoadingMore(true);
    try {
      const rows = await request<SocialActivity[]>(`/social/activity?limit=20&offset=${activity.length}`);
      setActivity((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...rows.filter((item) => !existingIds.has(item.id))];
      });
      setActivityHasMore(rows.length === 20);
    } catch {
      setActivityHasMore(false);
    } finally {
      setActivityLoadingMore(false);
    }
  };

  useEffect(() => {
    if (tab !== "activity" || !activitySentinelRef.current || !activityHasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreActivity();
      },
      { rootMargin: "180px 0px" }
    );
    observer.observe(activitySentinelRef.current);
    return () => observer.disconnect();
  }, [tab, activity.length, activityHasMore, activityLoadingMore]);

  const filteredRelationshipGoal = relationshipOverviewData?.goals.find((goal) => goal.id === relationshipGoalFilterId) ?? null;
  const filteredRelationshipTimeline = relationshipOverviewData
    ? relationshipGoalFilterId
      ? relationshipOverviewData.timeline.filter((event) => {
          const metadata = event.metadata ?? {};
          const metadataGoalId = String(metadata.goalId ?? metadata.relationshipGoalId ?? "");
          return event.entityId === relationshipGoalFilterId || metadataGoalId === relationshipGoalFilterId;
        })
      : relationshipOverviewData.timeline
    : [];
  const filteredRelationshipInsights = relationshipOverviewData
    ? relationshipGoalFilterId
      ? relationshipOverviewData.insights.filter((insight) => insight.type.includes("goal"))
      : relationshipOverviewData.insights
    : [];

  const tabs = [
    {
      id: "friends" as const,
      label: "Teman",
      icon: UserPlus,
      count: `${friends.filter((friend) => friend.status === "accepted").length} teman`,
      meta: friends.some((friend) => friend.incoming) ? `${friends.filter((friend) => friend.incoming).length} permintaan menunggu` : "Cari teman dan kelola transaksi bersama",
      tone: "bg-emerald-50 text-[#16A34A]"
    },
    {
      id: "groups" as const,
      label: "Grup",
      icon: Users,
      count: `${groups.length} grup`,
      meta: "Split bill dan pengeluaran bersama",
      tone: "bg-sky-50 text-sky-700"
    },
    {
      id: "wallets" as const,
      label: "Dompet bersama",
      icon: Wallet,
      count: `${wallets.length} dompet`,
      meta: "Kelola kas dan saldo bersama",
      tone: "bg-violet-50 text-violet-700"
    },
    {
      id: "relationships" as const,
      label: language === "en" ? "Relationship Finance" : "Relationship Finance",
      icon: HeartPulse,
      count: `${relationships.filter((item) => item.status === "active").length} aktif`,
      meta: language === "en" ? "Shared goals, budget, assets, and partner insights" : "Goal, budget, aset, dan insight bersama pasangan",
      tone: "bg-rose-50 text-rose-700"
    },
    {
      id: "activity" as const,
      label: "Aktivitas",
      icon: Bell,
      count: `${activity.filter((row) => !row.isRead).length} baru`,
      meta: "Permintaan dan perubahan yang melibatkan Anda",
      tone: "bg-amber-50 text-amber-700"
    },
    {
      id: "privacy" as const,
      label: "Privasi",
      icon: ShieldCheck,
      count: "Terlindungi",
      meta: "Atur pencarian dan izin undangan",
      tone: "bg-rose-50 text-rose-700"
    }
  ];
  const groupedActivity = activity.reduce<Array<{ key: string; label: string; items: SocialActivity[] }>>((groups, item) => {
    const date = new Date(item.createdAt);
    const key = jakartaDateParts(date).value;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(item);
      return groups;
    }
    groups.push({
      key,
      label: new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
        timeZone: APP_TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date),
      items: [item]
    });
    return groups;
  }, []);
  const selectedWalletStorageAccount = accounts.find((account) => account.id === walletStorageAccountId);

  return (
    <section className="mx-auto max-w-6xl space-y-3">
      {tab === null ? (
        <>
          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Social</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Keuangan bersama</h2>
                <p className="mt-1 text-xs text-slate-500">Teman, grup, dan tagihan dalam satu tempat.</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
                <Users size={21} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <SocialMetric label="Harus dibayar" value={rupiah(summary?.totalPayable ?? 0)} tone="expense" icon={<ArrowUpRight size={14} />} />
              <SocialMetric label="Harus diterima" value={rupiah(summary?.totalReceivable ?? 0)} tone="income" icon={<ArrowDownLeft size={14} />} />
              <SocialMetric label="Grup aktif" value={String(summary?.activeGroups ?? 0)} tone="neutral" icon={<Users size={14} />} />
              <SocialMetric label="Perlu konfirmasi" value={String(summary?.pendingConfirmations ?? 0)} tone="neutral" icon={<Bell size={14} />} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
            <div className="grid grid-cols-1 gap-3">
              {tabs.filter((item) => item.id !== "activity").map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ripple-card flex min-h-[88px] items-center gap-3 rounded-[18px] border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-100 hover:bg-slate-50 active:scale-[0.99] lg:rounded-md"
                    onClick={() => {
                      setTab(item.id);
                      setSelectedGroup(null);
                      setSelectedWallet(null);
                      setSelectedRelationship(null);
                      setRelationshipOverviewData(null);
                      setSelectedFriend(null);
                      setShowCreateGroup(false);
                      setShowCreateWallet(false);
                      setShowCreateRelationship(false);
                      setGroupMemberIds(new Set());
                      setWalletMemberIds(new Set());
                      setRelationshipPartnerId("");
                    }}
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={23} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{item.label}</span>
                        <span className="max-w-[120px] shrink-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{item.count}</span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">{item.meta}</span>
                    </span>
                    <ChevronRight size={19} className="shrink-0 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader
              title="Aktivitas terbaru"
              caption="Pembaruan yang melibatkan Anda"
              action={activity.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]"
                  onClick={() => setTab("activity")}
                >
                  Lihat selengkapnya <ChevronRight size={14} />
                </button>
              ) : undefined}
            />
            <div className="space-y-1">
              {loading && <SocialSkeleton />}
              {!loading && activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial." />}
              {!loading && activity.slice(0, 5).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-slate-50"
                  onClick={() => setTab("activity")}
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-[#16A34A]"}`}>
                    <Bell size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{event.title}</span>
                      {!event.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />}
                    </span>
                    {event.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{event.body}</span>}
                    <span className="mt-1 block text-[10px] text-slate-400">{localDate(event.createdAt)}</span>
                  </span>
                  <ChevronRight size={16} className="mt-2 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : !selectedGroup && !selectedWallet && !selectedRelationship && !showCreateGroup && !showCreateWallet && !showCreateRelationship ? (
        <div className="flex items-center justify-between rounded-[20px] border border-slate-100 bg-white p-3 shadow-soft lg:rounded-lg">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
            onClick={() => {
              setTab(null);
              setSelectedGroup(null);
              setSelectedWallet(null);
              setSelectedRelationship(null);
              setRelationshipOverviewData(null);
              setSelectedFriend(null);
              setShowCreateGroup(false);
              setShowCreateWallet(false);
              setShowCreateRelationship(false);
              setGroupMemberIds(new Set());
              setWalletMemberIds(new Set());
              setRelationshipPartnerId("");
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Social
          </button>
          {(() => {
            const activeItem = tabs.find((item) => item.id === tab)!;
            const Icon = activeItem.icon;
            return (
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeItem.tone}`}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold text-slate-950">{activeItem.label}</p>
                  <p className="text-[10px] text-slate-500">{activeItem.count}</p>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {message && (
        <div className="fixed left-4 right-4 top-20 z-50 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_44px_rgba(15,23,42,0.16)] lg:left-auto lg:right-6 lg:w-96 lg:rounded-lg">
          {message}
        </div>
      )}
      {loading && tab !== null && <LoadingState />}

      {!loading && tab === "relationships" && (
        <div className="space-y-3">
          {showCreateRelationship ? (
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={createRelationship}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <SectionHeader
                  title={language === "en" ? "Create Relationship Finance" : "Buat Relationship Finance"}
                  caption={language === "en" ? "Invite one accepted friend as your partner." : "Undang satu teman aktif sebagai partner."}
                />
                <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" onClick={() => setShowCreateRelationship(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <Field label={language === "en" ? "Partner" : "Partner"}>
                  <select className="input" value={relationshipPartnerId} onChange={(event) => setRelationshipPartnerId(event.target.value)} required>
                    <option value="">{language === "en" ? "Select friend" : "Pilih teman"}</option>
                    {friends.filter((friend) => friend.status === "accepted").map((friend) => (
                      <option key={friend.userId} value={friend.userId}>{friend.fullName} @{friend.username}</option>
                    ))}
                  </select>
                </Field>
                <Field label={language === "en" ? "Workspace name" : "Nama workspace"}>
                  <input className="input" name="workspaceName" placeholder={language === "en" ? "Example: Shared Finance" : "Contoh: Keuangan Bersama"} required minLength={2} />
                </Field>
                <Field label={language === "en" ? "Relationship type" : "Jenis hubungan"}>
                  <select className="input" name="relationshipType" defaultValue="partner">
                    <option value="partner">Partner</option>
                    <option value="married_couple">{language === "en" ? "Married Couple" : "Pasangan menikah"}</option>
                  </select>
                </Field>
                <div className="rounded-2xl bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-slate-900">{language === "en" ? "Data sharing" : "Data yang dibagikan"}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    {language === "en"
                      ? "Choose what your partner can use inside Relationship Finance. This does not change your private transaction visibility outside this workspace."
                      : "Pilih data apa yang boleh dipakai partner di Relationship Finance. Ini tidak mengubah visibilitas transaksi pribadi di luar workspace ini."}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        [
                          language === "en" ? "Private" : "Private",
                          language === "en" ? "Not used or shown in shared analysis." : "Tidak dipakai atau ditampilkan di analisis bersama."
                        ],
                        [
                          language === "en" ? "Summary only" : "Ringkasan saja",
                          language === "en" ? "Only aggregate totals, no names or details." : "Hanya total agregat, tanpa nama dan detail."
                        ],
                        [
                          language === "en" ? "Shared" : "Dibagikan",
                          language === "en" ? "Can show relevant detail to your partner." : "Detail relevan dapat dilihat partner."
                        ]
                      ].map(([title, description]) => (
                        <div key={title} className="rounded-2xl bg-white p-3">
                          <p className="text-[11px] font-semibold text-slate-900">{title}</p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
                        </div>
                      ))}
                    </div>
                    {[
                      {
                        name: "incomeVisibility",
                        label: language === "en" ? "Income" : "Pemasukan",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total income only. Shared: income source/category can be used."
                          : "Private: disembunyikan. Ringkasan: total pemasukan saja. Dibagikan: sumber/kategori pemasukan bisa dipakai."
                      },
                      {
                        name: "expenseVisibility",
                        label: language === "en" ? "Expense" : "Pengeluaran",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total expense and main category only. Shared: category and trend details can be used."
                          : "Private: disembunyikan. Ringkasan: total pengeluaran dan kategori utama saja. Dibagikan: detail kategori dan tren bisa dipakai."
                      },
                      {
                        name: "accountsVisibility",
                        label: language === "en" ? "Accounts" : "Akun",
                        defaultValue: "private",
                        description: language === "en"
                          ? "Private: account names/balances hidden. Summary: total balance only. Shared: account name/type can be shown."
                          : "Private: nama akun/saldo disembunyikan. Ringkasan: total saldo saja. Dibagikan: nama dan tipe akun bisa terlihat."
                      },
                      {
                        name: "transactionsVisibility",
                        label: language === "en" ? "Transactions" : "Transaksi",
                        defaultValue: "private",
                        description: language === "en"
                          ? "Private: no transaction detail. Summary: totals by period/category only. Shared: selected transaction details can be shown."
                          : "Private: tidak ada detail transaksi. Ringkasan: total per periode/kategori saja. Dibagikan: detail transaksi pilihan bisa terlihat."
                      },
                      {
                        name: "assetsVisibility",
                        label: language === "en" ? "Assets" : "Aset",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total asset value only. Shared: asset name/type/value can be shown."
                          : "Private: disembunyikan. Ringkasan: total nilai aset saja. Dibagikan: nama, tipe, dan nilai aset bisa terlihat."
                      },
                      {
                        name: "liabilitiesVisibility",
                        label: language === "en" ? "Liabilities" : "Kewajiban",
                        defaultValue: "summary_only",
                        description: language === "en"
                          ? "Private: hidden. Summary: total debt and monthly payment only. Shared: liability name/type/due date can be shown."
                          : "Private: disembunyikan. Ringkasan: total utang dan cicilan bulanan saja. Dibagikan: nama, tipe, dan jatuh tempo bisa terlihat."
                      }
                    ].map((item) => (
                      <label key={item.name} className="rounded-2xl bg-white p-3">
                        <span className="text-[11px] font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.description}</span>
                        <select className="input mt-2" name={item.name} defaultValue={item.defaultValue}>
                          <option value="private">{language === "en" ? "Private" : "Private"}</option>
                          <option value="summary_only">{language === "en" ? "Summary only" : "Ringkasan saja"}</option>
                          <option value="shared">{language === "en" ? "Shared" : "Dibagikan"}</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full" disabled={!relationshipPartnerId}>
                  <UserPlus size={16} /> {language === "en" ? "Send invitation" : "Kirim undangan"}
                </button>
              </div>
            </form>
          ) : selectedRelationship ? (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                    onClick={() => {
                      setSelectedRelationship(null);
                      setRelationshipOverviewData(null);
                    }}
                  >
                    <ArrowLeft size={15} /> {language === "en" ? "Back" : "Kembali"}
                  </button>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                    {selectedRelationship.status === "active" ? (language === "en" ? "Active" : "Aktif") : (language === "en" ? "Pending" : "Menunggu")}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-emerald-100 text-sm font-semibold text-[#16A34A]">{currentUser.fullName.slice(0, 1).toUpperCase()}</span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-rose-100 text-sm font-semibold text-rose-700">{(selectedRelationship.partnerName ?? "?").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{currentUser.fullName} + {selectedRelationship.partnerName ?? "Partner"}</h2>
                    <p className="truncate text-xs text-slate-500">{selectedRelationship.workspaceName}</p>
                  </div>
                </div>
                {selectedRelationship.status !== "active" && (
                  <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedRelationship.incomingInvitation
                        ? (language === "en" ? "Invitation waiting for your response" : "Undangan menunggu respons Anda")
                        : (language === "en" ? "Waiting for partner response" : "Menunggu respons partner")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {selectedRelationship.incomingInvitation ? (
                        <>
                          <button className="btn-primary flex-1" onClick={() => respondRelationship(selectedRelationship, "accept")}>{language === "en" ? "Accept" : "Terima"}</button>
                          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600" onClick={() => respondRelationship(selectedRelationship, "decline")}>{language === "en" ? "Decline" : "Tolak"}</button>
                        </>
                      ) : (
                        <button className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700" onClick={() => respondRelationship(selectedRelationship, "cancel")}>{language === "en" ? "Cancel invitation" : "Batalkan undangan"}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedRelationship.status === "active" && relationshipOverviewData && (
                <>
                  <div className="rounded-[22px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.22)] lg:rounded-lg">
                    <p className="text-[10px] font-semibold uppercase text-white/70">{language === "en" ? "Shared financial condition" : "Kondisi keuangan bersama"}</p>
                    <h3 className="mt-1 text-xl font-semibold">{language === "en" ? "This month summary" : "Ringkasan bulan ini"}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Income" : "Pemasukan"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedIncome)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Expense" : "Pengeluaran"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedExpense)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Saving" : "Tabungan"}</p>
                        <p className="mt-1 text-sm font-semibold">{rupiah(relationshipOverviewData.summary.combinedSaving)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-3">
                        <p className="text-[11px] text-white/70">{language === "en" ? "Saving rate" : "Saving rate"}</p>
                        <p className="mt-1 text-sm font-semibold">{Number(relationshipOverviewData.summary.savingRate).toFixed(0)}%</p>
                      </div>
                    </div>
                    <button
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#16A34A]"
                      onClick={() => onOpenAssistantContext({
                        contextType: "relationship_finance",
                        relationshipFinanceId: selectedRelationship.id,
                        sourcePage: "overview",
                        label: selectedRelationship.workspaceName,
                        partnerName: selectedRelationship.partnerName ?? null
                      })}
                    >
                      <Bot size={16} /> {language === "en" ? "Analyze with Finance Copilot" : "Analisis dengan Finance Copilot"}
                    </button>
                  </div>

                  {(goalFormMode || goalAction) ? (
                    <div className="space-y-3">
                      <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                          onClick={() => {
                            setGoalFormMode(null);
                            setEditingGoal(null);
                            setGoalAction(null);
                          }}
                        >
                          <ArrowLeft size={15} /> {language === "en" ? "Back to Shared goals" : "Kembali ke Shared goals"}
                        </button>
                      </div>

                      {goalFormMode && (
                        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                          <SectionHeader
                            title={goalFormMode === "edit" ? (language === "en" ? "Edit goal" : "Edit goal") : (language === "en" ? "New goal" : "Goal baru")}
                            caption={language === "en" ? "Set the linked savings account and goal target." : "Atur akun tabungan tertaut dan target goal."}
                          />
                          <form key={editingGoal?.id ?? "new-goal"} className="grid gap-2 sm:grid-cols-2" onSubmit={submitRelationshipGoal}>
                            <input className="input sm:col-span-2" name="name" placeholder={language === "en" ? "Goal name, e.g. Home" : "Nama tujuan, contoh: Rumah"} defaultValue={editingGoal?.name ?? ""} required />
                            <select className="input" name="goalType" defaultValue={editingGoal?.goalType ?? "custom"}>
                              <option value="home">{language === "en" ? "Home" : "Rumah"}</option>
                              <option value="wedding">{language === "en" ? "Wedding" : "Pernikahan"}</option>
                              <option value="vacation">{language === "en" ? "Vacation" : "Liburan"}</option>
                              <option value="emergency_fund">{language === "en" ? "Emergency fund" : "Dana darurat"}</option>
                              <option value="custom">Custom</option>
                            </select>
                            <select className="input" name="priority" defaultValue={editingGoal?.priority ?? "medium"}>
                              <option value="medium">{language === "en" ? "Medium" : "Sedang"}</option>
                              <option value="high">{language === "en" ? "High" : "Tinggi"}</option>
                              <option value="critical">{language === "en" ? "Critical" : "Kritis"}</option>
                              <option value="low">{language === "en" ? "Low" : "Rendah"}</option>
                            </select>
                            <input className="input" name="targetAmount" inputMode="numeric" placeholder={language === "en" ? "Target amount" : "Nominal target"} defaultValue={editingGoal ? moneyInputValue(editingGoal.targetAmount) : ""} onInput={handleMoneyInput} required />
                            <input type="hidden" name="trackingMode" value="linked_account" />
                            <select className="input" name="linkedAccountId" defaultValue={editingGoal?.linkedAccountId ?? ""} required>
                              <option value="">{language === "en" ? "Select savings account" : "Pilih akun tabungan"}</option>
                              {accounts.filter((account) => account.isActive).map((account) => {
                                const alreadyLinked = Boolean(account.isRelationshipGoalAccount && account.id !== editingGoal?.linkedAccountId);
                                const owner = account.ownerName && account.canEdit === false ? ` � ${language === "en" ? "owned by" : "milik"} ${account.ownerName}` : "";
                                const linked = alreadyLinked ? ` � ${language === "en" ? "already linked" : "sudah tertaut"}` : "";
                                return (
                                  <option key={account.id} value={account.id} disabled={alreadyLinked}>
                                    {accountOptionLabel(account, { balance: true, language })}{owner}{linked}
                                  </option>
                                );
                              })}
                            </select>
                            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-[#15803D] sm:col-span-2">
                              {language === "en"
                                ? "Progress follows the selected savings account balance. One account can only be linked to one active goal."
                                : "Progress mengikuti saldo akun tabungan yang dipilih. Satu akun hanya bisa tertaut ke satu goal aktif."}
                            </p>
                            <input className="input" name="deadline" type="date" defaultValue={editingGoal?.deadline ? String(editingGoal.deadline).slice(0, 10) : ""} />
                            <button className="btn-primary">
                              {goalFormMode === "edit" ? (language === "en" ? "Save goal" : "Simpan goal") : (language === "en" ? "Add goal" : "Tambah goal")}
                            </button>
                          </form>
                        </div>
                      )}
                      {goalAction && (
                        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                          <div className="mb-4">
                            <p className="text-[10px] font-semibold uppercase text-[#16A34A]">
                              {goalAction.type === "contribution"
                                ? (language === "en" ? "Add contribution" : "Tambah kontribusi")
                                : goalAction.type === "adjustment"
                                  ? "Adjust Goal"
                                  : "Contribution History"}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-slate-950">{goalAction.goal.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {language === "en" ? "Progress is calculated from completed contributions." : "Progress dihitung dari kontribusi yang selesai."}
                            </p>
                          </div>

                          {goalAction.type !== "history" && (
                            <form className="mb-4 grid gap-2 sm:grid-cols-2" onSubmit={submitGoalContribution}>
                              <input
                                className="input"
                                name="amount"
                                inputMode="numeric"
                                placeholder={goalAction.type === "adjustment" ? (language === "en" ? "Amount, e.g. -500000" : "Nominal, contoh -500000") : (language === "en" ? "Amount" : "Nominal")}
                                required
                              />
                              <input className="input" name="contributionDate" type="date" defaultValue={isoDateInput()} />
                              <select className="input" name="contributorUserId" defaultValue={currentUser.id}>
                                {(relationshipOverviewData.relationship.members ?? []).filter((member) => member.status === "accepted").map((member) => (
                                  <option key={member.userId} value={member.userId}>{member.fullName}</option>
                                ))}
                              </select>
                              {goalAction.type === "contribution" ? (
                                <select className="input" name="sourceType" defaultValue="manual">
                                  <option value="manual">Manual</option>
                                  <option value="income_allocation">{language === "en" ? "Income allocation" : "Alokasi pemasukan"}</option>
                                  <option value="scheduled">{language === "en" ? "Scheduled" : "Terjadwal"}</option>
                                  <option value="shared_wallet">{language === "en" ? "Shared wallet" : "Dompet bersama"}</option>
                                </select>
                              ) : (
                                <input className="input" name="adjustmentReason" placeholder={language === "en" ? "Reason is required" : "Alasan wajib diisi"} required />
                              )}
                              <input className="input sm:col-span-2" name="notes" placeholder={language === "en" ? "Notes" : "Catatan"} />
                              <button className="btn-primary sm:col-span-2">
                                <Plus size={16} />
                                {goalAction.type === "adjustment"
                                  ? (language === "en" ? "Save adjustment" : "Simpan adjustment")
                                  : (language === "en" ? "Save contribution" : "Simpan kontribusi")}
                              </button>
                            </form>
                          )}

                          <div className="space-y-2">
                            {goalContributionLoading && <SocialSkeleton />}
                            {!goalContributionLoading && goalContributions.length === 0 && (
                              <EmptyState text={language === "en" ? "No contribution history yet." : "Belum ada histori kontribusi."} />
                            )}
                            {!goalContributionLoading && goalContributions.map((row) => {
                              const amount = Number(row.amount);
                              return (
                                <div key={row.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
                                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${amount >= 0 ? "bg-emerald-50 text-[#16A34A]" : "bg-rose-50 text-rose-700"}`}>
                                    {amount >= 0 ? <Plus size={16} /> : <CircleMinus size={16} />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-sm font-semibold ${amount >= 0 ? "text-[#16A34A]" : "text-rose-700"}`}>
                                        {amount >= 0 ? "+" : "-"}{rupiah(Math.abs(amount))}
                                      </p>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{row.status}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {localDate(row.contributionDate)} - {row.sourceType.replace(/_/g, " ")} - {row.contributorName ?? "-"}
                                    </p>
                                    {(row.notes || row.adjustmentReason) && (
                                      <p className="mt-1 text-[11px] leading-4 text-slate-500">{row.adjustmentReason ?? row.notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                  <div className="rounded-[22px] bg-white p-2 shadow-soft lg:rounded-lg">
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#F8FAFC] p-1">
                      {[
                        { id: "goals" as const, label: language === "en" ? "Shared goals" : "Shared goals" },
                        { id: "timeline" as const, label: language === "en" ? "Insight & timeline" : "Insight & timeline" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${relationshipDetailTab === item.id ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`}
                          onClick={() => setRelationshipDetailTab(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {relationshipDetailTab === "goals" && (
                    <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                      <SectionHeader
                        title={language === "en" ? "Shared goals" : "Tujuan bersama"}
                        caption={language === "en" ? "Track goals without exposing private details." : "Pantau target tanpa membuka detail private."}
                        action={(
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={() => {
                              setGoalFormMode("add");
                              setEditingGoal(null);
                              setGoalAction(null);
                            }}
                          >
                            <Plus size={14} /> {language === "en" ? "Add goal" : "Tambah goal"}
                          </button>
                        )}
                      />
                      <div className="space-y-2">
                        {relationshipOverviewData.goals.length === 0 && <EmptyState text={language === "en" ? "No shared goal yet." : "Belum ada tujuan bersama."} />}
                        {relationshipOverviewData.goals.map((goal) => (
                          <div key={goal.id} className="rounded-2xl border border-slate-100 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{goal.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{rupiah(goal.currentAmount)} / {rupiah(goal.targetAmount)}</p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-[#16A34A]">{Number(goal.progress).toFixed(0)}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${Math.min(Number(goal.progress), 100)}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                              <span>{language === "en" ? "Remaining" : "Sisa"} {rupiah(goal.remainingAmount)}</span>
                              {goal.monthlyRequired && <span>{rupiah(goal.monthlyRequired)}/{language === "en" ? "month" : "bulan"}</span>}
                            </div>
                            <div className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold text-slate-600">
                              {language === "en" ? "Linked" : "Tertaut"}: {goal.linkedAccountName ?? "-"}
                              {goal.linkedAccountOwnerName && goal.linkedAccountOwnerName !== currentUser.fullName ? ` ${language === "en" ? "owned by" : "milik"} ${goal.linkedAccountOwnerName}` : ""}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                className="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-semibold text-[#16A34A]"
                                onClick={() => {
                                  setGoalFormMode("edit");
                                  setEditingGoal(goal);
                                  setGoalAction(null);
                                }}
                              >
                                Edit
                              </button>
                              {goal.trackingMode !== "linked_account" && (
                                <button type="button" className="rounded-xl bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700" onClick={() => openGoalHistory(goal, "contribution")}>
                                  {language === "en" ? "Add" : "Tambah"}
                                </button>
                              )}
                              <button type="button" className={`${goal.trackingMode === "linked_account" ? "col-span-2" : ""} rounded-xl bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600`} onClick={() => openGoalHistory(goal, "history")}>
                                History
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {relationshipDetailTab === "timeline" && (
                    <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                      <SectionHeader title={language === "en" ? "Insights & timeline" : "Insight & timeline"} caption={language === "en" ? "Private transactions are never shown here." : "Transaksi private tidak ditampilkan di sini."} />
                      <label className="mb-3 block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                          {language === "en" ? "Goal filter" : "Filter goal"}
                        </span>
                        <select
                          className="input"
                          value={relationshipGoalFilterId}
                          onChange={(event) => setRelationshipGoalFilterId(event.target.value)}
                        >
                          <option value="">{language === "en" ? "All goals" : "Semua goal"}</option>
                          {relationshipOverviewData.goals.map((goal) => (
                            <option key={goal.id} value={goal.id}>{goal.name}</option>
                          ))}
                        </select>
                      </label>
                      <div className="space-y-2">
                        {filteredRelationshipGoal && (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{filteredRelationshipGoal.name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {rupiah(filteredRelationshipGoal.currentAmount)} / {rupiah(filteredRelationshipGoal.targetAmount)}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#16A34A]">
                                {Number(filteredRelationshipGoal.progress).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}
                        {filteredRelationshipInsights.length === 0 && filteredRelationshipTimeline.length === 0 && (
                          <EmptyState text={language === "en" ? "No insight or timeline for this filter yet." : "Belum ada insight atau timeline untuk filter ini."} />
                        )}
                        {filteredRelationshipInsights.map((insight) => (
                          <div key={insight.type} className="rounded-2xl bg-[#F8FAFC] p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {insight.type === "cashflow_risk"
                                ? (language === "en" ? "Cashflow needs attention" : "Arus kas perlu diperhatikan")
                                : insight.type === "goal_needs_attention"
                                  ? (language === "en" ? "Goal needs attention" : "Target perlu diperhatikan")
                                  : insight.type === "saving_rate"
                                    ? (language === "en" ? "Saving rate insight" : "Insight saving rate")
                                    : (language === "en" ? "More data needed" : "Data belum cukup")}
                              </p>
                          </div>
                        ))}
                        {filteredRelationshipTimeline.map((event) => (
                          <div key={event.id} className="flex items-start gap-3 rounded-2xl px-2 py-2">
                            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><Sparkles size={15} /></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900">{event.eventType.replace(/_/g, " ")}</p>
                              <p className="text-[10px] text-slate-500">{localDate(event.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#16A34A]">Relationship Finance</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">{language === "en" ? "Plan the future together" : "Rencanakan masa depan bersama"}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {language === "en"
                        ? "Manage shared goals, budget, assets, liabilities, and Finance Copilot insights with your partner."
                        : "Kelola tujuan, budget, aset, kewajiban, dan insight Finance Copilot bersama partner."}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><HeartPulse size={21} /></span>
                </div>
                <button className="btn-primary mt-4 w-full" onClick={() => setShowCreateRelationship(true)}>
                  <Plus size={16} /> {language === "en" ? "Create Relationship Finance" : "Buat Relationship Finance"}
                </button>
              </div>
              {relationships.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-5 text-center shadow-soft lg:rounded-lg">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><HeartPulse size={22} /></span>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{language === "en" ? "No workspace yet" : "Belum ada workspace"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {language === "en" ? "Start by inviting an accepted friend." : "Mulai dengan mengundang teman yang sudah diterima."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {relationships.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="ripple-card flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-soft transition active:scale-[0.99] lg:rounded-lg"
                      onClick={() => openRelationship(item).catch(() => setMessage(null))}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><HeartPulse size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">{item.workspaceName}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{item.partnerName ?? "Partner"} - {item.status}</span>
                      </span>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "friends" && (
        <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={searchPerson}>
              <SectionHeader title="Tambah teman" caption="Cari lewat username, email, telepon, atau kode QR." />
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={friendSearchRef}
                    className="input min-w-0 flex-1"
                    name="query"
                    value={friendSearchQuery}
                    onChange={(event) => {
                      setFriendSearchQuery(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="Cari username atau email..."
                    autoComplete="off"
                    required
                  />
                  <button className="btn-primary shrink-0" aria-label="Cari pengguna" disabled={friendSearchLoading}>
                    {friendSearchLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  </button>
                </div>
                {friendSearchQuery.trim().length >= 2 && (
                  <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                    {friendSearchLoading && searchResults.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <Loader2 className="animate-spin text-[#16A34A]" size={15} />
                        Mencari pengguna...
                      </div>
                    ) : searchResults.length > 0 ? searchResults.map((person) => {
                      const statusLabels: Record<string, string> = {
                        self: "Akun Anda",
                        pending: "Menunggu",
                        incoming: "Perlu respons",
                        accepted: "Teman",
                        rejected: "Tambah lagi",
                        none: "Tambah"
                      };
                      const canAdd = person.relationshipStatus === "none" || person.relationshipStatus === "rejected";
                      return (
                        <div key={person.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                          {person.avatarUrl
                            ? <img src={person.avatarUrl} className="h-9 w-9 shrink-0 rounded-xl object-cover" alt="" />
                            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={16} /></span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">{person.fullName}</p>
                            <p className="truncate text-[10px] text-slate-500">
                              @{person.username}{person.email ? ` - ${person.email}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                              canAdd ? "bg-emerald-50 text-[#16A34A]" : "bg-slate-100 text-slate-400"
                            }`}
                            disabled={!canAdd}
                            onClick={() => runAction(
                              async () => {
                                await request("/social/friends/request", {
                                method: "POST",
                                body: JSON.stringify({
                                  identifier: person.username,
                                  targetUserId: person.id
                                })
                                });
                                setFriendSearchQuery("");
                                setSearchResults([]);
                                setFriendSearchAttempted(false);
                              },
                              "Permintaan pertemanan dikirim"
                            )}
                          >
                            {statusLabels[person.relationshipStatus] ?? "Terhubung"}
                          </button>
                        </div>
                      );
                    }) : friendSearchAttempted ? (
                      <div className="px-3 py-3 text-xs text-slate-500">
                        Pengguna tidak ditemukan atau tidak mengizinkan pencarian dengan data tersebut.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
                  {qrDataUrl
                    ? <img src={qrDataUrl} className="h-44 w-44 rounded-xl" alt="QR akun" />
                    : <span className="flex h-44 w-44 items-center justify-center rounded-xl bg-slate-50 text-[#16A34A]"><QrCode size={52} /></span>}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">@{currentUser.username ?? "atur-username"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700" onClick={shareAccountQr}>
                    <Share2 size={15} /> Bagikan QR
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 py-2.5 text-xs font-semibold text-white">
                    <QrCode size={15} /> Scan QR
                    <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Teman & permintaan" caption={`${friends.length} hubungan`} />
            <div className="space-y-2">
              {friends.length === 0 && (
                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]"><UserPlus size={20} /></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Belum ada teman</p>
                      <p className="mt-0.5 text-xs text-slate-500">Mulai terhubung untuk mencatat transaksi bersama.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={() => friendSearchRef.current?.focus()}>
                      <Search size={15} className="text-[#16A34A]" /> Cari username
                    </button>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left">
                      <QrCode size={15} className="text-[#16A34A]" /> Scan QR
                      <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanQrFile} />
                    </label>
                    <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left" onClick={shareAccountQr}>
                      <Share2 size={15} className="text-[#16A34A]" /> Undang teman
                    </button>
                  </div>
                  <button type="button" className="mt-3 w-full rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-semibold text-white" onClick={() => {
                    friendSearchRef.current?.focus();
                    friendSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}>Tambah Teman</button>
                </div>
              )}
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} className="h-10 w-10 rounded-xl object-cover" alt="" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]"><UserRound size={17} /></span>}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={friend.status !== "accepted"}
                    onClick={async () => setSelectedFriend({
                      ...await request<Record<string, unknown>>(`/social/friends/profile/${friend.userId}`),
                      friendshipId: friend.id,
                      userId: friend.userId
                    })}
                  >
                    <p className="truncate text-sm font-semibold">{friend.fullName}</p>
                    <p className="text-xs text-slate-500">@{friend.username} � {friend.incoming ? "Menunggu jawaban Anda" : socialEnumLabel(friend.status)}</p>
                  </button>
                  {friend.incoming ? (
                    <div className="flex gap-1">
                      <button className="rounded-full bg-emerald-50 p-2 text-[#16A34A]" onClick={() => runAction(
                        () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                        "Pertemanan diterima"
                      )}><CheckCircle2 size={15} /></button>
                      <button className="rounded-full bg-rose-50 p-2 text-rose-600" onClick={() => runAction(
                        () => request(`/social/friends/${friend.id}/respond`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                        "Permintaan ditolak"
                      )}><X size={15} /></button>
                    </div>
                  ) : friend.status === "accepted" ? (
                    <ChevronRight size={16} className="text-slate-300" />
                  ) : null}
                </div>
              ))}
            </div>
            {selectedFriend && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{selectedFriend.fullName}</p>
                    <p className="text-xs text-slate-500">@{selectedFriend.username} � {selectedFriend.commonGroups} grup bersama</p>
                  </div>
                  <button onClick={() => setSelectedFriend(null)}><X size={15} /></button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Utang/piutang dengan Anda</p>
                <p className={`text-lg font-semibold ${Number(selectedFriend.balance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                  {rupiah(Math.abs(Number(selectedFriend.balance)))}
                </p>
                <div className="mt-3 space-y-2">
                  {selectedFriend.sharedTransactions?.map((row: any) => (
                    <div key={row.id} className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-xs">
                      <span>{row.description} � {row.groupName}</span><span className="font-semibold">{rupiah(row.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                  <button className="rounded-xl bg-white px-2 py-2 text-[11px] font-semibold text-slate-600" onClick={() => {
                    if (!window.confirm(`Hapus ${selectedFriend.fullName} dari daftar teman?`)) return;
                    runAction(
                      () => request(`/social/friends/${selectedFriend.friendshipId}`, { method: "DELETE" }),
                      "Teman berhasil dihapus"
                    ).then(() => setSelectedFriend(null));
                  }}>Hapus teman</button>
                  <button className="rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-semibold text-rose-600" onClick={() => {
                    if (!window.confirm(`Blokir ${selectedFriend.fullName}?`)) return;
                    runAction(
                      () => request(`/social/friends/${selectedFriend.friendshipId}/block`, { method: "POST" }),
                      "Pengguna berhasil diblokir"
                    ).then(() => setSelectedFriend(null));
                  }}>Blokir</button>
                  <button className="rounded-xl bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-700" onClick={() => {
                    const reason = window.prompt("Alasan melaporkan pengguna:");
                    if (!reason?.trim()) return;
                    runAction(
                      () => request(`/social/people/${selectedFriend.userId}/report`, {
                        method: "POST",
                        body: JSON.stringify({ reason: reason.trim() })
                      }),
                      "Laporan berhasil dikirim"
                    );
                  }}>Laporkan</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "groups" && !selectedGroup && (
        <div className="space-y-3">
          {!showCreateGroup && (
            <button className="btn-primary w-full" onClick={() => setShowCreateGroup(true)}><Plus size={16} /> Buat grup</button>
          )}
          {showCreateGroup && (
            <>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-white active:scale-95"
              onClick={() => {
                setShowCreateGroup(false);
                setGroupMemberIds(new Set());
              }}
            >
              <ArrowLeft size={16} /> Kembali ke grup
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runAction(
                () => request("/social/groups", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                    memberIds: [...groupMemberIds]
                  })
                }),
                "Grup berhasil dibuat"
              ).then(() => {
                setShowCreateGroup(false);
                setGroupMemberIds(new Set());
              });
            }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Users size={20} /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat grup baru</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Pilih teman yang akan berbagi pengeluaran.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama grup">
                  <input className="input" name="name" placeholder="Contoh: Trip Bali" required />
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-24 resize-none" name="description" placeholder="Tujuan atau catatan singkat grup" />
                </Field>
                <SocialFriendPicker
                  friends={friends}
                  selectedIds={groupMemberIds}
                  onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}
                />
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-[11px] leading-4 text-slate-500">
                  Teman yang dipilih akan menerima undangan dan bergabung setelah menyetujuinya.
                </div>
                <button className="btn-primary w-full"><Users size={16} /> Buat grup</button>
              </div>
            </form>
            </>
          )}
          {!showCreateGroup && <div className="grid gap-2 md:grid-cols-2">
            {groups.length === 0 && <EmptyState text="Belum ada grup keuangan." />}
            {groups.map((group) => (
              <div key={group.id} className="rounded-[22px] bg-white p-4 text-left shadow-soft lg:rounded-lg">
                <button className="w-full text-left" disabled={group.status === "pending"} onClick={() => openGroup(group.id)}>
                  <div className="flex justify-between gap-3"><p className="font-semibold">{group.name}</p>{group.status !== "pending" && <ChevronRight size={16} className="text-slate-300" />}</div>
                  <p className="mt-1 text-xs text-slate-500">{group.status === "pending" ? "Undangan grup menunggu jawaban" : `${group.memberCount} anggota � ${socialEnumLabel(group.role)}`}</p>
                  {group.status !== "pending" && (
                    <p className={`mt-3 text-sm font-semibold ${Number(group.myBalance) >= 0 ? "text-[#16A34A]" : "text-rose-600"}`}>
                      Posisi Anda {Number(group.myBalance) >= 0 ? "+" : "-"}{rupiah(Math.abs(Number(group.myBalance)))}
                    </p>
                  )}
                </button>
                {group.status === "pending" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                      () => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "accepted" }) }),
                      "Undangan grup diterima"
                    )}>Terima</button>
                    <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600" onClick={() => runAction(
                      () => request(`/social/groups/${group.id}/invite`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                      "Undangan grup ditolak"
                    )}>Tolak</button>
                  </div>
                )}
              </div>
            ))}
          </div>}
        </div>
      )}

      {!loading && tab === "groups" && selectedGroup && (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" onClick={() => setSelectedGroup(null)}><ArrowLeft size={14} /> Kembali ke grup</button>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title={selectedGroup.name} caption={`${selectedGroup.members.filter((item) => item.status === "accepted").length} anggota`} />
            <div className="flex -space-x-2">
              {selectedGroup.members.filter((item) => item.status === "accepted").slice(0, 8).map((member) => (
                <span key={member.id} title={member.fullName} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-[11px] font-semibold text-[#16A34A]">
                  {member.fullName.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
            <form className="mt-4" onSubmit={(event) => {
              event.preventDefault();
              runAction(
                () => Promise.all([...groupMemberIds].map((userId) =>
                  request(`/social/groups/${selectedGroup.id}/members`, {
                    method: "POST",
                    body: JSON.stringify({ userId })
                  })
                )),
                "Undangan anggota dikirim"
              ).then(() => {
                setGroupMemberIds(new Set());
                openGroup(selectedGroup.id);
              });
            }}>
              <SocialFriendPicker
                friends={friends}
                selectedIds={groupMemberIds}
                excludedIds={new Set(selectedGroup.members.map((member) => member.id))}
                title="Tambah teman ke grup"
                onToggle={(friendId) => toggleSelectedFriend(setGroupMemberIds, friendId)}
              />
              <button className="btn-secondary mt-2 w-full" disabled={groupMemberIds.size === 0}>
                <UserPlus size={15} /> Undang {groupMemberIds.size || ""} teman
              </button>
            </form>
            <button className="btn-primary mt-3 w-full" onClick={() => {
              setEditingGroupExpense(null);
              setShowExpenseForm((value) => !value);
            }}><Plus size={16} /> Catat pengeluaran grup</button>
          </div>

          {showExpenseForm && (
            <form key={editingGroupExpense?.id ?? "new-group-expense"} className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const participantIds = form.getAll("participantIds").map(String);
              runAction(
                () => request(editingGroupExpense ? `/social/expenses/${editingGroupExpense.id}` : `/social/groups/${selectedGroup.id}/expenses`, {
                  method: editingGroupExpense ? "PUT" : "POST",
                  body: JSON.stringify({
                    description: String(form.get("description")),
                    amount: String(form.get("amount")),
                    paidBy: String(form.get("paidBy")),
                    participantIds
                  })
                }),
                editingGroupExpense ? "Pengeluaran diubah dan meminta konfirmasi ulang" : "Pengeluaran grup berhasil ditambahkan"
              ).then(() => {
                setEditingGroupExpense(null);
                openGroup(selectedGroup.id);
              });
            }}>
              <SectionHeader
                title={editingGroupExpense ? "Edit split bill" : "Split bill"}
                caption={editingGroupExpense ? "Perubahan nominal meminta konfirmasi ulang semua pihak terdampak." : "Bagian dibagi rata dan sisa pembulatan dibagikan otomatis."}
                action={editingGroupExpense ? <button type="button" onClick={() => { setEditingGroupExpense(null); setShowExpenseForm(false); }}><X size={15} /></button> : undefined}
              />
              <div className="space-y-3">
                <input className="input" name="description" placeholder="Contoh: Makan malam" defaultValue={editingGroupExpense?.description ?? ""} required />
                <input className="input" name="amount" inputMode="numeric" placeholder="Total nominal" defaultValue={editingGroupExpense ? moneyInputValue(editingGroupExpense.amount) : ""} onInput={handleMoneyInput} required />
                <Field label="Dibayar oleh">
                  <select className="input" name="paidBy" defaultValue={editingGroupExpense?.paidBy ?? currentUser.id}>
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">Yang ikut menikmati</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedGroup.members.filter((item) => item.status === "accepted").map((member) => (
                      <label key={member.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                        <input
                          type="checkbox"
                          name="participantIds"
                          value={member.id}
                          defaultChecked={!editingGroupExpense || editingGroupExpense.participants.some((participant) => participant.userId === member.id)}
                        /> {member.fullName}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full">Simpan & split otomatis</button>
              </div>
            </form>
          )}

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Penyelesaian minimum" caption="Simplify debt mengurangi jumlah transfer." />
            <div className="space-y-2">
              {selectedGroup.simplifiedDebts.length === 0 && <EmptyState text="Semua anggota sudah seimbang." />}
              {selectedGroup.simplifiedDebts.map((debt, index) => (
                <div key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span className="min-w-0"><strong>{debt.fromName}</strong> membayar <strong>{debt.toName}</strong></span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-rose-600">{rupiah(debt.amount)}</span>
                    {debt.fromUserId === currentUser.id && (
                      <button className="rounded-full bg-white px-2 py-1 font-semibold text-[#16A34A]" onClick={() => runAction(
                        () => request(`/social/groups/${selectedGroup.id}/settlements`, {
                          method: "POST",
                          body: JSON.stringify({ toUserId: debt.toUserId, amount: debt.amount })
                        }),
                        "Pembayaran menunggu konfirmasi penerima"
                      )}>Bayar</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Riwayat grup" caption="Hanya transaksi anggota grup." />
            <div className="space-y-2">
              {selectedGroup.expenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{expense.description}</p><p className="text-sm font-semibold">{rupiah(expense.amount)}</p></div>
                  <p className="mt-1 text-xs text-slate-500">Dibayar {expense.paidByName} � {localDate(expense.expenseDate)}</p>
                  {(expense.createdBy === currentUser.id || ["owner", "admin"].includes(selectedGroup.role)) && (
                    <button className="mt-2 text-xs font-semibold text-[#16A34A]" onClick={() => {
                      setEditingGroupExpense(expense);
                      setShowExpenseForm(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>Edit transaksi</button>
                  )}
                </div>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const messageValue = String(new FormData(formElement).get("message"));
              runAction(
                () => request(`/social/comments/group/${selectedGroup.id}`, { method: "POST", body: JSON.stringify({ message: messageValue }) }),
                "Komentar ditambahkan"
              ).then(() => {
                formElement.reset();
                openGroup(selectedGroup.id);
              });
            }}>
              <input className="input min-w-0 flex-1" name="message" placeholder="Komentar grup" required />
              <button className="btn-secondary shrink-0"><MessageCircle size={15} /></button>
            </form>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
            <SectionHeader title="Audit history" caption="Perubahan transaksi tercatat dan dapat ditelusuri." />
            <div className="space-y-2">
              {selectedGroup.auditHistory.length === 0 && <EmptyState text="Belum ada perubahan tercatat." />}
              {selectedGroup.auditHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <span><strong>{entry.actorName ?? "Sistem"}</strong> � {entry.action === "CREATE" ? "membuat transaksi" : "mengubah transaksi dan meminta konfirmasi ulang"}</span>
                  <span className="shrink-0 text-slate-400">{localDate(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "wallets" && !selectedWallet && (
        <div className="space-y-3">
          {showCreateWallet && (
            <>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-slate-600 transition hover:bg-white active:scale-95"
              onClick={() => {
                setShowCreateWallet(false);
                setWalletMemberIds(new Set());
              }}
            >
              <ArrowLeft size={16} /> Kembali ke dompet bersama
            </button>
            <form className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              runAction(
                () => request("/social/wallets", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                    spendingLimit: String(form.get("spendingLimit") || "") || undefined,
                    requireApproval: form.get("requireApproval") === "on",
                    memberIds: [...walletMemberIds],
                    adminIds: [...walletAdminIds],
                    storageAccountId: walletStorageMode === "account" ? String(form.get("storageAccountId") || "") || null : null,
                    storageType: walletStorageMode === "account" ? "bank" : String(form.get("storageType")),
                    storageProvider: String(form.get("storageProvider") || "") || undefined,
                    storageAccountNumber: String(form.get("storageAccountNumber") || "") || undefined
                  })
                }),
                "Dompet bersama dibuat"
              ).then(() => {
                setShowCreateWallet(false);
                setWalletMemberIds(new Set());
                setWalletAdminIds(new Set());
                setWalletStorageAccountId("");
              });
            }}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Wallet size={20} /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Buat dompet bersama</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Saldo bersama tetap terpisah dari akun pribadi.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Nama dompet">
                  <input className="input" name="name" placeholder="Contoh: Kas rumah" required />
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea className="input min-h-20 resize-none" name="description" placeholder="Tujuan penggunaan dompet" />
                </Field>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-700">Tempat dana</p>
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "account" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("account")}>Pilih akun</button>
                    <button type="button" className={`rounded-xl px-3 py-2 text-xs font-semibold ${walletStorageMode === "manual" ? "bg-white text-[#16A34A] shadow-sm" : "text-slate-500"}`} onClick={() => setWalletStorageMode("manual")}>Input manual</button>
                  </div>
                </div>
                {walletStorageMode === "account" ? (
                  <Field label="Akun penyimpanan">
                    <select
                      className="input"
                      name="storageAccountId"
                      required={walletStorageMode === "account"}
                      value={walletStorageAccountId}
                      onChange={(event) => setWalletStorageAccountId(event.target.value)}
                    >
                      <option value="" disabled>Pilih akun Anda</option>
                      {accounts.filter((account) => account.isActive && !account.isSharedWalletAccount).map((account) => (
                        <option key={account.id} value={account.id}>
                          {accountOptionLabel(account, { balance: true, language })}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <>
                  <div className="grid grid-cols-2 gap-2">
                  <Field label="Jenis penyimpanan">
                    <select className="input" name="storageType" defaultValue="bank">
                      <option value="bank">Bank</option>
                      <option value="e_wallet">E-money / E-wallet</option>
                      <option value="cash">Tunai</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </Field>
                  <Field label="Bank / penyedia">
                    <input className="input" name="storageProvider" placeholder="BCA, GoPay, DANA" />
                  </Field>
                  </div>
                <Field label="Nomor rekening / e-money">
                  <input className="input" name="storageAccountNumber" inputMode="numeric" placeholder="Nomor tujuan penyimpanan dana" />
                </Field>
                  </>
                )}
                {walletStorageMode === "account" && selectedWalletStorageAccount && (
                  <>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] leading-4 text-amber-800">
                      Akun ini akan menjadi tempat dana dompet bersama dan tidak dapat digunakan untuk transaksi pribadi selama masih terhubung.
                    </div>
                    {selectedWalletStorageAccount.accountType !== "cash"
                      && (!selectedWalletStorageAccount.providerName || !selectedWalletStorageAccount.accountNumber) && (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Bank / penyedia">
                          <input
                            className="input"
                            name="storageProvider"
                            placeholder="BCA, GoPay, DANA"
                            defaultValue={selectedWalletStorageAccount.providerName ?? ""}
                            required
                          />
                        </Field>
                        <Field label="Nomor rekening / e-money">
                          <input
                            className="input"
                            name="storageAccountNumber"
                            placeholder="Nomor akun"
                            defaultValue={selectedWalletStorageAccount.accountNumber ?? ""}
                            required
                          />
                        </Field>
                      </div>
                    )}
                  </>
                )}
                <Field label="Batas pengeluaran (opsional)">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input className="input pl-9" name="spendingLimit" inputMode="numeric" placeholder="0" onInput={handleMoneyInput} />
                  </div>
                </Field>
                <SocialFriendPicker
                  friends={friends}
                  selectedIds={walletMemberIds}
                  onToggle={(friendId) => toggleSelectedFriend(setWalletMemberIds, friendId)}
                />
                {walletMemberIds.size > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-700">Pilih admin dompet</p>
                    <div className="flex flex-wrap gap-2">
                      {friends
                        .filter((friend) => walletMemberIds.has(friend.userId))
                        .map((friend) => {
                          const admin = walletAdminIds.has(friend.userId);
                          return (
                            <button
                              key={friend.userId}
                              type="button"
                              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                admin ? "bg-[#16A34A] text-white" : "bg-slate-100 text-slate-600"
                              }`}
                              onClick={() => toggleSelectedFriend(setWalletAdminIds, friend.userId)}
                            >
                              {friend.fullName}{admin ? " � Admin" : ""}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Persetujuan pengeluaran</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">Pengeluaran yang dicatat member perlu ditinjau owner atau admin sebelum mengurangi saldo.</span>
                  </span>
                  <input className="h-4 w-4 accent-[#16A34A]" type="checkbox" name="requireApproval" defaultChecked />
                </label>
                <button className="btn-primary w-full"><Wallet size={16} /> Buat dompet bersama</button>
              </div>
            </form>
            </>
          )}
          {!showCreateWallet && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-emerald-600 via-[#16A34A] to-teal-700 p-5 text-white shadow-[0_18px_44px_rgba(22,163,74,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">Keuangan kolaboratif</p>
                    <h2 className="mt-2 text-xl font-semibold">Dompet bersama</h2>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-emerald-50/85">Kelola kas, tabungan, atau tujuan finansial bersama tanpa mencampur saldo pribadi.</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Wallet size={21} /></span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                  <div><p className="text-[10px] text-emerald-100">Aktif</p><p className="mt-1 text-sm font-semibold">{activeWallets.length}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Saldo dikelola</p><p className="mt-1 truncate text-sm font-semibold">{rupiah(activeWalletBalance)}</p></div>
                  <div><p className="text-[10px] text-emerald-100">Perlu ditinjau</p><p className="mt-1 text-sm font-semibold">{pendingWalletApprovals}</p></div>
                </div>
                <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#15803D] shadow-sm transition active:scale-[0.98]" onClick={() => setShowCreateWallet(true)}><Plus size={16} /> Buat dompet bersama</button>
              </section>

              {pendingWallets.length > 0 && (
                <section>
                  <SectionHeader title="Menunggu respons" caption={`${pendingWallets.length} undangan perlu Anda jawab`} />
                  <div className="space-y-2">
                    {pendingWallets.map((wallet) => {
                      const responding = walletInviteActionId === wallet.id;
                      return (
                        <div key={wallet.id} className="rounded-[22px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                          <div className="flex gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Wallet size={19} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{wallet.description || "Anda diundang untuk ikut mengelola dompet ini."}</p>
                              <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">Peran: {socialEnumLabel(wallet.role)}</span>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" disabled={responding} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 text-xs font-semibold text-white disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "accepted")}>{responding ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} Terima</button>
                            <button type="button" disabled={responding} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-60" onClick={() => respondWalletInvitation(wallet, "rejected")}>Tolak</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <SectionHeader title="Dompet Anda" caption={activeWallets.length ? "Pilih dompet untuk melihat transaksi dan anggota." : "Buat dompet pertama untuk mulai mengelola dana bersama."} />
                {activeWallets.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={21} /></span>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Belum ada dompet aktif</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">Gunakan untuk kas rumah, tabungan liburan, atau pengeluaran bersama teman.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeWallets.map((wallet) => (
                      <button key={wallet.id} type="button" className="group rounded-[22px] border border-slate-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]" onClick={() => openWallet(wallet.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]"><Wallet size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{wallet.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{wallet.description || "Dompet bersama"}</p></div></div>
                          <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#16A34A]" />
                        </div>
                        <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{rupiah(wallet.balance)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="min-w-0 truncate text-[11px] text-slate-500">{wallet.storageAccountName || wallet.storageProvider || (wallet.storageType === "cash" ? "Penyimpanan tunai" : "Penyimpanan belum diatur")}</span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${wallet.pendingCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-[#15803D]"}`}>{wallet.pendingCount > 0 ? `${wallet.pendingCount} perlu approval` : socialEnumLabel(wallet.role)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "wallets" && selectedWallet && (
        <div className="space-y-3">
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" onClick={() => {
            setShowWalletEditModal(false);
            setShowWalletMembersModal(false);
            setSelectedWallet(null);
          }}><ArrowLeft size={14} /> Kembali</button>
          <div className="rounded-[22px] bg-[#16A34A] p-4 text-white shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/70">Saldo bersama � tidak termasuk saldo pribadi</p>
                <h3 className="mt-1 text-2xl font-semibold">{rupiah(selectedWallet.balance)}</h3>
                <p className="mt-1 text-xs text-white/70">
                  {selectedWallet.name} � {selectedWallet.members.filter((member) => member.status === "accepted").length} anggota
                </p>
              </div>
              {["owner", "admin"].includes(selectedWallet.role) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowWalletEditModal(true)}
                  >
                    <Settings size={14} /> Edit akun
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => setShowWalletMembersModal(true)}
                  >
                    <Users size={14} /> Edit anggota
                  </button>
                </div>
              )}
            </div>
            {selectedWallet.storageType === "gold" && (
              <div className="mt-3 rounded-2xl bg-white/10 px-3 py-3">
                <p className="text-[10px] font-medium uppercase text-white/60">Saldo Emas</p>
                <p className="mt-1 text-sm font-semibold">
                  {Number(selectedWallet.goldWeightGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram
                </p>
                <p className="mt-1 text-xs text-white/75">
                  Nilai setara: {rupiah(selectedWallet.goldBalanceValue || selectedWallet.balance)}
                </p>
                {selectedWallet.goldPricePerGram && (
                  <p className="mt-1 text-[11px] text-white/75">
                    Harga jual Pegadaian: Rp{Number(selectedWallet.goldPricePerGram).toLocaleString("id-ID")}/gram
                  </p>
                )}
                {selectedWallet.goldPriceFetchedAt && (
                  <p className="mt-1 text-[11px] text-white/75">
                    Update terakhir: {localDate(selectedWallet.goldPriceFetchedAt)}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Setoran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalDeposit)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Pengeluaran</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.totalExpense)}</p>
              </div>
              <div className="min-w-0 px-3">
                <p className="text-[9px] text-white/65">Saldo bersih</p>
                <p className="mt-1 truncate text-xs font-semibold">{rupiah(selectedWallet.balance)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase text-white/60">Dana disimpan di</p>
              <p className="mt-1 text-[10px] text-white/65">
                {selectedWallet.storageType === "gold"
                  ? "Emas"
                  : selectedWallet.storageType === "e_wallet"
                  ? "E-wallet / e-money"
                  : selectedWallet.storageType === "bank"
                  ? "Rekening bank"
                  : selectedWallet.storageType === "cash"
                  ? "Tunai"
                  : "Penyimpanan lainnya"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {selectedWallet.storageAccountName || selectedWallet.storageProvider || (selectedWallet.storageType === "cash" ? "Tunai" : selectedWallet.storageType)}
              </p>
              {selectedWallet.storageAccountNumber && <p className="mt-0.5 text-xs text-white/75">{selectedWallet.storageAccountNumber}</p>}
              <p className="mt-2 text-[11px] text-white/75">
                Split biaya: {selectedWallet.expenseSplitRule === "percentage" ? "Persentase" : selectedWallet.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                {selectedWallet.activeUntil ? ` � Aktif sampai ${localDate(selectedWallet.activeUntil)}` : " � Aktif tanpa batas waktu"}
              </p>
            </div>
          </div>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader
              title="Anggota dompet"
              caption="Lihat anggota aktif, role, dan akses edit anggota dalam satu tempat."
              action={["owner", "admin"].includes(selectedWallet.role) ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletMembersModal(true)}>
                  <UserPlus size={14} /> Kelola anggota
                </button>
              ) : undefined}
            />
            <div className="space-y-3">
              {selectedWallet.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.displayName || member.fullName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">@{member.username} � {socialEnumLabel(member.role)} � {socialEnumLabel(member.status)}</p>
                      {member.memberNote && <p className="mt-1 text-[11px] text-slate-500">{member.memberNote}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${member.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {member.status === "pending" ? "Menunggu" : socialEnumLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {showWalletEditModal && ["owner", "admin"].includes(selectedWallet.role) && (
            <WalletAccountEditModal
              wallet={selectedWallet}
              accounts={accounts}
              request={request}
              onClose={() => setShowWalletEditModal(false)}
              onSaved={async (nextMessage) => {
                setMessage(nextMessage);
                setShowWalletEditModal(false);
                await openWallet(selectedWallet.id);
              }}
            />
          )}

          {showWalletMembersModal && ["owner", "admin"].includes(selectedWallet.role) && (
            <WalletMembersManageModal
              walletId={selectedWallet.id}
              walletName={selectedWallet.name}
              members={selectedWallet.members}
              friends={friends}
              request={request}
              onClose={() => setShowWalletMembersModal(false)}
              onSaved={async (nextMessage) => {
                setMessage(nextMessage);
                await openWallet(selectedWallet.id);
              }}
            />
          )}

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Perubahan dompet" caption="Permintaan perubahan besar membutuhkan suara mayoritas anggota aktif." />
            <div className="space-y-2">
              {selectedWallet.changeRequests.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada permintaan perubahan dompet.</p>}
              {selectedWallet.changeRequests.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {socialEnumLabel(item.status)} � {item.approvedCount}/{item.requiredApprovals} setuju � dibuat {localDate(item.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {item.payload.expenseSplitRule === "percentage" ? "Persentase" : item.payload.expenseSplitRule === "manual" ? "Manual" : "Merata"}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-600">
                    {item.payload.name && <p>Nama: {item.payload.name}</p>}
                    {item.payload.activeUntil && <p>Aktif sampai: {localDate(item.payload.activeUntil)}</p>}
                  </div>
                  {item.status === "pending" && !item.hasReviewed && item.requestedBy !== currentUser.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                        () => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "approved" }) }),
                        "Perubahan dompet disetujui"
                      ).then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                        () => request(`/social/wallets/${selectedWallet.id}/change-requests/${item.id}`, { method: "PUT", body: JSON.stringify({ decision: "rejected" }) }),
                        "Perubahan dompet ditolak"
                      ).then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader
              title="Pengingat dompet"
              caption={`${walletReminders.length} pengingat aktif`}
              action={["owner", "admin"].includes(selectedWallet.role) ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]" onClick={() => setShowWalletReminderForm((current) => !current)}>
                  <Plus size={14} /> Tambah
                </button>
              ) : undefined}
            />
            {showWalletReminderForm && (
              <form className="mb-3 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                runAction(
                  () => request(`/social/wallets/${selectedWallet.id}/reminders`, {
                    method: "POST",
                    body: JSON.stringify({
                      intervalType: walletReminderInterval,
                      reminderTime: String(form.get("reminderTime")),
                      dayOfWeek: walletReminderInterval === "weekly" ? Number(form.get("dayOfWeek")) : null,
                      dayOfMonth: walletReminderInterval === "monthly" ? Number(form.get("dayOfMonth")) : null,
                      entryType: String(form.get("entryType")),
                      message: String(form.get("message")),
                      targetUserId: String(form.get("targetUserId") || "") || null,
                      timezone: APP_TIME_ZONE
                    })
                  }),
                  "Pengingat dompet berhasil dibuat"
                ).then(() => {
                  setShowWalletReminderForm(false);
                  openWallet(selectedWallet.id);
                });
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Interval">
                    <select className="input" value={walletReminderInterval} onChange={(event) => setWalletReminderInterval(event.target.value as typeof walletReminderInterval)}>
                      <option value="daily">Setiap hari</option>
                      <option value="weekly">Setiap minggu</option>
                      <option value="monthly">Setiap bulan</option>
                    </select>
                  </Field>
                  <Field label="Waktu">
                    <input className="input" type="time" name="reminderTime" defaultValue="12:00" required />
                  </Field>
                </div>
                {walletReminderInterval === "weekly" && (
                  <Field label="Hari">
                    <select className="input" name="dayOfWeek" defaultValue="1">
                      {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                  </Field>
                )}
                {walletReminderInterval === "monthly" && (
                  <Field label="Tanggal setiap bulan">
                    <input className="input" name="dayOfMonth" type="number" min="1" max="31" defaultValue="1" required />
                  </Field>
                )}
                <Field label="Buka form">
                  <select className="input" name="entryType" defaultValue="deposit">
                    <option value="deposit">Deposit / setoran</option>
                    <option value="expense">Expense / pengeluaran</option>
                  </select>
                </Field>
                <Field label="Kirim pengingat kepada">
                  <select className="input" name="targetUserId" defaultValue="">
                    <option value="">Semua anggota</option>
                    {selectedWallet.members
                      .filter((member) => member.status === "accepted")
                      .map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Pesan notifikasi">
                  <input className="input" name="message" defaultValue="Jangan lupa nabung ya hari ini" maxLength={240} required />
                </Field>
                <button className="btn-primary w-full"><Bell size={15} /> Simpan pengingat</button>
              </form>
            )}
            <div className="space-y-2">
              {walletReminders.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada pengingat dompet.</p>}
              {walletReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Bell size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{reminder.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {reminder.intervalType} � {reminder.reminderTime.slice(0, 5)} � {reminder.entryType} � {
                        reminder.targetUserId
                          ? selectedWallet.members.find((member) => member.id === reminder.targetUserId)?.fullName ?? "Anggota"
                          : "Semua anggota"
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {!showWalletEntryForm && (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                setShowWalletEntryForm(true);
                setWalletEntryReceiptId(null);
                setWalletEntryAttachmentName("");
                setWalletEntryAttachmentMessage(null);
                setWalletEntryDate(isoDateInput());
                window.setTimeout(() => walletEntryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
              }}
            >
              <Plus size={16} /> Tambah transaksi dompet
            </button>
          )}
          {showWalletEntryForm && <form ref={walletEntryFormRef} className="rounded-[22px] bg-white p-4 shadow-soft" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            runAction(
              () => request(`/social/wallets/${selectedWallet.id}/entries`, {
                method: "POST",
                body: JSON.stringify({
                  entryType: String(form.get("entryType")),
                  amount: selectedWallet.storageType === "gold" ? undefined : String(form.get("amount")),
                  goldWeightGrams: selectedWallet.storageType === "gold" ? Number(form.get("goldWeightGrams")) : null,
                  description: String(form.get("description")),
                  transactionDate: String(form.get("transactionDate")),
                  receiptId: walletEntryReceiptId
                })
              }),
              "Transaksi dompet dicatat"
            ).then(() => {
              setShowWalletEntryForm(false);
              setWalletEntryReceiptId(null);
              setWalletEntryAttachmentName("");
              setWalletEntryAttachmentMessage(null);
              openWallet(selectedWallet.id);
            });
          }}>
            <SectionHeader
              title="Catat transaksi dompet"
              caption="Pengeluaran mengikuti aturan approval."
              action={<button type="button" onClick={() => { setShowWalletEntryForm(false); setWalletEntryReceiptId(null); setWalletEntryAttachmentName(""); setWalletEntryAttachmentMessage(null); }}><X size={15} /></button>}
            />
            <div className="space-y-3">
              <select className="input" name="entryType" defaultValue={new URLSearchParams(window.location.search).get("entryType") === "expense" ? "expense" : "deposit"}><option value="deposit">Setoran</option><option value="expense">Pengeluaran</option></select>
              <Field label="Tanggal transaksi">
                <div>
                  <input type="hidden" name="transactionDate" value={walletEntryDate} />
                  <DateFilterPicker
                    label="Tanggal transaksi"
                    value={walletEntryDate}
                    onChange={setWalletEntryDate}
                    language={language}
                    showLabel={false}
                    allowClear={false}
                  />
                </div>
              </Field>
              {selectedWallet.storageType === "gold" ? (
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
              )}
              <input className="input" name="description" placeholder="Keterangan" required />
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <span className="flex items-center gap-2 text-xs text-slate-600">
                  {walletEntryAttachmentLoading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                  {walletEntryAttachmentName || (walletEntryReceiptId ? "Attachment tersimpan" : "Tambah attachment")}
                </span>
                <span className="text-[10px] font-semibold text-[#16A34A]">{walletEntryReceiptId ? "Ganti file" : "Pilih file"}</span>
                <input className="sr-only" type="file" accept="image/*,video/*,.heic,.heif" onChange={uploadWalletEntryAttachment} disabled={walletEntryAttachmentLoading} />
              </label>
              {(walletEntryAttachmentName || walletEntryReceiptId) && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs lg:rounded-md ${
                  walletEntryAttachmentLoading
                    ? "border-sky-100 bg-sky-50 text-sky-700"
                    : walletEntryAttachmentMessage && !walletEntryReceiptId
                    ? "border-rose-100 bg-rose-50 text-rose-700"
                    : "border-emerald-100 bg-emerald-50 text-emerald-800"
                }`}>
                  {walletEntryAttachmentName?.match(/\.(mp4|mov|webm|m4v)$/i)
                    ? <Film className="shrink-0" size={15} />
                    : <ReceiptText className="shrink-0" size={15} />}
                  <span className="min-w-0 flex-1 truncate">{walletEntryAttachmentName || "Attachment transaksi tersimpan"}</span>
                  {walletEntryAttachmentLoading
                    ? <Loader2 className="shrink-0 animate-spin" size={14} />
                    : walletEntryReceiptId ? <CheckCircle2 className="shrink-0" size={14} /> : null}
                </div>
              )}
              {walletEntryAttachmentMessage && (
                <p className={`text-[11px] leading-4 ${walletEntryReceiptId ? "text-[#15803D]" : "text-rose-700"}`}>
                  {walletEntryAttachmentMessage}
                </p>
              )}
              <button className="btn-primary w-full" disabled={walletEntryAttachmentLoading}>Simpan transaksi</button>
            </div>
          </form>}
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Ringkasan anggota" caption="Kontribusi dari transaksi yang sudah disetujui." />
            <div className="space-y-2">
              {selectedWallet.memberSummary.map((member) => (
                <div key={member.userId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {member.fullName}{["owner", "admin"].includes(member.role) ? " (admin)" : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Aktivitas dompet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Deposit</p>
                    <p className="text-[11px] font-semibold text-[#16A34A]">{rupiah(member.deposit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">Pengeluaran</p>
                    <p className="text-[11px] font-semibold text-rose-600">{rupiah(member.expense)}</p>
                  </div>
                  {selectedWallet.storageType === "gold" && (
                    <div className="col-span-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                      <span>{Number(member.goldBalanceGrams || 0).toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gram</span>
                      <span className="font-semibold text-slate-800">{rupiah(member.goldBalanceValue || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Audit dompet" caption="Riwayat perubahan untuk kebutuhan audit." />
            <div className="space-y-2">
              {selectedWallet.auditHistory.length === 0 && <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Belum ada log audit dompet.</p>}
              {selectedWallet.auditHistory.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-800">{item.action}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{localDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="rounded-[22px] bg-white p-4 shadow-soft">
            <SectionHeader title="Riwayat transaksi" caption="Dikelompokkan berdasarkan tanggal transaksi." />
            <div className="space-y-4">
              {Object.entries(selectedWallet.entries.reduce<Record<string, WalletDetail["entries"]>>((groups, entry) => {
                const key = entry.transactionDate || entry.createdAt.slice(0, 10);
                (groups[key] ??= []).push(entry);
                return groups;
              }, {})).map(([date, entries]) => (
                <section key={date}>
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">{localDate(`${date}T00:00:00+07:00`)}</p>
                  <div className="space-y-2">
                  {entries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.description}</p>
                    <p className="text-xs text-slate-500">{entry.createdByName} � {socialEnumLabel(entry.status)}</p>
                  </div>
                  {entry.receiptId && (
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                      onClick={() => openWalletAttachment(entry.receiptId!)}
                      aria-label="Lihat attachment"
                      title="Lihat attachment"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <p className={`text-sm font-semibold ${entry.entryType === "deposit" ? "text-[#16A34A]" : "text-rose-600"}`}>{entry.entryType === "deposit" ? "+" : "-"}{rupiah(entry.amount)}</p>
                  </div>
                  {entry.status === "pending" && ["owner", "admin"].includes(selectedWallet.role) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                        () => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "approved" }) }),
                        "Transaksi disetujui"
                      ).then(() => openWallet(selectedWallet.id))}>Setujui</button>
                      <button className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                        () => request(`/social/wallet-entries/${entry.id}/approve`, { method: "PUT", body: JSON.stringify({ status: "rejected" }) }),
                        "Transaksi ditolak"
                      ).then(() => openWallet(selectedWallet.id))}>Tolak</button>
                    </div>
                  )}
                </div>
                  ))}
                  </div>
                </section>
              ))}
              {selectedWallet.entries.length === 0 && <EmptyState text="Belum ada transaksi dompet." />}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "activity" && (
        <div className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg">
          <SectionHeader
            title="Aktivitas Anda"
            caption="Tidak ada feed publik; hanya aktivitas yang melibatkan Anda."
            action={<button className="text-xs font-semibold text-[#16A34A]" onClick={() => runAction(
              () => request("/social/activity/read", { method: "PUT", body: "{}" }),
              "Semua notifikasi ditandai dibaca"
            )}>Tandai dibaca</button>}
          />
          <div className="space-y-5">
            {activity.length === 0 && <EmptyState text="Belum ada aktivitas sosial." />}
            {groupedActivity.map((group) => (
              <section key={group.key}>
                <div className="sticky top-16 z-10 mb-2 bg-white/95 py-1 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">{group.label}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((event) => (
                    <div key={event.id} className={`rounded-2xl p-3 ${event.isRead ? "bg-slate-50" : "border border-emerald-100 bg-emerald-50"}`}>
                      <div className="flex justify-between gap-3"><p className="text-sm font-semibold">{event.title}</p>{!event.isRead && <span className="h-2 w-2 rounded-full bg-[#16A34A]" />}</div>
                      {event.body && <p className="mt-1 text-xs text-slate-600">{event.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}
                      </p>
                      {event.eventType === "payment_received" && event.entityId && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white" onClick={() => runAction(
                            () => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "confirmed" }) }),
                            "Pembayaran dikonfirmasi"
                          )}>Sudah diterima</button>
                          <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => runAction(
                            () => request(`/social/settlements/${event.entityId}/confirm`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }),
                            "Pembayaran ditolak"
                          )}>Tolak</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div ref={activitySentinelRef} className="flex min-h-12 items-center justify-center">
              {activityLoadingMore && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={15} className="animate-spin" /> Memuat aktivitas...
                </div>
              )}
              {!activityHasMore && activity.length > 0 && <p className="text-[11px] text-slate-400">Semua aktivitas sudah ditampilkan.</p>}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "privacy" && (
        <form className="rounded-[22px] bg-white p-4 shadow-soft lg:rounded-lg" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          runAction(
            () => request("/social/privacy", {
              method: "PUT",
              body: JSON.stringify({
                allowWalletInvites: form.get("allowWalletInvites") === "on",
                allowGroupInvites: form.get("allowGroupInvites") === "on",
                searchableBy: String(form.get("searchableBy")),
                hidePhone: form.get("hidePhone") === "on"
              })
            }),
            "Pengaturan privasi disimpan"
          );
        }}>
          <SectionHeader title="Kontrol privasi" caption="Saldo, rekening, budget, dan transaksi pribadi tidak pernah dibagikan otomatis." />
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke dompet bersama</span><input type="checkbox" name="allowWalletInvites" defaultChecked={privacy.allowWalletInvites} /></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Izinkan ditambahkan ke grup</span><input type="checkbox" name="allowGroupInvites" defaultChecked={privacy.allowGroupInvites} /></label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"><span>Sembunyikan nomor telepon</span><input type="checkbox" name="hidePhone" defaultChecked={privacy.hidePhone} /></label>
            <Field label="Siapa yang dapat mencari akun">
              <select className="input" name="searchableBy" defaultValue={privacy.searchableBy}>
                <option value="everyone">Username, email, dan telepon</option>
                <option value="username">Hanya username</option>
                <option value="friends">Teman saja</option>
                <option value="nobody">Tidak seorang pun</option>
              </select>
            </Field>
            <button className="btn-primary w-full"><ShieldCheck size={16} /> Simpan privasi</button>
          </div>
        </form>
      )}
    </section>
  );
}
