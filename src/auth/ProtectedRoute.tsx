import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useRole } from './useRole';
import { supabase } from '@/lib/supabase';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const roles = useRole();
  const navigate = useNavigate();
  const [mfaChecked, setMfaChecked] = useState(false);

  // MFA check for Doctor and Pharmacist roles (Constitution Security / T067b)
  useEffect(() => {
    if (!session || roles.length === 0) return;
    const requiresMfa = roles.includes('Doctor') || roles.includes('Pharmacist');
    if (!requiresMfa) {
      setMfaChecked(true);
      return;
    }

    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (!data) { setMfaChecked(true); return; }

      type MfaData = { currentLevel: string; nextLevel: string; currentAuthenticationMethods: Array<{ method: string; id?: string }> };
      const mfaData = data as MfaData;
      const { currentLevel, nextLevel } = mfaData;

      if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
        // Has MFA enrolled but not yet verified this session → challenge
        const factor = mfaData.currentAuthenticationMethods.find(
          (m) => m.method === 'totp',
        );
        void navigate('/mfa-challenge', {
          replace: true,
          state: { factorId: factor?.id },
        });
        return;
      }

      if (nextLevel !== 'aal2') {
        // No MFA enrolled yet → enroll
        void navigate('/mfa-enroll', { replace: true });
        return;
      }

      setMfaChecked(true);
    });
  }, [session, roles, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const requiresMfa = roles.includes('Doctor') || roles.includes('Pharmacist');
  if (requiresMfa && !mfaChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Outlet />;
}