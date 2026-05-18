import { useRevenueAndTopMedicines, type DateRange } from './queries';

export function TopMedicinesChart({ range }: { range: DateRange }) {
  const { data, isLoading } = useRevenueAndTopMedicines(range);
  const medicines = data?.topMedicines ?? [];

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No dispensed medicines in this period
      </div>
    );
  }

  const max = medicines[0]?.qty ?? 1;

  return (
    <ol className="space-y-3">
      {medicines.map((m, i) => (
        <li key={m.name} className="flex items-center gap-3">
          <span className="w-4 text-right text-xs font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{m.name}</span>
              <span className="ml-2 shrink-0 text-muted-foreground">{m.qty} units</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(m.qty / max) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}