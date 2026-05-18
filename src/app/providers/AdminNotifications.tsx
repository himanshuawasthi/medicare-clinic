import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { useRole } from '@/auth/useRole';

export function AdminNotifications({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const roles = useRole();
  const isAdmin = roles.includes('Admin');

  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel('admin-alerts')
      .on('broadcast', { event: 'edit_after_dispense' }, (payload) => {
        const { prescription_id } = payload.payload as {
          prescription_id: string;
          actor_id: string;
        };
        toast.warning('Dispensed prescription edited', {
          description: `Rx ${prescription_id.slice(0, 8)}… was modified after dispensing`,
          duration: 10_000,
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  return <>{children}</>;
}