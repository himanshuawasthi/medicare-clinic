import { AlertTriangle } from 'lucide-react';
import { useInventoryItems } from './queries';

export function LowStockWidget({ compact = false }: { compact?: boolean }) {
  const { data: items = [] } = useInventoryItems();
  const lowStock = items.filter(
    (i) => i.deleted_at === null && i.stock_qty <= i.min_threshold && i.stock_qty > 0,
  );
  const outOfStock = items.filter(
    (i) => i.deleted_at === null && i.stock_qty === 0,
  );

  const totalAlert = lowStock.length + outOfStock.length;

  if (totalAlert === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        {totalAlert} stock alert{totalAlert !== 1 ? 's' : ''}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h3 className="font-semibold text-amber-800">
          Stock Alerts ({totalAlert})
        </h3>
      </div>
      {outOfStock.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium text-red-700">Out of Stock</p>
          <ul className="space-y-0.5">
            {outOfStock.map((i) => (
              <li key={i.id} className="text-sm text-red-700">
                {i.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {lowStock.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-amber-700">Low Stock</p>
          <ul className="space-y-0.5">
            {lowStock.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between text-sm text-amber-800"
              >
                <span>{i.name}</span>
                <span className="text-xs">
                  {i.stock_qty} / {i.min_threshold} min
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}