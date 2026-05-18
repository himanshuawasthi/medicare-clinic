import { useState, useEffect } from 'react';
import { Search, Plus, Edit } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInventoryItems } from '@/features/inventory/queries';
import { AddMedicineModal } from '@/features/inventory/AddMedicineModal';
import { EditMedicineModal } from '@/features/inventory/EditMedicineModal';
import type { InventoryItemRecord } from '@/features/inventory/queries';
import { formatRupees } from '@/lib/money';
import { isExpired, isExpiringSoon } from '@/lib/date';

function stockStatus(item: InventoryItemRecord): { label: string; cls: string } {
  if (isExpired(item.expiry_date)) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (item.stock_qty === 0) return { label: 'Out of stock', cls: 'bg-gray-100 text-gray-600' };
  if (isExpiringSoon(item.expiry_date)) return { label: 'Expiring Soon', cls: 'bg-orange-100 text-orange-700' };
  if (item.stock_qty <= item.min_threshold) return { label: 'Low', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'In Stock', cls: 'bg-green-100 text-green-700' };
}

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItemRecord | null>(null);

  const { data: items = [], isLoading } = useInventoryItems(search);
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          void qc.invalidateQueries({ queryKey: ['inventory'] });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventory</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Medicine
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicines…"
          className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Medicine</th>
                <th className="px-4 py-2.5 text-left font-medium">Unit</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-center font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => {
                const status = stockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-muted/25">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.name}</p>
                      {item.batch_no && (
                        <p className="text-xs text-muted-foreground">Batch: {item.batch_no}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right">{item.stock_qty}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatRupees(item.unit_price_paise)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditItem(item)}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        <Edit className="h-3 w-3" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No medicines found
            </div>
          )}
        </div>
      )}

      {showAddModal && <AddMedicineModal onClose={() => setShowAddModal(false)} />}
      {editItem && (
        <EditMedicineModal item={editItem} onClose={() => setEditItem(null)} />
      )}
    </div>
  );
}