import React, { useState, useEffect } from 'react';
import { Lock, Upload } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('app_logo');
    if (savedLogo) {
      setLogoBase64(savedLogo);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoBase64(result);
        localStorage.setItem('app_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem('adminPassword') || 'admin123';
    if (username.toLowerCase() === 'admin' && password === storedPassword) {
      onLogin();
    } else {
      setError('Username atau kata sandi salah.');
    }
  };

  const handleUseDefault = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  const handleResetPassword = () => {
    localStorage.removeItem('adminPassword');
    setError('Password telah dikembalikan ke default: admin123');
    setUsername('admin');
    setPassword('admin123');
  };

  const handleClearCache = () => {
    const answer = window.prompt('PERINGATAN: Semua proyek dan transaksi di perangkat ini akan TERHAPUS PERMANEN. Pastikan sudah mengunduh Backup.\n\nKetik HAPUS untuk melanjutkan.');
    if (answer === 'HAPUS') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
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
          <p className="text-sm font-medium text-slate-500 mt-1">Admin Authentication Gateway</p>
        </div>

        {/* Default credentials banner */}
        <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Kredensial Default:
            </span>
            <div className="font-mono text-slate-800 text-xs font-semibold mt-0.5">
              Username: <span className="text-navy-700 font-bold">admin</span> | Sandi: <span className="text-navy-700 font-bold">admin123</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseDefault}
            className="px-2.5 py-1 bg-navy-50 hover:bg-navy-100 text-navy-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            Isi Otomatis
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold tracking-wider rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-navy-600 to-navy-400 hover:from-navy-700 hover:to-navy-500 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-sm"
          >
            Akses Dashboard
          </button>
        </form>
        
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Secure Admin Access Only</p>
          <button 
            type="button" 
            onClick={handleResetPassword}
            className="text-[10px] font-bold text-slate-400 hover:text-navy-600 underline uppercase tracking-wider transition-colors"
          >
            Lupa Password? (Reset ke Default)
          </button>
          <button 
            type="button" 
            onClick={handleClearCache}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 underline uppercase tracking-wider transition-colors"
          >
            Reset Aplikasi & Hapus Cache
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Login mode online (Firebase, akun Google) ----------

export function CloudLoginScreen() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logo = localStorage.getItem('appLogo') || localStorage.getItem('app_logo');

  const handleGoogle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth!, provider);
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      setMsg(
        code.includes('popup-closed') || code.includes('cancelled-popup')
          ? 'Jendela login ditutup sebelum selesai. Coba lagi.'
          : code.includes('popup-blocked')
            ? 'Browser memblokir jendela login. Izinkan pop-up untuk situs ini, lalu coba lagi.'
            : code.includes('unauthorized-domain')
              ? 'Alamat aplikasi ini belum didaftarkan di Firebase (Authorized domains). Hubungi owner.'
              : code.includes('network')
                ? 'Tidak ada koneksi internet.'
                : `Gagal masuk (${code || 'unknown'}).`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-bl from-navy-600 to-navy-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm overflow-hidden border border-slate-100">
            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain bg-white" /> : <Lock className="text-white w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">SEVEN FINANCE</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 text-center">Masuk dengan akun Google yang didaftarkan owner</p>
        </div>
        {msg && (
          <div className="mb-5 p-3 text-xs font-semibold rounded-lg text-center border bg-red-50 text-red-600 border-red-100">{msg}</div>
        )}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm font-bold py-3.5 rounded-xl transition-all shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
          </svg>
          {busy ? 'Menunggu login Google…' : 'Masuk dengan Google'}
        </button>
        <p className="mt-6 text-[11px] text-slate-400 text-center">
          Hanya akun yang terdaftar yang bisa melihat data keuangan. Akun lain akan ditolak.
        </p>
      </div>
    </div>
  );
}
