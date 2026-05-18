import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PrescriptionCreate } from '@/lib/zod-schemas/prescription';

export function usePrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: ['prescriptions', 'patient', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id, status, symptoms, vitals, doctor_notes, recommended_tests,
          created_at, updated_at,
          prescription_items (
            id, medicine_name, dosage, frequency, duration_days, quantity, inventory_id
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: ['prescriptions', id],
    queryFn: async () => {
      if (!id) throw new Error('No prescription id');
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id, status, symptoms, vitals, doctor_notes, recommended_tests,
          created_at, updated_at, patient_id, doctor_id,
          prescription_items (
            id, medicine_name, dosage, frequency, duration_days, quantity, inventory_id
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PrescriptionCreate & { doctor_id: string }) => {
      // Insert prescription
      const { data: rx, error: rxErr } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: input.patient_id,
          doctor_id: input.doctor_id,
          symptoms: input.symptoms,
          vitals: input.vitals ?? null,
          doctor_notes: input.doctor_notes ?? null,
          recommended_tests: input.recommended_tests ?? null,
          status: 'PENDING',
        })
        .select('id')
        .single();
      if (rxErr) throw rxErr;

      // Insert items
      const rxId = (rx as { id: string }).id;
      const items = input.items.map((item) => ({
        prescription_id: rxId,
        inventory_id: item.inventory_id ?? null,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration_days: item.duration_days ?? null,
        quantity: item.quantity,
      }));

      const { error: itemErr } = await supabase
        .from('prescription_items')
        .insert(items);
      if (itemErr) throw itemErr;

      return rx;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['prescriptions', 'patient', variables.patient_id],
      });
    },
  });
}