import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/date';

interface RecentRx {
  id: string;
  created_at: string;
  patients: { full_name: string } | null;
}

function useRecentDispensed() {
  return useQuery({
    queryKey: ['prescriptions', 'recent-dispensed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, created_at, patients(full_name)')
        .eq('status', 'DISPENSED')
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RecentRx[];
    },
    staleTime: 30_000,
  });
}

export function RecentDispensedList() {
  const navigate = useNavigate();
  const { data: dispensed = [] } = useRecentDispensed();

  if (dispensed.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recently Dispensed
      </h2>
      <ul className="overflow-hidden rounded-md border bg-card divide-y">
        {dispensed.map((rx) => (
          <li key={rx.id}>
            <button
              onClick={() => navigate(`/rx/${rx.id}`)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
            >
              <span className="truncate font-medium">
                {rx.patients?.full_name ?? 'Unknown patient'}
              </span>
              <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                {formatDateTime(rx.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}