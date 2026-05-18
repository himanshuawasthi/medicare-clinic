import { useFieldArray } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { PrescriptionCreate } from '@/lib/zod-schemas/prescription';

interface TestsFormProps {
  control: Control<PrescriptionCreate>;
}

export function TestsForm({ control }: TestsFormProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'recommended_tests',
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Recommended Tests</h3>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input
            type="text"
            value={field as unknown as string}
            onChange={(e) => update(index, e.target.value as unknown as never)}
            placeholder={`Test ${index + 1}`}
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove test"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append('' as unknown as never)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add test
      </button>
    </div>
  );
}