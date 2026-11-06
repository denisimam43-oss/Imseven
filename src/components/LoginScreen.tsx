import React, { useEffect, useState } from "react";
import { Lock, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const inputCls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800";
const labelCls = "block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider";

export function LoginScreen() {
  const { mode, localHasPassword, signInEmail, signInLocal, createLocalPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem("app_logo");
    if (savedLogo) setLogoBase64(savedLogo);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoBase64(result);
      localStorage.setItem("app_logo", result);
    };
    reader.readAsDataURL(file);
  };

  const creating = mode === "local" && !localHasPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (creating && password !== confirm) return setError("Konfirmasi sandi tidak cocok.");
    setBusy(true);
    try {
      if (mode === "firebase") await signInEmail(email, password);
      else if (creating) await createLocalPassword(password);
      else await signInLocal(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
        <div className="absolute top-4 right-4">
          <label className="cursor-pointer text-slate-400 hover:text-navy-600 transition-colors" title="Upload Logo">
            <Upload size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-bl from-navy-600 to-navy-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm overflow-hidden border border-slate-100">
            {logoBase64 ? (
              <img src={logoBase64} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <Lock className="text-white w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">FINANCE CORE</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {creating ? "Buat sandi untuk perangkat ini" : "Masuk dengan akun masing-masing"}
          </p>
        </div>

        {mode === "local" && (
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
            <b>Mode lokal:</b> penyimpanan online belum diaktifkan, jadi data hanya ada di browser perangkat ini dan
            tidak ada pemisahan akun. Aktifkan Firebase (lihat FIREBASE-SETUP.md) sebelum akuntan mulai bekerja.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold tracking-wider rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          {mode === "firebase" && (
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>{creating ? "Sandi baru (min. 8 karakter)" : "Password"}</label>
            <input
              type="password"
              required
              autoComplete={creating ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          {creating && (
            <div>
              <label className={labelCls}>Ulangi sandi</label>
              <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-navy-600 to-navy-400 hover:from-navy-700 hover:to-navy-500 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-sm"
          >
            {busy ? "Memproses..." : creating ? "Buat Sandi & Masuk" : "Akses Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {mode === "firebase"
            ? "Lupa sandi? Hubungi owner untuk reset lewat Firebase."
            : "Akses terbatas untuk pengurus keuangan"}
        </p>
      </div>
    </div>
  );
}

export function NoRoleScreen() {
  const { pendingEmail, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-800">Akun belum diberi peran</h2>
        <p className="text-sm text-slate-600 mt-3">
          Akun <b>{pendingEmail}</b> sudah terdaftar, tetapi belum diberi peran (Owner, Finance & Client Relation, atau
          Akuntan). Minta owner menambahkan peran akun ini di Firebase, lalu login ulang.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

export function LoadingScreen({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">
      {label}
    </div>
  );
}
