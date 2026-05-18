// T045: Realtime subscription wired here; full queue UI in T050 (Phase 7)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/date';
import { useUIStore } from '@/app/store/uiStore';

interface PendingRx {
  id: string;
  symptoms: string | null;
  created_at: string;
  patients: { full_name: string } | null;
  users: { id: string } | null;
}

function usePendingPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, symptoms, created_at, patients(full_name), users:doctor_id(id)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingRx[];
    },
    staleTime: 10_000,
  });
}

export default function MedicalStore() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: queue = [], isLoading } = usePendingPrescriptions();
  const setPendingCount = useUIStore((s) => s.setPendingQueueCount);

  // Keep Zustand badge in sync with query result (T045)
  useEffect(() => {
    setPendingCount(queue.length);
  }, [queue.length, setPendingCount]);

  // Realtime subscription for PENDING prescriptions (T045)
  useEffect(() => {
    const channel = supabase
      .channel('pharmacy-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: 'status=eq.PENDING',
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['prescriptions', 'pending'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Medical Store
          {queue.length > 0 && (
            <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-sm text-destructive-foreground">
              {queue.length}
            </span>
          )}
        </h1>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No pending prescriptions
        </div>
      ) : (
        <ul className="overflow-hidden rounded-md border bg-card shadow-sm divide-y">
          {queue.map((rx) => (
            <li key={rx.id}>
              <button
                onClick={() => navigate(`/dispense/${rx.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {rx.patients?.full_name ?? 'Unknown patient'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(rx.created_at)}
                  </p>
                  {rx.symptoms && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {rx.symptoms.slice(0, 80)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Full queue UI (sort toggle, recent dispensed list) in T050–T052 (Phase 7) */}
    </div>
  );
}