import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PrescriptionCreate } from '@/lib/zod-schemas/prescription';

const MAX_CHARS = 1000;

interface DoctorNotesFieldProps {
  register: UseFormRegister<PrescriptionCreate>;
  errors: FieldErrors<PrescriptionCreate>;
  currentLength?: number;
}

export function DoctorNotesField({
  register,
  errors,
  currentLength = 0,
}: DoctorNotesFieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Doctor Notes
        </label>
        <span
          className={`text-xs ${
            currentLength > MAX_CHARS * 0.9
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}
        >
          {currentLength}/{MAX_CHARS}
        </span>
      </div>
      <textarea
        {...register('doctor_notes')}
        rows={3}
        maxLength={MAX_CHARS}
        placeholder="Clinical observations, treatment rationale, follow-up instructions…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {errors.doctor_notes && (
        <p className="mt-1 text-xs text-destructive">{errors.doctor_notes.message}</p>
      )}
    </div>
  );
}