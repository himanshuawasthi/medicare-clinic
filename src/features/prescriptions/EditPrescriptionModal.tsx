import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { MedicinesForm } from './MedicinesForm';
import { DoctorNotesField } from './DoctorNotesField';
import { PrescriptionEditPendingSchema } from '@/lib/zod-schemas/prescription';
import type { PrescriptionCreate, PrescriptionEditPending } from '@/lib/zod-schemas/prescription';

// Schema for DISPENSED edit (requires reason ≥ 10 chars — FR-010)
const DispensedEditSchema = z.object({
  symptoms: z.string().min(1).max(2000).optional(),
  doctor_notes: z.string().max(1000).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});
type DispensedEdit = z.infer<typeof DispensedEditSchema>;

interface EditPrescriptionModalProps {
  prescriptionId: string;
  status: 'PENDING' | 'DISPENSED' | 'CANCELLED';
  initialData: Partial<PrescriptionCreate>;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPrescriptionModal({
  prescriptionId,
  status,
  initialData,
  onClose,
  onSuccess,
}: EditPrescriptionModalProps) {
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  // PENDING edit — free form, no reason required
  const pendingForm = useForm<PrescriptionEditPending>({
    resolver: zodResolver(PrescriptionEditPendingSchema),
    defaultValues: {
      prescription_id: prescriptionId,
      changes: {
        symptoms: initialData.symptoms ?? '',
        doctor_notes: initialData.doctor_notes ?? '',
        items: initialData.items ?? [],
      },
    },
  });

  // DISPENSED edit — reason required
  const dispensedForm = useForm<DispensedEdit>({
    resolver: zodResolver(DispensedEditSchema),
    defaultValues: {
      symptoms: initialData.symptoms ?? '',
      doctor_notes: initialData.doctor_notes ?? '',
      reason: '',
    },
  });

  async function handlePendingSubmit(values: PrescriptionEditPending) {
    setIsPending(true);
    try {
      // Supabase JS client — audit row written by DB trigger automatically
      const updatePayload: Record<string, unknown> = {};
      if (values.changes.symptoms) updatePayload['symptoms'] = values.changes.symptoms;
      if (values.changes.doctor_notes !== undefined) updatePayload['doctor_notes'] = values.changes.doctor_notes;
      if (values.changes.vitals) updatePayload['vitals'] = values.changes.vitals;
      if (values.changes.recommended_tests) updatePayload['recommended_tests'] = values.changes.recommended_tests;

      const { error: rxErr } = await supabase
        .from('prescriptions')
        .update(updatePayload)
        .eq('id', prescriptionId);
      if (rxErr) throw rxErr;

      // If items changed: DELETE existing + INSERT new (T048 pattern)
      if (values.changes.items) {
        const { error: delErr } = await supabase
          .from('prescription_items')
          .delete()
          .eq('prescription_id', prescriptionId);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase
          .from('prescription_items')
          .insert(
            values.changes.items.map((item) => ({
              prescription_id: prescriptionId,
              inventory_id: item.inventory_id ?? null,
              medicine_name: item.medicine_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration_days: item.duration_days ?? null,
              quantity: item.quantity,
            })),
          );
        if (insErr) throw insErr;
      }

      void qc.invalidateQueries({ queryKey: ['prescriptions', prescriptionId] });
      toast.success('Prescription updated');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsPending(false);
    }
  }

  async function handleDispensedSubmit(values: DispensedEdit) {
    setIsPending(true);
    try {
      const changes: Record<string, unknown> = {};
      if (values.symptoms) changes['symptoms'] = values.symptoms;
      if (values.doctor_notes !== undefined) changes['doctor_notes'] = values.doctor_notes;

      const res = await supabase.functions.invoke('edit_dispensed_prescription', {
        body: {
          prescription_id: prescriptionId,
          changes,
          reason: values.reason,
        },
      });
      if (res.error) throw res.error;

      void qc.invalidateQueries({ queryKey: ['prescriptions', prescriptionId] });
      toast.success('Prescription updated');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsPending(false);
    }
  }

  const doctorNotes = status === 'PENDING'
    ? pendingForm.watch('changes.doctor_notes') ?? ''
    : dispensedForm.watch('doctor_notes') ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">
            Edit Prescription
            {status === 'DISPENSED' && (
              <span className="ml-2 text-xs font-normal text-amber-600">
                (already dispensed — reason required)
              </span>
            )}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {status === 'PENDING' ? (
            <form onSubmit={pendingForm.handleSubmit(handlePendingSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Symptoms</label>
                <textarea
                  {...pendingForm.register('changes.symptoms')}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <MedicinesForm
                control={pendingForm.control as unknown as Parameters<typeof MedicinesForm>[0]['control']}
                register={pendingForm.register as unknown as Parameters<typeof MedicinesForm>[0]['register']}
                errors={pendingForm.formState.errors as Parameters<typeof MedicinesForm>[0]['errors']}
              />
              <DoctorNotesField
                register={pendingForm.register as unknown as Parameters<typeof DoctorNotesField>[0]['register']}
                errors={pendingForm.formState.errors as Parameters<typeof DoctorNotesField>[0]['errors']}
                currentLength={doctorNotes.length}
              />
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={dispensedForm.handleSubmit(handleDispensedSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Symptoms</label>
                <textarea
                  {...dispensedForm.register('symptoms')}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Doctor Notes</label>
                <textarea
                  {...dispensedForm.register('doctor_notes')}
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Reason for edit <span className="text-destructive">*</span>
                  <span className="ml-1 text-xs text-muted-foreground">(min 10 characters)</span>
                </label>
                <textarea
                  {...dispensedForm.register('reason')}
                  rows={2}
                  placeholder="Explain why this dispensed prescription is being edited…"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {dispensedForm.formState.errors.reason && (
                  <p className="mt-1 text-xs text-destructive">
                    {dispensedForm.formState.errors.reason.message}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}