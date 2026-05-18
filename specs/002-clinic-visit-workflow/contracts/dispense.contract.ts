/**
 * Contract: dispense_prescription Edge Function
 *
 * Path:   POST /functions/v1/dispense_prescription
 * Auth:   Bearer <user JWT> — pharmacist role required (enforced by RLS)
 * Source: supabase/functions/dispense_prescription/index.ts
 * Tests:  tests/contract/dispense.contract.test.ts
 *
 * Transactional guarantees (all-or-nothing):
 *   1. Insert dispenses row
 *   2. Insert bill_lines rows (one per input line)
 *   3. Insert negative inventory_adjustments rows
 *   4. Decrement inventory_items.stock_qty for each dispensed item
 *   5. Set prescriptions.status = 'DISPENSED'
 *   6. Write audit.audit_log row
 *
 * If any step fails, the entire transaction is rolled back.
 * No partial updates are permitted (Constitution V).
 */

import { z } from 'zod';

// ── Request ──────────────────────────────────────────────────────────────────

export const DispenseRequestSchema = z.object({
  /** UUID of the prescription to dispense. Must be in PENDING status. */
  prescription_id: z.string().uuid(),

  /** One entry per medicine row on the prescription. */
  lines: z
    .array(
      z.object({
        /** inventory_items.id for the item being dispensed or substituted. */
        inventory_id: z.string().uuid(),

        /**
         * Actual quantity dispensed.
         * - For 'dispensed': 1..prescribed_quantity
         * - For 'short':     0..available_stock
         * - For 'substituted': quantity of the substitute item
         */
        qty: z.number().int().min(0),

        decision: z.enum(['dispensed', 'short', 'substituted']),

        /**
         * Required when decision = 'substituted'.
         * The inventory_items.id of the medicine actually given.
         */
        substitute_inventory_id: z.string().uuid().optional(),
      })
    )
    .min(1),

  /** Optional pharmacist notes for the dispense record. */
  notes: z.string().max(500).optional(),
});

export type DispenseRequest = z.infer<typeof DispenseRequestSchema>;

// ── Success Response (HTTP 200) ───────────────────────────────────────────────

export const DispenseSuccessSchema = z.object({
  dispense_id: z.string().uuid(),
  prescription_id: z.string().uuid(),
  /** Total bill in paise (integer). Display: divide by 100 for ₹. */
  total_paise: z.number().int().min(0),
  dispensed_at: z.string().datetime(), // UTC ISO-8601
  bill_lines: z.array(
    z.object({
      inventory_id: z.string().uuid(),
      medicine_name: z.string(),
      qty_dispensed: z.number().int().min(0),
      decision: z.enum(['dispensed', 'short', 'substituted']),
      unit_price_paise: z.number().int().min(0),
      line_total_paise: z.number().int().min(0),
    })
  ),
});

export type DispenseSuccess = z.infer<typeof DispenseSuccessSchema>;

// ── Error Responses ───────────────────────────────────────────────────────────

export const DispenseErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'PRESCRIPTION_NOT_FOUND',
    'PRESCRIPTION_ALREADY_DISPENSED', // HTTP 409
    'PRESCRIPTION_CANCELLED',
    'INSUFFICIENT_STOCK',             // HTTP 422 — lists which items
    'ITEM_EXPIRED',                   // HTTP 422
    'UNAUTHORIZED',                   // HTTP 401 — not pharmacist role
    'VALIDATION_ERROR',               // HTTP 400 — Zod parse failure
  ]),
  /** Present for INSUFFICIENT_STOCK — lists inventory_id of each short item. */
  short_items: z.array(z.string().uuid()).optional(),
});

export type DispenseError = z.infer<typeof DispenseErrorSchema>;

// ── Contract Test Assertions ──────────────────────────────────────────────────
//
// tests/contract/dispense.contract.test.ts MUST verify:
//
// Happy path:
//   POST with valid prescription_id (PENDING) and sufficient stock
//   → 200, response matches DispenseSuccessSchema
//   → DB: prescriptions.status = 'DISPENSED'
//   → DB: inventory_items.stock_qty decremented by qty for each line
//   → DB: audit.audit_log has 1 row with action='prescription.dispense'
//
// Conflict — already dispensed:
//   POST same prescription_id twice
//   → Second call: 409, error.code = 'PRESCRIPTION_ALREADY_DISPENSED'
//   → DB: inventory_items.stock_qty unchanged after second call
//
// Insufficient stock:
//   POST with qty > available stock for at least one item
//   → 422, error.code = 'INSUFFICIENT_STOCK', short_items populated
//   → DB: prescriptions.status still 'PENDING' (rollback verified)
//   → DB: inventory_items.stock_qty unchanged (rollback verified)
//
// Expired item:
//   POST including an inventory_id whose expiry_date < today
//   → 422, error.code = 'ITEM_EXPIRED'
//   → DB: no rows inserted (rollback verified)