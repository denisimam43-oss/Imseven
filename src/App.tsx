/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FinanceProvider } from './store/FinanceContext';
import { Dashboard } from './components/Dashboard';
import { LoginScreen, CloudLoginScreen } from './components/LoginScreen';
import { auth, cloudEnabled } from './firebase';

function Shell() {
  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Dashboard />
      </div>
    </FinanceProvider>
  );
}

// Mode online: login dengan akun Firebase (email & sandi), data di server.
function CloudApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth!, setUser), []);
  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Memuat…</div>;
  }
  if (!user) return <CloudLoginScreen />;
  return <Shell />;
}

// Mode lokal (sebelum Firebase diisi): perilaku lama.
function LocalApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('finance_admin_logged_in') === 'true';
  });

  const handleLogin = () => {
    sessionStorage.setItem('finance_admin_logged_in', 'true');
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  return <Shell />;
}

export default function App() {
  return cloudEnabled ? <CloudApp /> : <LocalApp />;
}
