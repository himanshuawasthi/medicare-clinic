import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { InventoryItemSchema, type InventoryItem } from '@/lib/zod-schemas/inventory';
import { useCreateInventoryItem, useInventoryItems } from './queries';
import { formatRupees } from '@/lib/money';

interface AddMedicineModalProps {
  onClose: () => void;
}

export function AddMedicineModal({ onClose }: AddMedicineModalProps) {
  const { mutateAsync: create, isPending } = useCreateInventoryItem();
  const [mergeCandidate, setMergeCandidate] = useState<{
    id: string;
    name: string;
    stock_qty: number;
    unit_price_paise: number;
  } | null>(null);
  const { data: items = [] } = useInventoryItems();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InventoryItem>({
    resolver: zodResolver(InventoryItemSchema),
    defaultValues: { unit: 'tablet', stock_qty: 0, min_threshold: 10 },
  });

  const watchedName = watch('name') ?? '';

  // Check for near-duplicate on blur
  function checkForDuplicate() {
    const match = items.find(
      (i) => i.name.toLowerCase() === watchedName.toLowerCase().trim(),
    );
    if (match) {
      setMergeCandidate({
        id: match.id,
        name: match.name,
        stock_qty: match.stock_qty,
        unit_price_paise: match.unit_price_paise,
      });
    } else {
      setMergeCandidate(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create(values);
      toast.success(`${values.name} added to inventory`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add medicine';
      if (msg.includes('23505') || msg.toLowerCase().includes('unique')) {
        toast.error('A medicine with this name and batch already exists');
      } else {
        toast.error(msg);
      }
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Add Medicine</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mergeCandidate && (
          <div className="mx-4 mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Existing item found: {mergeCandidate.name}</p>
            <p className="text-xs mt-0.5">
              Current stock: {mergeCandidate.stock_qty} ·{' '}
              Price: {formatRupees(mergeCandidate.unit_price_paise)}
            </p>
            <p className="text-xs mt-1">Continue to add as a new batch, or cancel to update the existing item.</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              onBlur={checkForDuplicate}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Amoxicillin 250mg"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Unit</label>
              <select
                {...register('unit')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="tablet">Tablet</option>
                <option value="strip">Strip</option>
                <option value="ml">mL</option>
                <option value="bottle">Bottle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Batch No.</label>
              <input
                type="text"
                {...register('batch_no')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Opening Stock <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                {...register('stock_qty', { valueAsNumber: true })}
                min={0}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              {errors.stock_qty && (
                <p className="mt-1 text-xs text-destructive">{errors.stock_qty.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Low-stock Alert</label>
              <input
                type="number"
                {...register('min_threshold', { valueAsNumber: true })}
                min={0}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Unit Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              {...register('unit_price_rupees', { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. 12.50"
            />
            {errors.unit_price_rupees && (
              <p className="mt-1 text-xs text-destructive">{errors.unit_price_rupees.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Expiry Date</label>
            <input
              type="date"
              {...register('expiry_date')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Adding…' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}