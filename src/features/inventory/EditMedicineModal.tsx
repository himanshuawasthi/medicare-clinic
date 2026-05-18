import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { z } from 'zod';
import { useAdjustInventory } from './queries';
import type { InventoryItemRecord } from './queries';
import { formatRupees } from '@/lib/money';

const EditStockSchema = z.object({
  delta_qty: z.number().int(),
  reason: z.string().min(1, 'Reason is required').max(500),
});
type EditStock = z.infer<typeof EditStockSchema>;

interface EditMedicineModalProps {
  item: InventoryItemRecord;
  onClose: () => void;
}

export function EditMedicineModal({ item, onClose }: EditMedicineModalProps) {
  const { mutateAsync: adjust, isPending } = useAdjustInventory();
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditStock>({
    resolver: zodResolver(EditStockSchema),
    defaultValues: { delta_qty: 0, reason: '' },
  });

  const deltaQtyInput = watch('delta_qty') ?? 0;
  const signedDelta = adjustType === 'add' ? Math.abs(deltaQtyInput) : -Math.abs(deltaQtyInput);
  const projectedStock = item.stock_qty + signedDelta;

  const onSubmit = handleSubmit(async (values) => {
    if (signedDelta === 0) {
      toast.error('Enter a non-zero quantity to adjust');
      return;
    }
    try {
      await adjust({
        inventory_id: item.id,
        delta_qty: signedDelta,
        reason: values.reason,
      });
      toast.success('Stock adjusted');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed';
      toast.error(msg);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Adjust Stock</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Item info */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">{item.name}</p>
            <p className="text-muted-foreground">
              Current stock: <strong>{item.stock_qty}</strong> {item.unit}
              {' · '}Price: {formatRupees(item.unit_price_paise)}/{item.unit}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {/* Adjust type */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  adjustType === 'add'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-accent'
                }`}
              >
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('remove')}
                className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                  adjustType === 'remove'
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : 'hover:bg-accent'
                }`}
              >
                Remove Stock
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Quantity <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                {...register('delta_qty', { valueAsNumber: true })}
                min={0}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Projected stock */}
            {deltaQtyInput !== 0 && (
              <p
                className={`text-sm font-medium ${
                  projectedStock < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                New stock: {projectedStock} {item.unit}
                {projectedStock < 0 && ' — Cannot go below zero'}
              </p>
            )}

            {/* Reason — required for any adjustment */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={2}
                placeholder={
                  adjustType === 'add'
                    ? 'e.g. New shipment from supplier'
                    : 'e.g. Expired tablets removed'
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.reason && (
                <p className="mt-1 text-xs text-destructive">{errors.reason.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || projectedStock < 0}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? 'Adjusting…' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}