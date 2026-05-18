/**
 * Contract: adjust_inventory Edge Function
 *
 * Path:   POST /functions/v1/adjust_inventory
 * Auth:   Bearer <user JWT> — pharmacist or admin role required
 * Source: supabase/functions/adjust_inventory/index.ts
 * Tests:  tests/contract/inventory-adjust.contract.test.ts
 *
 * Transactional guarantees (all-or-nothing):
 *   1. Insert inventory_adjustments row
 *   2. Update inventory_items.stock_qty by delta_qty
 *   3. Write audit.audit_log row
 *
 * Rejects if resulting stock_qty < 0.
 */

import { z } from 'zod';

// ── Request ───────────────────────────────────────────────────────────────────

export const InventoryAdjustRequestSchema = z.object({
  inventory_id: z.string().uuid(),
  /**
   * Positive for restock; negative for write-off/wastage.
   * System will reject if resulting stock_qty would go below 0.
   */
  delta_qty: z.number().int(),
  /** Mandatory for all adjustments (FR-022). */
  reason: z.string().min(1).max(500),
});

export type InventoryAdjustRequest = z.infer<typeof InventoryAdjustRequestSchema>;

// ── Success Response (HTTP 200) ───────────────────────────────────────────────

export const InventoryAdjustSuccessSchema = z.object({
  adjustment_id: z.string().uuid(),
  inventory_id: z.string().uuid(),
  previous_stock: z.number().int().min(0),
  new_stock: z.number().int().min(0),
  created_at: z.string().datetime(),
});

export type InventoryAdjustSuccess = z.infer<typeof InventoryAdjustSuccessSchema>;

// ── Error Responses ───────────────────────────────────────────────────────────

export const InventoryAdjustErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'ITEM_NOT_FOUND',
    'WOULD_GO_NEGATIVE',   // HTTP 422 — current_stock + delta_qty < 0
    'UNAUTHORIZED',        // HTTP 401
    'VALIDATION_ERROR',    // HTTP 400
  ]),
  current_stock: z.number().int().optional(), // Present for WOULD_GO_NEGATIVE
});

export type InventoryAdjustError = z.infer<typeof InventoryAdjustErrorSchema>;

// ── Contract Test Assertions ──────────────────────────────────────────────────
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
//
// Write-off:
//   POST delta_qty = -5, reason = 'Damaged stock'
//   → 200, new_stock = previous_stock - 5
//   → DB: inventory_adjustments row present with negative delta
//   → DB: audit_log row present