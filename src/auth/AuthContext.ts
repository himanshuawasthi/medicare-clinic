import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}