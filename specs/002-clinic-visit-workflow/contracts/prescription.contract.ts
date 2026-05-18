/**
 * Contract: edit_dispensed_prescription Edge Function
 *
 * Path:   POST /functions/v1/edit_dispensed_prescription
 * Auth:   Bearer <user JWT> — doctor role required
 * Source: supabase/functions/edit_dispensed_prescription/index.ts
 * Tests:  tests/contract/prescription-edit.contract.test.ts
 *
 * Transactional guarantees (all-or-nothing):
 *   1. Update prescriptions row (fields in `changes`)
 *   2. Update/replace prescription_items rows if items changed
 *   3. Write audit.audit_log row (before + after + reason)
 *   4. Set dispenses.flagged_edit_after_dispense = true (if medicines changed)
 *   5. Publish Realtime notification to admin channel
 *
 * Note: This function does NOT reverse inventory. Post-dispense inventory
 * corrections must be made via adjust_inventory separately by an admin.
 *
 * For PENDING prescriptions, doctors edit directly via the Supabase JS client
 * (no edge function needed — no audit complexity, no flag required).
 */

import { z } from 'zod';

// ── Request ───────────────────────────────────────────────────────────────────

const VitalsChangeSchema = z.object({
  sys_bp: z.number().int().positive().optional(),
  dia_bp: z.number().int().positive().optional(),
  pulse: z.number().int().positive().optional(),
  temp_f: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  height_cm: z.number().positive().optional(),
});

const PrescriptionItemChangeSchema = z.object({
  inventory_id: z.string().uuid().optional(),
  medicine_name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration_days: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
});

export const PrescriptionEditRequestSchema = z.object({
  /** UUID of the DISPENSED prescription to correct. */
  prescription_id: z.string().uuid(),

  /**
   * Fields to update. Only included keys are changed.
   * At least one field must be present.
   */
  changes: z
    .object({
      symptoms: z.string().min(1).max(2000).optional(),
      vitals: VitalsChangeSchema.optional(),
      doctor_notes: z.string().max(1000).optional(),
      recommended_tests: z.array(z.string()).optional(),
      /** Full replacement of medicine rows (not partial patch). */
      items: z.array(PrescriptionItemChangeSchema).min(1).optional(),
    })
    .refine(obj => Object.keys(obj).length > 0, {
      message: 'At least one field must be provided in changes',
    }),

  /**
   * Mandatory reason for editing a Dispensed prescription.
   * Minimum 10 characters (FR-010).
   */
  reason: z.string().min(10).max(1000),
});

export type PrescriptionEditRequest = z.infer<typeof PrescriptionEditRequestSchema>;

// ── Success Response (HTTP 200) ───────────────────────────────────────────────

export const PrescriptionEditSuccessSchema = z.object({
  prescription_id: z.string().uuid(),
  updated_at: z.string().datetime(), // UTC ISO-8601
  /**
   * True if medicine names or quantities changed — triggers pharmacy flag
   * and admin dashboard alert (FR-011).
   */
  medicines_changed: z.boolean(),
  audit_log_id: z.number().int().positive(),
});

export type PrescriptionEditSuccess = z.infer<typeof PrescriptionEditSuccessSchema>;

// ── Error Responses ───────────────────────────────────────────────────────────

export const PrescriptionEditErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'PRESCRIPTION_NOT_FOUND',
    'PRESCRIPTION_NOT_DISPENSED', // Only edits DISPENSED prescriptions via this fn
    'REASON_TOO_SHORT',           // HTTP 400 — reason < 10 chars
    'UNAUTHORIZED',               // HTTP 401 — not doctor role
    'VALIDATION_ERROR',           // HTTP 400 — Zod parse failure
  ]),
});

export type PrescriptionEditError = z.infer<typeof PrescriptionEditErrorSchema>;

// ── Inventory Adjust Contract ─────────────────────────────────────────────────
//
// Moved to: inventory-adjust.contract.ts
// Import InventoryAdjust* schemas from there.

// ── Contract Test Assertions ──────────────────────────────────────────────────
//
// tests/contract/prescription-edit.contract.test.ts MUST verify:
//
// Happy path — symptoms-only edit:
//   POST with valid DISPENSED prescription_id, reason ≥ 10 chars
//   → 200, response matches PrescriptionEditSuccessSchema
//   → medicines_changed = false (no items in changes)
//   → DB: dispenses.flagged_edit_after_dispense = false
//   → DB: audit.audit_log has 1 row with before/after JSON
//
// Happy path — medicine change:
//   POST with items in changes (different from original)
//   → 200, medicines_changed = true
//   → DB: dispenses.flagged_edit_after_dispense = true
//   → Realtime notification published to admin channel
//
// Not DISPENSED:
//   POST with PENDING prescription_id
//   → 400, error.code = 'PRESCRIPTION_NOT_DISPENSED'
//
// Reason too short:
//   POST with reason.length < 10
//   → 400, error.code = 'REASON_TOO_SHORT'
//
// tests/contract/inventory-adjust.contract.test.ts MUST verify:
//
// Happy path — restock:
//   POST delta_qty = +50, reason = 'Monthly restock'
//   → 200, new_stock = previous_stock + 50
//   → DB: audit_log row present
//
// Negative result:
//   POST delta_qty = -(current_stock + 1)
//   → 422, error.code = 'WOULD_GO_NEGATIVE', current_stock populated
//   → DB: inventory_items.stock_qty unchanged (rollback verified)