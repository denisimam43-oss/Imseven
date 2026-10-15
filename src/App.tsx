/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FinanceProvider } from './store/FinanceContext';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
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

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Dashboard />
      </div>
    </FinanceProvider>
  );
}
