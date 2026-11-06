/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './auth/AuthContext';
import { FinanceProvider } from './store/FinanceContext';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen, LoginScreen, NoRoleScreen } from './components/LoginScreen';

function Gate() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'noRole') return <NoRoleScreen />;
  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Dashboard />
      </div>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
