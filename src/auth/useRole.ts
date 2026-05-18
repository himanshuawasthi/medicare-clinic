import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export function useRole(): string[] {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      return;
    }
    void supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRoles((data?.roles as string[]) ?? []);
      });
  }, [user]);

  return roles;
}