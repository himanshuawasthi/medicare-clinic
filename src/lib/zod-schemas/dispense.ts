import { z } from 'zod';

export const BillLineInputSchema = z.object({
  inventory_id:           z.string().uuid(),
  qty:                    z.number().int().min(0),
  decision:               z.enum(['dispensed', 'short', 'substituted']),
  substitute_inventory_id: z.string().uuid().optional(),
});

export const DispenseInputSchema = z.object({
  prescription_id: z.string().uuid(),
  lines:           z.array(BillLineInputSchema).min(1),
  notes:           z.string().max(500).optional(),
});

export type BillLineInput = z.infer<typeof BillLineInputSchema>;
export type DispenseInput = z.infer<typeof DispenseInputSchema>;