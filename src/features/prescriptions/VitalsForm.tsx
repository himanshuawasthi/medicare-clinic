import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { PrescriptionCreate } from '@/lib/zod-schemas/prescription';

// Out-of-range thresholds (warnings only — do not block save)
const WARNINGS = {
  sys_bp: (v: number) => v < 70 || v > 200,
  dia_bp: (v: number) => v < 40 || v > 130,
  pulse: (v: number) => v < 40 || v > 200,
  temp_f: (v: number) => v < 95 || v > 105,
  weight_kg: (v: number) => v < 1 || v > 300,
  height_cm: (v: number) => v < 30 || v > 250,
};

interface VitalsFormProps {
  register: UseFormRegister<PrescriptionCreate>;
  errors: FieldErrors<PrescriptionCreate>;
  watchedVitals?: Partial<Record<keyof typeof WARNINGS, number>>;
}

interface VitalsField {
  key: keyof typeof WARNINGS;
  label: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  step?: number;
}

const FIELDS: VitalsField[] = [
  { key: 'sys_bp',    label: 'Systolic BP',   unit: 'mmHg', placeholder: '120',   min: 50,  max: 250 },
  { key: 'dia_bp',    label: 'Diastolic BP',  unit: 'mmHg', placeholder: '80',    min: 30,  max: 150 },
  { key: 'pulse',     label: 'Pulse',         unit: 'bpm',  placeholder: '72',    min: 20,  max: 300 },
  { key: 'temp_f',    label: 'Temperature',   unit: '°F',   placeholder: '98.6',  min: 90,  max: 110, step: 0.1 },
  { key: 'weight_kg', label: 'Weight',        unit: 'kg',   placeholder: '65',    min: 1,   max: 300, step: 0.1 },
  { key: 'height_cm', label: 'Height',        unit: 'cm',   placeholder: '170',   min: 20,  max: 260 },
];

export function VitalsForm({ register, watchedVitals = {} }: VitalsFormProps) {
  return (
    <fieldset className="rounded-md border p-4">
      <legend className="px-1 text-sm font-medium text-muted-foreground">Vitals (optional)</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((field) => {
          const val = watchedVitals[field.key];
          const warn = typeof val === 'number' && !isNaN(val) && WARNINGS[field.key](val);
          return (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={field.step ?? 1}
                  min={field.min}
                  max={field.max}
                  {...register(`vitals.${field.key}` as `vitals.${typeof field.key}`, {
                    valueAsNumber: true,
                    setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
                  })}
                  placeholder={field.placeholder}
                  className={`w-full rounded-md border bg-background py-1.5 pl-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    warn ? 'border-amber-400' : ''
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {field.unit}
                </span>
              </div>
              {warn && (
                <p className="mt-0.5 text-xs text-amber-600">Unusual value — verify</p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}