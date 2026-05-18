# Contracts: MediCare Clinic Management System (v1)

**Phase 1 output** | Branch: `002-clinic-visit-workflow`

This directory documents the interface contracts for the three Supabase Edge Functions
that handle multi-row transactional operations. All other data access uses the Supabase
JS client directly with RLS (no additional contract needed beyond the Zod schemas in
`src/lib/zod-schemas/`).

Each Edge Function contract defines:
- HTTP method and path
- Request body (Zod schema reference)
- Response shape (success and error)
- Transactional guarantees
- Contract test location

## Contracts

| Function | File | HTTP | Path |
|---|---|---|---|
| Dispense prescription | [dispense.contract.ts](dispense.contract.ts) | POST | `/functions/v1/dispense_prescription` |
| Edit dispensed prescription | [prescription.contract.ts](prescription.contract.ts) | POST | `/functions/v1/edit_dispensed_prescription` |
| Adjust inventory | [inventory-adjust.contract.ts](inventory-adjust.contract.ts) | POST | `/functions/v1/adjust_inventory` |

## Contract Test Rule (Constitution IV)

Every function listed here MUST have a corresponding contract test in
`tests/contract/` that:
1. Runs against Supabase local (Docker)
2. Sends the documented request shape (via the shared Zod schema)
3. Asserts the documented response shape
4. Tests the failure path (e.g., insufficient stock, duplicate dispense)
5. Verifies the transaction rolled back completely on failure (no partial writes)

Contract tests are a **mandatory CI gate** — PRs cannot merge without them passing.