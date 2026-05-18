import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DispenseInput } from '@/lib/zod-schemas/dispense';

interface PrescriptionForDispense {
  id: string;
  status: string;
  symptoms: string | null;
  created_at: string;
  patients: { full_name: string; mobile: string } | null;
  prescription_items: Array<{
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration_days: number | null;
    quantity: number;
    inventory_id: string | null;
    inventory_items: {
      id: string;
      stock_qty: number;
      expiry_date: string | null;
    } | null;
  }>;
}

export function usePrescriptionForDispense(id: string | undefined) {
  return useQuery({
    queryKey: ['prescriptions', 'dispense', id],
    queryFn: async () => {
      if (!id) throw new Error('No prescription id');
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id, status, symptoms, created_at,
          patients(full_name, mobile),
          prescription_items(
            id, medicine_name, dosage, frequency, duration_days, quantity, inventory_id,
            inventory_items(id, stock_qty, expiry_date)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as PrescriptionForDispense;
    },
    enabled: !!id,
  });
}

export function useDispense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispenseInput) => {
      const invokeResult = await supabase.functions.invoke<{ dispense_id: string; total_paise: number; status: string }>(
        'dispense_prescription',
        { body: input },
      );
      if (invokeResult.error) throw invokeResult.error;
      return invokeResult.data as { dispense_id: string; total_paise: number; status: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}