import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Printer } from 'lucide-react';
import { usePrescriptionForDispense, useDispense } from '@/features/dispense/queries';
import { PrintBill } from '@/features/dispense/PrintBill';
import { PatientHeader } from '@/features/patients/PatientHeader';
import { formatRupees } from '@/lib/money';
import { isExpired } from '@/lib/date';
import { useAuth } from '@/auth/AuthContext';

type Decision = 'dispensed' | 'short' | 'substituted';

interface LineState {
  inventory_id: string;
  qty: number;
  decision: Decision;
  unit_price_paise: number;
  medicine_name: string;
  prescribed_qty: number;
  stock_qty: number;
  is_expired: boolean;
}

interface DispenseResult {
  dispense_id: string;
  total_paise: number;
  status: string;
}

export default function DispensePrescription() {
  const { rxId } = useParams<{ rxId: string }>();
  const navigate = useNavigate();
  useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: rx, isLoading } = usePrescriptionForDispense(rxId);
  const { mutateAsync: dispense, isPending: isDispensing } = useDispense();

  const [lines, setLines] = useState<LineState[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [dispenseResult, setDispenseResult] = useState<DispenseResult | null>(null);

  // Initialize line states from prescription data
  if (rx && !initialized && rx.prescription_items.length > 0) {
    setLines(
      rx.prescription_items.map((item) => ({
        inventory_id: item.inventory_id ?? '',
        qty: item.quantity,
        decision: 'dispensed' as Decision,
        unit_price_paise: 0, // fetched per inventory item (not exposed to doctor)
        medicine_name: item.medicine_name,
        prescribed_qty: item.quantity,
        stock_qty: item.inventory_items?.stock_qty ?? 0,
        is_expired: isExpired(item.inventory_items?.expiry_date),
      })),
    );
    setInitialized(true);
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const totalPaise = lines.reduce((sum, l) => {
    if (l.decision === 'short') return sum;
    return sum + l.qty * l.unit_price_paise;
  }, 0);

  async function handleComplete() {
    if (!rxId) return;
    const validLines = lines.filter((l) => l.inventory_id && !l.is_expired);
    if (validLines.length === 0) {
      toast.error('No valid lines to dispense');
      return;
    }
    try {
      const result = await dispense({
        prescription_id: rxId,
        lines: validLines.map((l) => ({
          inventory_id: l.inventory_id,
          qty: l.qty,
          decision: l.decision,
        })),
      });
      setDispenseResult(result);
      toast.success('Prescription dispensed successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispense failed');
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!rx) return <p className="text-muted-foreground">Prescription not found.</p>;

  // Print bill after successful dispense
  if (dispenseResult) {
    const billLines = lines
      .filter((l) => l.decision !== 'short')
      .map((l) => ({
        medicine_name: l.medicine_name,
        qty: l.qty,
        unit_price_paise: l.unit_price_paise,
      }));

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Prescription dispensed. Total: {formatRupees(dispenseResult.total_paise)}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print Bill
          </button>
          <button
            onClick={() => navigate('/store')}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Back to Queue
          </button>
        </div>
        <div className="hidden print:block">
          <PrintBill
            ref={printRef}
            patientName={rx.patients?.full_name ?? 'Patient'}
            rxDate={rx.created_at}
            dispensedAt={new Date().toISOString()}
            lines={billLines}
            totalPaise={dispenseResult.total_paise}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        onClick={() => navigate('/store')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </button>

      {rx.patients && (
        <PatientHeader
          fullName={rx.patients.full_name}
          mobile={rx.patients.mobile}
          gender=""
        />
      )}

      {/* Medicine lines */}
      <div className="space-y-3">
        <h2 className="font-semibold">Medicines to Dispense</h2>
        {lines.map((line, idx) => {
          const lowStock = !line.is_expired && line.qty > line.stock_qty;
          return (
            <div
              key={idx}
              className={`rounded-md border p-3 ${
                line.is_expired
                  ? 'opacity-50 bg-muted'
                  : lowStock
                  ? 'border-amber-400'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{line.medicine_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prescribed: {line.prescribed_qty} · Stock: {line.stock_qty}
                  </p>
                  {lowStock && !line.is_expired && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Low stock — check available quantity
                    </p>
                  )}
                  {line.is_expired && (
                    <p className="mt-0.5 text-xs text-destructive">Expired — cannot dispense</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <select
                    value={line.decision}
                    disabled={line.is_expired}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx
                            ? { ...l, decision: e.target.value as Decision }
                            : l,
                        ),
                      )
                    }
                    className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="dispensed">Dispensed</option>
                    <option value="short">Short (not available)</option>
                    <option value="substituted">Substituted</option>
                  </select>
                  {line.decision !== 'short' && !line.is_expired && (
                    <input
                      type="number"
                      min={0}
                      max={line.stock_qty}
                      value={line.qty}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, qty: parseInt(e.target.value, 10) || 0 }
                              : l,
                          ),
                        )
                      }
                      className="w-20 rounded-md border bg-background px-2 py-1 text-xs text-right"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total */}
      <div className="rounded-md border bg-card p-3 text-right">
        <span className="text-sm text-muted-foreground">Estimated Total: </span>
        <span className="font-bold">{formatRupees(totalPaise)}</span>
        <p className="text-xs text-muted-foreground">
          (Final amount calculated after dispensing)
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/store')}
          className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={handleComplete}
          disabled={isDispensing || lines.every((l) => l.is_expired)}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isDispensing ? 'Dispensing…' : 'Complete Dispensing'}
        </button>
      </div>
    </div>
  );
}