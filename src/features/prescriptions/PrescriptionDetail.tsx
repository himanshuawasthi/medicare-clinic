import { useNavigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { usePrescription } from './queries';
import { formatDateTime } from '@/lib/date';
import { useRole } from '@/auth/useRole';

interface PrescriptionDetailProps {
  prescriptionId: string;
}

interface VitalsRecord {
  sys_bp?: number;
  dia_bp?: number;
  pulse?: number;
  temp_f?: number;
  weight_kg?: number;
  height_cm?: number;
}

export function PrescriptionDetail({ prescriptionId }: PrescriptionDetailProps) {
  const navigate = useNavigate();
  const roles = useRole();
  const isDoctor = roles.includes('Doctor');
  const { data: rx, isLoading } = usePrescription(prescriptionId);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!rx) return <p className="text-muted-foreground">Prescription not found.</p>;

  const vitals = rx.vitals as VitalsRecord | null;

  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(rx.created_at)}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              rx.status === 'PENDING'
                ? 'bg-amber-100 text-amber-800'
                : rx.status === 'DISPENSED'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {rx.status}
          </span>
        </div>
        {isDoctor && (
          <button
            onClick={() => navigate(`/rx/${rx.id}/edit`)}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* Symptoms */}
      {rx.symptoms && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Symptoms
          </h3>
          <p className="text-sm">{rx.symptoms}</p>
        </div>
      )}

      {/* Vitals */}
      {vitals && Object.values(vitals).some((v) => v !== undefined) && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vitals
          </h3>
          <div className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-3">
            {vitals.sys_bp !== undefined && (
              <span><span className="text-muted-foreground">BP: </span>{vitals.sys_bp}/{vitals.dia_bp} mmHg</span>
            )}
            {vitals.pulse !== undefined && (
              <span><span className="text-muted-foreground">Pulse: </span>{vitals.pulse} bpm</span>
            )}
            {vitals.temp_f !== undefined && (
              <span><span className="text-muted-foreground">Temp: </span>{vitals.temp_f}°F</span>
            )}
            {vitals.weight_kg !== undefined && (
              <span><span className="text-muted-foreground">Wt: </span>{vitals.weight_kg} kg</span>
            )}
            {vitals.height_cm !== undefined && (
              <span><span className="text-muted-foreground">Ht: </span>{vitals.height_cm} cm</span>
            )}
          </div>
        </div>
      )}

      {/* Medicines */}
      {Array.isArray(rx.prescription_items) && (rx.prescription_items as unknown[]).length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Medicines
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-1">Medicine</th>
                <th className="pb-1">Dosage</th>
                <th className="pb-1">Frequency</th>
                <th className="pb-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(rx.prescription_items as Array<{
                id: string;
                medicine_name: string;
                dosage: string;
                frequency: string;
                duration_days: number | null;
                quantity: number;
              }>).map((item) => (
                <tr key={item.id}>
                  <td className="py-1 font-medium">{item.medicine_name}</td>
                  <td className="py-1 text-muted-foreground">{item.dosage}</td>
                  <td className="py-1 text-muted-foreground">
                    {item.frequency}
                    {item.duration_days ? ` × ${item.duration_days}d` : ''}
                  </td>
                  <td className="py-1 text-right">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tests */}
      {Array.isArray(rx.recommended_tests) && (rx.recommended_tests as unknown[]).length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended Tests
          </h3>
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {(rx.recommended_tests as string[]).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Doctor Notes */}
      {rx.doctor_notes && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Doctor Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap">{rx.doctor_notes}</p>
        </div>
      )}
    </div>
  );
}