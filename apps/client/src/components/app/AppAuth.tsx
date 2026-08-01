import { CheckCircle2, Download, Loader2, Wallet } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "../../lib/api";
import { apiFetch } from "../../lib/api";
import { queueDebugLog } from "./AppChrome";
import { Field } from "./AppPrimitives";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function loadAuthScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("Provider login gagal dimuat")));
    document.head.appendChild(script);
  });
}

export function GoogleLogo(props: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={props.className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.1 0-11.3-5-11.3-11s5.2-11 11.3-11c2.8 0 5.3 1 7.3 2.8l5.7-5.6C33.6 8.2 29 6 24 6 13.5 6 5 14.2 5 25s8.5 19 19 19 19-8.1 19-19c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.6C33.6 8.2 29 6 24 6c-7.2 0-13.4 4.1-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5 0 9.5-1.8 13-4.9l-6.1-5.1C29 35.2 26.7 36 24 36c-5.1 0-9.5-3.3-11.1-8.1l-6.5 5C10.6 39.8 16.9 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.2 3.5-3.6 6.3-6.4 7.9l.1-.1 6.1 5.1C35.7 39.7 43 35 43 25c0-1.4-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export function AuthView({ onSignedIn, onInstall, showInstall }: {
  onSignedIn: (session: Session) => void;
  onInstall: () => Promise<void>;
  showInstall: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [resetStep, setResetStep] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);

  const completeSocialLogin = async (provider: "google", idToken: string, fullName?: string) => {
    setSocialLoading(provider);
    setError(null);
    try {
      const session = await apiFetch<Session>("/auth/social", undefined, {
        method: "POST",
        body: JSON.stringify({ provider, idToken, fullName: fullName || null })
      });
      queueDebugLog("auth_social_response", {
        provider,
        keys: session && typeof session === "object" ? Object.keys(session as Record<string, unknown>) : null,
        hasLastActivityAt: Boolean((session as any)?.lastActivityAt),
        userKeys: session && typeof session === "object" && (session as any).user && typeof (session as any).user === "object"
          ? Object.keys((session as any).user)
          : null
      });
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Login ${provider} gagal`);
    } finally {
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    if (googleClientId) return;
    let active = true;
    apiFetch<{ googleClientId: string | null }>("/auth/providers")
      .then((result) => {
        if (!active) return;
        setGoogleClientId(result.googleClientId?.trim() || null);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    let active = true;
    setGoogleButtonReady(false);
    loadAuthScript("google-identity-script", "https://accounts.google.com/gsi/client")
      .then(() => {
        if (!active || !window.google || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => completeSocialLogin("google", response.credential)
        });
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "login" ? "signin_with" : "signup_with",
          shape: "rectangular",
          width: 260
        });
        setGoogleButtonReady(true);
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [googleClientId, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login" && resetStep) {
        const payload = {
          email: String(form.get("email")),
          otp: String(form.get("resetOtp")),
          newPassword: String(form.get("newPassword"))
        };
        const result = await apiFetch<{ reset: boolean }>("/auth/forgot-password/verify", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (result.reset) {
          setResetStep(false);
          setMode("login");
          setError("Password berhasil diubah. Silakan login kembali.");
        }
        return;
      }
      if (mode === "register" && !otpStep) {
        const payload = {
          fullName: String(form.get("fullName")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          currency: "IDR"
        };
        const result = await apiFetch<{ requiresOtp?: boolean; email?: string; message?: string }>("/auth/register", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (result.requiresOtp) {
          setOtpEmail(result.email ?? payload.email);
          setOtpStep(true);
          setError(result.message ?? "Kode OTP telah dikirim ke email Anda.");
          return;
        }
        if ((result as Session)?.accessToken && (result as Session)?.user) {
          onSignedIn(result as Session);
          return;
        }
        throw new Error("Registrasi gagal");
      }
      if (mode === "register" && otpStep) {
        const payload = {
          email: String(form.get("email")) || otpEmail,
          otp: String(form.get("otp"))
        };
        const session = await apiFetch<Session>("/auth/register/verify", undefined, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        onSignedIn(session);
        return;
      }
      const payload = { email: String(form.get("email")), password: String(form.get("password")) };
      const session = await apiFetch<Session>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      queueDebugLog("auth_email_response", {
        mode,
        keys: session && typeof session === "object" ? Object.keys(session as Record<string, unknown>) : null,
        hasLastActivityAt: Boolean((session as any)?.lastActivityAt),
        userKeys: session && typeof session === "object" && (session as any).user && typeof (session as any).user === "object"
          ? Object.keys((session as any).user)
          : null
      });
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-3 sm:p-6 lg:p-8">
      <main className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#F8FAF7] shadow-[0_30px_90px_rgba(0,0,0,0.28)] lg:min-h-[700px] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden bg-[#101713] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="brand-mark h-12 w-12"><Wallet size={22} strokeWidth={2.4}/></span>
              <div>
                <p className="text-base font-extrabold tracking-[-0.03em]">Keuangan AI</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">Money operating system</p>
              </div>
            </div>
            <p className="mt-20 max-w-md text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#DFFF74]">Less guessing. More clarity.</p>
            <h1 className="mt-4 max-w-md text-5xl font-extrabold leading-[1.04] tracking-[-0.065em]">Uangmu punya arah, bukan sekadar catatan.</h1>
            <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-white/48">Satu tempat untuk melihat cash flow, mengatur pocket, menjaga budget, dan memahami kebiasaan finansialmu.</p>
          </div>
          <div className="grid grid-cols-3 border-y auth-feature-line">
            {["Cash flow", "Smart pocket", "AI insight"].map((feature, index) => (
              <div key={feature} className={`py-4 ${index ? "border-l auth-feature-line pl-4" : ""}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/35">0{index + 1}</p>
                <p className="mt-1 text-xs font-bold text-white/85">{feature}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="auth-panel flex items-center justify-center p-5 sm:p-9 lg:p-12">
          <div className="w-full max-w-md">
            <header className="mb-7">
              <div className="mb-7 flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="brand-mark h-10 w-10"><Wallet size={18}/></span>
                  <div><p className="text-sm font-extrabold tracking-[-0.03em]">Keuangan AI</p><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Money OS</p></div>
                </div>
                {showInstall && <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFE5DE] bg-white px-3 py-2 text-[11px] font-bold text-[#16845B]" onClick={onInstall}><Download size={13}/> Pasang</button>}
              </div>
              <p className="eyebrow">{mode === "login" ? "Welcome back" : "Start your money reset"}</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-slate-950">{mode === "login" ? "Masuk ke ruang finansialmu" : "Buat akun dalam semenit"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{mode === "login" ? "Lanjutkan dari posisi finansial terakhirmu." : "Mulai pencatatan yang rapi tanpa setup yang ribet."}</p>
            </header>

          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("login"); setOtpStep(false); setResetStep(false); setError(null); }}>Masuk</button>
            <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("register"); setOtpStep(false); setResetStep(false); setError(null); }}>Daftar</button>
          </div>

          <div className="space-y-2">
            {googleClientId ? (
              <div className="relative mx-auto h-10 w-[260px] max-w-full overflow-hidden">
                {!googleButtonReady && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                    <GoogleLogo className="h-4 w-4" />
                    {mode === "login" ? "Login dengan Google" : "Daftar dengan Google"}
                  </div>
                )}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${googleButtonReady ? "opacity-100" : "opacity-0"}`} ref={googleButtonRef} />
              </div>
            ) : (
              <button type="button" className="mx-auto flex h-10 w-[260px] max-w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" onClick={() => setError("Login Google belum tersedia. Pastikan GOOGLE_CLIENT_ID di server atau VITE_GOOGLE_CLIENT_ID di client sudah terpasang lalu deploy ulang.")}>
                <GoogleLogo className="h-4 w-4" />
                {mode === "login" ? "Login dengan Google" : "Daftar dengan Google"}
              </button>
            )}
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>atau gunakan email</span><span className="h-px flex-1 bg-slate-200" /></div>

          <form className="space-y-3" onSubmit={submit}>
            {mode === "register" && !otpStep && <Field label="Nama lengkap"><input className="input" name="fullName" autoComplete="name" required minLength={2} /></Field>}
            <Field label="Email"><input className="input" name="email" type="email" autoComplete="email" required /></Field>
            {mode === "login" && !resetStep && <Field label="Password"><input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} /></Field>}
            {mode === "register" && !otpStep && <Field label="Password"><input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>}
            {mode === "login" && !resetStep && (
              <button type="button" className="text-left text-sm font-semibold text-[#16A34A]" onClick={() => {
                setResetStep(true);
                setResetEmail(String((document.querySelector('input[name="email"]') as HTMLInputElement | null)?.value ?? ""));
                setError(null);
              }}>
                Lupa password?
              </button>
            )}
            {mode === "login" && resetStep && (
              <>
                <Field label="Kode OTP">
                  <input className="input tracking-[0.4em]" name="resetOtp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} minLength={6} required placeholder="000000" />
                </Field>
                <Field label="Password baru">
                  <input className="input" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
                </Field>
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Kode reset dikirim ke {resetEmail || "email Anda"}.
                </p>
                <button type="button" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => { setResetStep(false); setError(null); }}>
                  Kembali ke login
                </button>
              </>
            )}
            {mode === "register" && otpStep && (
              <>
                <Field label="Kode OTP">
                  <input className="input tracking-[0.4em]" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} minLength={6} required placeholder="000000" />
                </Field>
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Kode OTP dikirim ke {otpEmail || "email Anda"}.
                </p>
                <button type="button" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => { setOtpStep(false); setError(null); }}>
                  Ubah data registrasi
                </button>
              </>
            )}
            {error && <p className={`rounded-xl px-3 py-2 text-sm ${(otpStep && mode === "register") || resetStep ? "border border-emerald-100 bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{error}</p>}
            <button className="btn-primary w-full" disabled={loading || Boolean(socialLoading)}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {mode === "login" ? (resetStep ? "Verifikasi Reset" : "Masuk") : otpStep ? "Verifikasi OTP" : "Kirim OTP"}
            </button>
          </form>
          </div>
        </section>
      </main>
    </div>
  );
}
