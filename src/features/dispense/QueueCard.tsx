import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Pill } from 'lucide-react';
import { formatDateTime } from '@/lib/date';

interface QueueCardProps {
  id: string;
  patientName: string;
  createdAt: string;
  symptoms: string | null;
  medicineCount: number;
}

export function QueueCard({
  id,
  patientName,
  createdAt,
  symptoms,
  medicineCount,
}: QueueCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/dispense/${id}`)}
      className="flex w-full items-center gap-3 rounded-md border bg-card px-4 py-3 text-left shadow-sm hover:bg-accent transition-colors"
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-medium truncate">{patientName}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDateTime(createdAt)}
        </p>
        {symptoms && (
          <p className="text-xs text-muted-foreground truncate">
            {symptoms.slice(0, 80)}
          </p>
        )}
        {medicineCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Pill className="h-3 w-3" />
            {medicineCount} medicine{medicineCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}