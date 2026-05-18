import { Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { useInventoryItems } from '@/features/inventory/queries';
import { useKpiStats, useRevenueAndTopMedicines, type DateRange } from './queries';

interface TileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}

function Tile({ label, value, icon, sub }: TileProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
    </div>
  );
}

export function KpiTiles({ range }: { range: DateRange }) {
  const { data: kpi } = useKpiStats(range);
  const { data: rev } = useRevenueAndTopMedicines(range);
  const { data: items = [] } = useInventoryItems();

  const lowStockCount = items.filter(
    (i) => i.deleted_at === null && i.stock_qty <= i.min_threshold,
  ).length;

  const rangeLabel =
    range === 'today' ? 'today' : range === 'week' ? 'last 7 days' : 'this month';

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile
        label="Total Patients"
        value={kpi?.totalPatients ?? '—'}
        icon={<Users className="h-5 w-5" />}
        sub="all time"
      />
      <Tile
        label="Prescriptions"
        value={kpi?.prescriptionsInRange ?? '—'}
        icon={<FileText className="h-5 w-5" />}
        sub={rangeLabel}
      />
      <Tile
        label="Revenue"
        value={rev ? formatRupees(rev.revenueInRangePaise) : '—'}
        icon={<CheckCircle className="h-5 w-5" />}
        sub={rangeLabel}
      />
      <Tile
        label="Stock Alerts"
        value={lowStockCount}
        icon={<AlertTriangle className="h-5 w-5" />}
        sub="items at or below minimum"
      />
    </div>
  );
}