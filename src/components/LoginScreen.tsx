import React, { useState, useEffect } from 'react';
import { Lock, Upload } from 'lucide-react';

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

  const hasCustomPassword = Boolean(localStorage.getItem('adminPassword'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem('adminPassword') || 'admin123';
    if (username.toLowerCase() === 'admin' && password === storedPassword) {
      onLogin();
    } else {
      setError('Username atau kata sandi salah.');
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
            {hasCustomPassword ? 'Admin Authentication Gateway' : 'Masuk dengan sandi admin'}
          </p>
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
        
        <div className="mt-6 flex flex-col items-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Admin Access Only</p>
        </div>
      </div>
    </div>
  );
}
