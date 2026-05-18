import { useFieldArray } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { PrescriptionCreate } from '@/lib/zod-schemas/prescription';

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed (PRN)',
  'Before meals',
  'After meals',
  'At bedtime',
  'Custom',
];

interface MedicinesFormProps {
  control: Control<PrescriptionCreate>;
  register: UseFormRegister<PrescriptionCreate>;
  errors: FieldErrors<PrescriptionCreate>;
}

function MedicineRow({
  index,
  register,
  errors,
  onRemove,
  canRemove,
}: {
  index: number;
  register: UseFormRegister<PrescriptionCreate>;
  errors: FieldErrors<PrescriptionCreate>;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const nameField = register(`items.${index}.medicine_name`);

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid gap-2 sm:grid-cols-2">
          {/* Medicine name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Medicine <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              {...nameField}
              placeholder="Medicine name"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              list={`medicine-list-${index}`}
            />
            {/* Hidden inventory_id — populated via autocomplete */}
            <input type="hidden" {...register(`items.${index}.inventory_id`)} />
            {errors.items?.[index]?.medicine_name && (
              <p className="mt-0.5 text-xs text-destructive">
                {errors.items?.[index]?.medicine_name?.message}
              </p>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Dosage <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              {...register(`items.${index}.dosage`)}
              placeholder="e.g. 500mg"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.items?.[index]?.dosage && (
              <p className="mt-0.5 text-xs text-destructive">
                {errors.items?.[index]?.dosage?.message}
              </p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Frequency <span className="text-destructive">*</span>
            </label>
            <select
              {...register(`items.${index}.frequency`)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.items?.[index]?.frequency && (
              <p className="mt-0.5 text-xs text-destructive">
                {errors.items?.[index]?.frequency?.message}
              </p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Duration (days)
            </label>
            <input
              type="number"
              {...register(`items.${index}.duration_days`, {
                valueAsNumber: true,
                setValueAs: (v: string) => (v === '' ? undefined : parseInt(v, 10)),
              })}
              min={1}
              placeholder="e.g. 7"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              min={1}
              placeholder="e.g. 14"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.items?.[index]?.quantity && (
              <p className="mt-0.5 text-xs text-destructive">
                {errors.items?.[index]?.quantity?.message}
              </p>
            )}
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-5 flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove medicine"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function MedicinesForm({ control, register, errors }: MedicinesFormProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Medicines <span className="text-destructive">*</span>
        </h3>
        {typeof errors.items === 'object' && !Array.isArray(errors.items) && (
          <p className="text-xs text-destructive">{(errors.items as { message?: string }).message}</p>
        )}
      </div>

      {fields.map((field, index) => (
        <MedicineRow
          key={field.id}
          index={index}
          register={register}
          errors={errors}
          onRemove={() => remove(index)}
          canRemove={fields.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            medicine_name: '',
            dosage: '',
            frequency: '',
            quantity: 1,
          })
        }
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add medicine
      </button>
    </div>
  );
}