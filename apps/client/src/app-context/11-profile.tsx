/**
 * AI context chunk: Profile
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
function ProfileView({
  session,
  request,
  onProfileUpdated,
  onInstall,
  showInstall,
  onLogout
}: {
  session: Session;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onProfileUpdated: (user: Session["user"]) => void;
  onInstall: () => Promise<void>;
  showInstall: boolean;
  onLogout?: () => void;
}) {
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setAvatarUrl(session.user.avatarUrl ?? "");
  }, [session.user.avatarUrl]);

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMessage("Foto profil harus berupa gambar.");
      return;
    }
    let avatarBlob: Blob = file;
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      avatarBlob = Array.isArray(converted) ? converted[0] : converted;
    }
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Foto gagal dibaca"));
      reader.readAsDataURL(avatarBlob);
    });
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Foto tidak valid"));
      nextImage.src = source;
    });
    const size = Math.min(512, Math.max(image.width, image.height));
    const scale = size / Math.max(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
    setProfileMessage(null);
    event.target.value = "";
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const user = await request<Session["user"]>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: String(form.get("fullName")),
          username: String(form.get("username")),
          phone: String(form.get("phone") || "") || null,
          nickname: String(form.get("nickname") || "") || null,
          title: String(form.get("title") || "") || null,
          avatarUrl: avatarUrl || null
        })
      });
      onProfileUpdated(user);
      setProfileMessage("Profil berhasil diperbarui.");
      setIsEditingProfile(false);
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Profil gagal diperbarui");
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword")),
          newPassword: String(form.get("newPassword"))
        })
      });
      setPasswordMessage("Password berhasil diubah.");
      formElement.reset();
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : "Password gagal diubah");
    }
  };
  return (
    <div className="mx-auto grid max-w-5xl gap-3 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[26px] bg-[#16A34A] p-4 text-white shadow-[0_18px_42px_rgba(22,163,74,0.18)] lg:rounded-lg lg:p-5">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 lg:rounded-lg" src={avatarUrl} alt="Foto profil" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold lg:rounded-lg">{session.user.fullName.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-white/60">Profil</p>
            <h2 className="mt-1 truncate text-xl font-semibold">{session.user.nickname || session.user.fullName}</h2>
            {session.user.title && <p className="truncate text-xs text-emerald-100">{session.user.title}</p>}
            <p className="mt-0.5 truncate text-xs font-semibold text-white/70">{session.user.email}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Mata uang</dt><dd className="mt-1 font-semibold">IDR</dd></div>
          <div className="rounded-2xl bg-white/12 px-3 py-2 lg:rounded-md"><dt className="font-bold text-white/60">Akun</dt><dd className="mt-1 font-semibold">Aktif</dd></div>
        </dl>
        {showInstall && (
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 lg:rounded-md"
            onClick={onInstall}
          >
            <Download size={15} /> Pasang aplikasi
          </button>
        )}
        {onLogout && (
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-emerald-50 lg:hidden"
            onClick={onLogout}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
      </section>
      <div className="space-y-3">
        {!isEditingProfile ? (
          <section className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200">
            <SectionHeader
              title="Profil saya"
              caption="Informasi yang tampil pada akun Anda."
              action={(
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A] transition active:scale-95"
                  onClick={() => {
                    setProfileMessage(null);
                    setAvatarUrl(session.user.avatarUrl ?? "");
                    setIsEditingProfile(true);
                  }}
                >
                  <Settings size={14} /> Edit profil
                </button>
              )}
            />
            <dl className="divide-y divide-slate-100">
              {[
                ["Nama lengkap", session.user.fullName],
                ["Username", session.user.username ? `@${session.user.username}` : "-"],
                ["Nomor telepon", session.user.phone || "-"],
                ["Nama panggilan", session.user.nickname || "-"],
                ["Title", session.user.title || "-"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-xs font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            {profileMessage && <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-[#16A34A] lg:rounded-md">{profileMessage}</p>}
          </section>
        ) : (
          <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={saveProfile}>
            <SectionHeader title="Edit profil" caption="Atur identitas yang tampil di aplikasi." />
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 lg:rounded-md">
                {avatarUrl ? <img className="h-12 w-12 rounded-xl object-cover" src={avatarUrl} alt="" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400"><UserRound size={20} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Foto profil</p>
                  <p className="text-[11px] text-slate-500">Gambar akan dirapikan otomatis.</p>
                </div>
                <label className="cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#16A34A] shadow-sm">
                  Pilih
                  <input className="sr-only" type="file" accept="image/*,.heic,.heif" onChange={chooseAvatar} />
                </label>
              </div>
              <Field label="Nama lengkap"><input className="input" name="fullName" defaultValue={session.user.fullName} required minLength={2} /></Field>
              <Field label="Username">
                <input className="input" name="username" defaultValue={session.user.username ?? ""} placeholder="contoh: reyandika" pattern="[a-zA-Z0-9_.]{3,40}" required />
              </Field>
              <Field label="Nomor telepon">
                <input className="input" name="phone" type="tel" defaultValue={session.user.phone ?? ""} placeholder="Contoh: 081234567890" />
              </Field>
              <Field label="Nickname"><input className="input" name="nickname" defaultValue={session.user.nickname ?? ""} placeholder="Nama panggilan" /></Field>
              <Field label="Title"><input className="input" name="title" defaultValue={session.user.title ?? ""} placeholder="Contoh: Student, Freelancer" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setAvatarUrl(session.user.avatarUrl ?? "");
                    setProfileMessage(null);
                    setIsEditingProfile(false);
                  }}
                >
                  Batal
                </button>
                <button className="btn-primary w-full"><CheckCircle2 size={16} /> Simpan profil</button>
              </div>
              {profileMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{profileMessage}</p>}
            </div>
          </form>
        )}

        <form className="rounded-[26px] border border-white/80 bg-white p-4 shadow-soft lg:rounded-lg lg:border-slate-200" onSubmit={submitPassword}>
          <SectionHeader title="Keamanan akun" caption="Ubah password secara berkala agar akun tetap aman." />
          <div className="space-y-3">
            <Field label="Password saat ini"><input className="input" name="currentPassword" type="password" placeholder="Masukkan password lama" required /></Field>
            <Field label="Password baru"><input className="input" name="newPassword" type="password" placeholder="Minimal 8 karakter" minLength={8} required /></Field>
            <button className="btn-secondary w-full"><CheckCircle2 size={16} /> Simpan password</button>
            {passwordMessage && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:rounded-md">{passwordMessage}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
