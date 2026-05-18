import { z } from 'zod';

export const InventoryItemSchema = z.object({
  name:             z.string().min(1, 'Name is required').max(200),
  unit:             z.enum(['tablet', 'strip', 'ml', 'bottle', 'other']),
  batch_no:         z.string().optional(),
  stock_qty:        z.number().int().min(0, 'Stock cannot be negative'),
  min_threshold:    z.number().int().min(0),
  // Constitution VI: price entered as ₹ in UI; stored as integer paise
  unit_price_rupees: z.number().positive('Price must be positive'),
  expiry_date:      z.string().optional(),
});

export const InventoryAdjustSchema = z.object({
  inventory_id: z.string().uuid(),
  delta_qty:    z.number().int(),
  reason:       z.string().min(1, 'Reason is required').max(500),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type InventoryAdjust = z.infer<typeof InventoryAdjustSchema>;