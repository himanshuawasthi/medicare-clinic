import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PatientCreateSchema, type PatientCreate } from '@/lib/zod-schemas/patient';
import { useCreatePatient } from '@/features/patients/queries';

export default function PatientRegister() {
  const navigate = useNavigate();
  const { mutateAsync: createPatient, isPending } = useCreatePatient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PatientCreate>({
    resolver: zodResolver(PatientCreateSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { id } = await createPatient(values);
      toast.success('Patient registered');
      void navigate(`/consult/${id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      // Supabase unique violation code
      if (message.includes('23505') || message.toLowerCase().includes('unique')) {
        setError('mobile', {
          message: 'A patient with this name and mobile already exists',
        });
      } else {
        toast.error(message);
      }
    }
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Register New Patient</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            {...register('full_name')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Patient's full name"
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Mobile Number <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            {...register('mobile')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="10-digit mobile (e.g. 9876543210)"
            maxLength={10}
          />
          {errors.mobile && (
            <p className="mt-1 text-xs text-destructive">{errors.mobile.message}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Gender <span className="text-destructive">*</span>
          </label>
          <select
            {...register('gender')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>

        {/* DOB */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Date of Birth <span className="text-muted-foreground text-xs">(or enter age below)</span>
          </label>
          <input
            type="date"
            {...register('dob')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.dob && (
            <p className="mt-1 text-xs text-destructive">{errors.dob.message}</p>
          )}
        </div>

        {/* Age (alternative to DOB) */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Age in Years <span className="text-muted-foreground text-xs">(if DOB unknown)</span>
          </label>
          <input
            type="number"
            {...register('age_years', { valueAsNumber: true })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 35"
            min={1}
            max={120}
          />
        </div>

        {/* Address */}
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <textarea
            {...register('address')}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Optional"
          />
        </div>

        {/* Allergies */}
        <div>
          <label className="mb-1 block text-sm font-medium">Known Allergies</label>
          <input
            type="text"
            {...register('allergies')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Penicillin, Sulfa drugs (optional)"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Registering…' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}