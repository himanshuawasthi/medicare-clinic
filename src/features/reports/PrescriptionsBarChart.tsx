import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePrescriptionsChart, type DateRange } from './queries';

export function PrescriptionsBarChart({ range }: { range: DateRange }) {
  const { data = [], isLoading } = usePrescriptionsChart(range);

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No prescriptions in this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v: number) => [v, 'Prescriptions']}
        />
        <Bar dataKey="count" name="Prescriptions" className="fill-primary" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}