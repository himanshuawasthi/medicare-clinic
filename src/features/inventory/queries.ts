import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toPaise } from '@/lib/money';
import type { InventoryItem, InventoryAdjust } from '@/lib/zod-schemas/inventory';

export interface InventoryItemRecord {
  id: string;
  name: string;
  unit: string;
  batch_no: string | null;
  stock_qty: number;
  min_threshold: number;
  unit_price_paise: number;
  expiry_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInventoryItems(search = '') {
  return useQuery({
    queryKey: ['inventory', 'list', search],
    queryFn: async () => {
      let q = supabase
        .from('inventory_items')
        .select(
          'id, name, unit, batch_no, stock_qty, min_threshold, unit_price_paise, expiry_date, deleted_at, created_at, updated_at',
        )
        .is('deleted_at', null)
        .order('name');
      if (search.trim().length >= 2) {
        q = q.ilike('name', `%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InventoryItemRecord[];
    },
    staleTime: 30_000,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InventoryItem) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          name: input.name,
          unit: input.unit,
          batch_no: input.batch_no ?? null,
          stock_qty: input.stock_qty,
          min_threshold: input.min_threshold,
          unit_price_paise: toPaise(input.unit_price_rupees),
          expiry_date: input.expiry_date ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InventoryAdjust) => {
      const invokeResult = await supabase.functions.invoke<{ new_stock: number; previous_stock: number }>('adjust_inventory', {
        body: {
          inventory_id: input.inventory_id,
          delta_qty: input.delta_qty,
          reason: input.reason,
        },
      });
      if (invokeResult.error) throw invokeResult.error;
      return invokeResult.data as { new_stock: number; previous_stock: number };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}