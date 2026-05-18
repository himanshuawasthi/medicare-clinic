import { useNavigate } from 'react-router-dom';
import { ChevronRight, FlaskConical, Pill } from 'lucide-react';
import { usePrescriptions } from './queries';
import { formatDate } from '@/lib/date';

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800',
  DISPENSED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

interface HistoryListProps {
  patientId: string;
}

export function HistoryList({ patientId }: HistoryListProps) {
  const navigate = useNavigate();
  const { data: prescriptions = [], isLoading } = usePrescriptions(patientId);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No visits recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Visit History
      </h2>
      <ul className="overflow-hidden rounded-md border bg-card shadow-sm divide-y">
        {prescriptions.map((rx) => {
          const rxTyped = rx as { id: string; status: string; symptoms: string | null; vitals: unknown; created_at: string; prescription_items: unknown[] };
          const itemCount = rxTyped.prescription_items.length;
          const sympRaw = rxTyped.symptoms;
          const symp: string = typeof sympRaw === 'string'
            ? (sympRaw as string).slice(0, 80)
            : '';
          const hasVitals =
            rxTyped.vitals !== null &&
            rxTyped.vitals !== undefined &&
            typeof rxTyped.vitals === 'object';

          return (
            <li key={rxTyped.id}>
              <button
                onClick={() => navigate(`/rx/${rxTyped.id}`)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDate(rxTyped.created_at)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[rxTyped.status as string] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rxTyped.status}
                    </span>
                  </div>
                  {symp && (
                    <p className="text-xs text-muted-foreground truncate">{symp}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {itemCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Pill className="h-3 w-3" />
                        {itemCount} medicine{itemCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hasVitals && (
                      <span className="flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" />
                        Vitals recorded
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}