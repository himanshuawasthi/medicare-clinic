import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PatientCreate } from '@/lib/zod-schemas/patient';

export interface PatientRecord {
  id: string;
  full_name: string;
  mobile: string;
  gender: string;
  dob: string | null;
  address: string | null;
  allergies: string | null;
  created_at: string;
}

export function usePatientSearch(term: string) {
  return useQuery({
    queryKey: ['patients', 'search', term],
    queryFn: async () => {
      if (term.trim().length < 2) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, mobile, gender, dob, allergies, created_at')
        .is('deleted_at', null)
        .or(`full_name.ilike.%${term}%,mobile.ilike.%${term}%`)
        .order('full_name')
        .limit(30);
      if (error) throw error;
      return (data ?? []) as PatientRecord[];
    },
    enabled: term.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      if (!id) throw new Error('No patient id');
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, mobile, gender, dob, address, allergies, created_at')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as PatientRecord;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PatientCreate) => {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          full_name: input.full_name,
          mobile: input.mobile,
          gender: input.gender,
          dob: input.dob ?? null,
          address: input.address ?? null,
          allergies: input.allergies ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}