import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { usePatient } from '@/features/patients/queries';
import { useCreatePrescription } from '@/features/prescriptions/queries';
import { PatientHeader } from '@/features/patients/PatientHeader';
import { VitalsForm } from '@/features/prescriptions/VitalsForm';
import { MedicinesForm } from '@/features/prescriptions/MedicinesForm';
import { TestsForm } from '@/features/prescriptions/TestsForm';
import { DoctorNotesField } from '@/features/prescriptions/DoctorNotesField';
import { PrescriptionCreateSchema, type PrescriptionCreate } from '@/lib/zod-schemas/prescription';
import { useAuth } from '@/auth/AuthContext';

const DRAFT_KEY = (patientId: string) => `rx-draft-${patientId}`;

export default function DoctorConsultation() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const { mutateAsync: createPrescription, isPending } = useCreatePrescription();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<PrescriptionCreate>({
    resolver: zodResolver(PrescriptionCreateSchema),
    defaultValues: {
      patient_id: patientId ?? '',
      symptoms: '',
      items: [{ medicine_name: '', dosage: '', frequency: '', quantity: 1 }],
    },
  });

  // Restore draft from sessionStorage on mount (T044)
  useEffect(() => {
    if (!patientId) return;
    const raw = sessionStorage.getItem(DRAFT_KEY(patientId));
    if (raw) {
      try {
        const draft = JSON.parse(raw) as PrescriptionCreate;
        reset(draft);
      } catch {
        sessionStorage.removeItem(DRAFT_KEY(patientId));
      }
    }
  }, [patientId, reset]);

  // Auto-save draft to sessionStorage on beforeunload (T044)
  const formValues = watch();
  useEffect(() => {
    if (!patientId) return;
    const handler = () => {
      sessionStorage.setItem(DRAFT_KEY(patientId), JSON.stringify(formValues));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [patientId, formValues]);

  const doctorNotes = watch('doctor_notes') ?? '';
  const watchedVitals = watch('vitals');

  const onSubmit = handleSubmit(async (values) => {
    if (!user?.id) return;
    try {
      const filtered: PrescriptionCreate = {
        ...values,
        recommended_tests: values.recommended_tests?.filter(
          (t) => typeof t === 'string' && t.trim().length > 0,
        ),
      };
      await createPrescription({ ...filtered, doctor_id: user.id });
      if (patientId) sessionStorage.removeItem(DRAFT_KEY(patientId));
      toast.success('Prescription created');
      void navigate(`/patients/${patientId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prescription');
    }
  });

  if (patientLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/patients/${patientId}`)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">New Consultation</h1>
      </div>

      {patient && (
        <PatientHeader
          fullName={patient.full_name}
          mobile={patient.mobile}
          gender={patient.gender}
          dob={patient.dob}
          allergies={patient.allergies}
        />
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Symptoms / Chief Complaint <span className="text-destructive">*</span>
          </label>
          <textarea
            {...register('symptoms')}
            rows={3}
            placeholder="Describe patient's presenting symptoms…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.symptoms && (
            <p className="mt-1 text-xs text-destructive">{errors.symptoms.message}</p>
          )}
        </div>

        <VitalsForm register={register} errors={errors} watchedVitals={watchedVitals} />

        <MedicinesForm control={control} register={register} errors={errors} />

        <TestsForm control={control} />

        <DoctorNotesField
          register={register}
          errors={errors}
          currentLength={doctorNotes.length}
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}`)}
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}