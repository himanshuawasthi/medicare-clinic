import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type DateRange = 'today' | 'week' | 'month' | 'custom';

function rangeToFilter(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: start.toISOString(), end };
  }
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { start: start.toISOString(), end };
  }
  // month
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end };
}

export function useKpiStats(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'kpi', range],
    queryFn: async () => {
      const { start, end } = rangeToFilter(range);

      const [patientsResult, prescResult, dispensedResult] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'DISPENSED')
          .gte('created_at', start)
          .lte('created_at', end),
      ]);

      return {
        totalPatients: patientsResult.count ?? 0,
        prescriptionsInRange: prescResult.count ?? 0,
        dispensedInRange: dispensedResult.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

export function usePrescriptionsChart(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'chart', range],
    queryFn: async () => {
      const { start, end } = rangeToFilter(range);
      const { data } = await supabase
        .from('prescriptions')
        .select('created_at, status')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at');

      // Group by IST date
      const grouped = new Map<string, number>();
      for (const row of data ?? []) {
        const date = new Date(row.created_at).toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
        });
        grouped.set(date, (grouped.get(date) ?? 0) + 1);
      }

      return Array.from(grouped.entries()).map(([date, count]) => ({ date, count }));
    },
    staleTime: 60_000,
  });
}

export function useStatusDistribution(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'status', range],
    queryFn: async () => {
      const { start, end } = rangeToFilter(range);
      const { data } = await supabase
        .from('prescriptions')
        .select('status')
        .gte('created_at', start)
        .lte('created_at', end);

      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ status: string }>) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
      }

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    staleTime: 60_000,
  });
}

export function useRevenueAndTopMedicines(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'revenue', range],
    queryFn: async () => {
      const { start, end } = rangeToFilter(range);

      const { data: dispenses } = await supabase
        .from('dispenses')
        .select('id')
        .gte('dispensed_at', start)
        .lte('dispensed_at', end);

      const ids = ((dispenses ?? []) as Array<{ id: string }>).map((d) => d.id);
      if (ids.length === 0) {
        return { revenueInRangePaise: 0, topMedicines: [] as { name: string; qty: number }[] };
      }

      const { data: lines } = await supabase
        .from('bill_lines')
        .select('line_total_paise, medicine_name, qty_dispensed')
        .in('dispense_id', ids)
        .neq('decision', 'short');

      const typedLines = (lines ?? []) as Array<{ line_total_paise: number; medicine_name: string; qty_dispensed: number }>;
      const revenueInRangePaise = typedLines.reduce(
        (sum, l) => sum + (l.line_total_paise ?? 0),
        0,
      );

      const byMedicine = new Map<string, number>();
      for (const l of typedLines) {
        byMedicine.set(l.medicine_name, (byMedicine.get(l.medicine_name) ?? 0) + l.qty_dispensed);
      }

      const topMedicines = Array.from(byMedicine.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }));

      return { revenueInRangePaise, topMedicines };
    },
    staleTime: 60_000,
  });
}