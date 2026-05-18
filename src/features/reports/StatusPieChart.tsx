import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStatusDistribution, type DateRange } from './queries';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  DISPENSED: '#22c55e',
  CANCELLED: '#ef4444',
};

export function StatusPieChart({ range }: { range: DateRange }) {
  const { data = [], isLoading } = useStatusDistribution(range);

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
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={75}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] ?? '#6366f1'}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v, 'Prescriptions']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}