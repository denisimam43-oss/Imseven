import React, { useState, useEffect } from 'react';
import { Lock, Upload } from 'lucide-react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
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

// ---------- Login mode online (Firebase) ----------

export function CloudLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const logo = localStorage.getItem('appLogo') || localStorage.getItem('app_logo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      setMsg({
        text:
          code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
            ? 'Email atau kata sandi salah.'
            : code.includes('too-many-requests')
              ? 'Terlalu banyak percobaan. Tunggu beberapa menit.'
              : code.includes('network')
                ? 'Tidak ada koneksi internet.'
                : 'Gagal masuk. Coba lagi.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) return setMsg({ text: 'Isi email dulu, lalu tekan Lupa sandi.' });
    try {
      await sendPasswordResetEmail(auth!, email.trim());
      setMsg({ text: `Link ganti sandi dikirim ke ${email.trim()}. Cek inbox / spam.`, ok: true });
    } catch {
      setMsg({ text: 'Gagal mengirim link. Periksa alamat email.' });
    }
  };

  const inputCls =
    'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-bl from-navy-600 to-navy-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm overflow-hidden border border-slate-100">
            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain bg-white" /> : <Lock className="text-white w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">SEVEN FINANCE</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Masuk dengan akun yang didaftarkan owner</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {msg && (
            <div
              className={`p-3 text-xs font-semibold rounded-lg text-center border ${
                msg.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
              }`}
            >
              {msg.text}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email</label>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kata sandi</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-navy-600 to-navy-400 hover:from-navy-700 hover:to-navy-500 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-sm"
          >
            {busy ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button type="button" onClick={handleReset} className="text-[11px] font-bold text-slate-400 hover:text-navy-600 underline">
            Lupa sandi?
          </button>
        </div>
      </div>
    </div>
  );
}
