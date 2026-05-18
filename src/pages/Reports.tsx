import { useState } from 'react';
import { KpiTiles } from '@/features/reports/KpiTiles';
import { PrescriptionsBarChart } from '@/features/reports/PrescriptionsBarChart';
import { StatusPieChart } from '@/features/reports/StatusPieChart';
import { TopMedicinesChart } from '@/features/reports/TopMedicinesChart';
import { LowStockWidget } from '@/features/inventory/LowStockWidget';
import { ExpiryWidget } from '@/features/inventory/ExpiryWidget';
import { type DateRange } from '@/features/reports/queries';

const RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'This month', value: 'month' },
];

export default function Reports() {
  const [range, setRange] = useState<DateRange>('today');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-1 rounded-md border bg-muted p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={[
                'rounded px-3 py-1 text-sm font-medium transition-colors',
                range === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <KpiTiles range={range} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prescriptions per day
          </h2>
          <PrescriptionsBarChart range={range} />
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Status distribution
          </h2>
          <StatusPieChart range={range} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top 5 medicines dispensed
          </h2>
          <TopMedicinesChart range={range} />
        </section>

        <section className="space-y-4">
          <LowStockWidget />
          <ExpiryWidget />
        </section>
      </div>
    </div>
  );
}