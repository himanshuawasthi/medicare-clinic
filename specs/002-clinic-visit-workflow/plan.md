# Implementation Plan: MediCare Clinic Management System (v1)

**Branch**: `002-clinic-visit-workflow` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-clinic-visit-workflow/spec.md`

## Summary

Build a DPDPA 2023-compliant clinic management system that digitises the full
patient visit workflow — search → consult → prescribe → dispense → bill — for a single
clinic location. The backend is Supabase (PostgreSQL + Auth + RLS + Realtime + Edge
Functions) running in ap-south-1 (Mumbai). The frontend is a React 18 SPA built with
Vite, Tailwind CSS, shadcn/ui, React Hook Form + Zod, and TanStack Query. All monetary
values are stored as integer paise; all timestamps are stored UTC and displayed in
Asia/Kolkata. PHI never appears in logs, URLs, or error messages.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`)

**Primary Dependencies**: React 18.3, Vite 6, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod (latest), TanStack Query v5, Supabase JS client, Recharts 2, react-to-print, Vitest, React Testing Library, Playwright, ESLint + Prettier

**Storage**: PostgreSQL 15+ via Supabase managed (ap-south-1, Mumbai) — RLS enforced on every table; audit schema append-only

**Testing**: Vitest (unit), React Testing Library (component), Playwright (e2e); contract tests against Supabase local Docker instance

**Target Platform**: Browser-based SPA; responsive for 1366×768 PC, 10" tablet, 5.5" Android phone; hosted on Vercel (frontend) + Supabase managed (backend)

**Project Type**: Full-stack web application — React SPA + Supabase (PostgreSQL + Edge Functions)

**Performance Goals**: Patient search ≤ 300 ms; consultation load ≤ 1 s; queue real-time push ≤ 2 s; dashboard charts ≤ 2 s at 200 rx/day; initial JS bundle ≤ 250 KB gzipped

**Constraints**: No PHI in logs/URLs/errors; Supabase service-role key server-side only; TypeScript strict + no `any`; all money as integer paise; all timestamps UTC in DB; Zod for every form and API boundary; audit log row on every prescription write and inventory adjustment

**Scale/Scope**: Single clinic; ~10,000–50,000 patients; up to 200 prescriptions/day; up to 50 concurrent staff users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the Medicare Clinic Constitution (`.specify/memory/constitution.md`):

- [x] **I. Patient-First & PHI Privacy**: No PHI in logs, errors, or URLs. Patient IDs are UUIDs in all paths. Vite `drop_console` in production build. Sentry PHI scrubber configured. Supabase anon CI test confirms prescriptions return 0 rows to unauthenticated clients.
- [x] **II. Supabase RLS Security**: Every table has RLS enabled. Service-role key is Vercel server-side env var only — never shipped to browser. Three edge functions handle all multi-row transactional writes (dispense, edit-after-dispense, inventory adjust). RLS policies reviewed per table in data-model.md.
- [x] **III. Type-Safe Contracts**: Zod schemas defined once in `src/lib/zod-schemas/`; imported by both React components and edge functions. TypeScript strict mode enabled with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. ESLint `no-explicit-any: error` in CI.
- [x] **IV. Contract Tests**: Every edge function has a contract test against a real Supabase local instance verifying request/response shape and transactional rollback. Contract tests are mandatory CI gates.
- [x] **V. Audit Trail**: `audit_log` table is append-only (RLS blocks UPDATE/DELETE for all roles). All three transactional edge functions write an audit row in the same transaction as the mutating operation. Inventory adjustments also write to `inventory_adjustments` table.
- [x] **VI. INR Currency**: All monetary values stored as integer paise in `unit_price_paise`, `line_total_paise`, `total_paise` columns. `src/lib/money.ts` handles paise ↔ rupees conversion at display boundary only. No float arithmetic on money anywhere.
- [x] **VII. UTC / Asia/Kolkata**: All `timestamptz` columns store UTC. `src/lib/date.ts` formats to Asia/Kolkata in `dd-MMM-yyyy` format. Supabase instance timezone is UTC. No local-time arithmetic in business logic.
- [x] **VIII. Simplicity**: No separate Node/Express backend. Only three edge functions for multi-row transactional atomicity. No CQRS/event sourcing. Complexity justified against atomicity and compliance requirements.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser — React SPA (Vite)                                │
│  Routes: /patients  /consult/:patientId  /store            │
│          /inventory  /reports  /login                      │
│  State: TanStack Query (server) + Zustand (UI-only)        │
│  Realtime: subscribes to "prescriptions" channel           │
└──────────────────────────┬─────────────────────────────────┘
                           │  HTTPS (Supabase JS client, anon key)
                           ▼
┌────────────────────────────────────────────────────────────┐
│  Supabase (ap-south-1, Mumbai)                             │
│  ├── PostgreSQL  (schemas: public, audit)                  │
│  │     RLS policies enforce role-based access              │
│  ├── Auth    (users, roles in JWT custom claims)           │
│  ├── Realtime  (publishes prescriptions table changes)     │
│  ├── Storage   (reserved bucket: rx-attachments, v2)       │
│  └── Edge Functions  (3 only in v1)                        │
│       ├── dispense_prescription                            │
│       ├── edit_dispensed_prescription                      │
│       └── adjust_inventory                                 │
└────────────────────────────────────────────────────────────┘
```

**Why no separate Node/Express backend**: For v1, every write goes through PostgreSQL with
RLS — that is the API surface. Edge Functions cover only the three operations requiring
multi-row transactional atomicity. A full middle tier triples code complexity with no
benefit at this scale.

## Project Structure

### Documentation (this feature)

```text
specs/002-clinic-visit-workflow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── README.md
│   ├── dispense.contract.ts
│   └── prescription.contract.ts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
medicare-clinic/
├── supabase/
│   ├── migrations/                 # ordered SQL migrations
│   ├── functions/
│   │   ├── dispense_prescription/
│   │   ├── edit_dispensed_prescription/
│   │   └── adjust_inventory/
│   └── seed.sql                    # 8 demo medicines, 3 demo patients
├── src/
│   ├── app/
│   │   ├── routes.tsx
│   │   ├── App.tsx
│   │   └── providers/              # QueryClient, AuthProvider, Toast
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── PatientSearch.tsx
│   │   ├── PatientRegister.tsx
│   │   ├── DoctorConsultation.tsx
│   │   ├── MedicalStore.tsx        # pharmacy queue
│   │   ├── DispensePrescription.tsx
│   │   ├── Inventory.tsx
│   │   └── Reports.tsx
│   ├── features/
│   │   ├── patients/               # hooks, queries, schemas
│   │   ├── prescriptions/
│   │   ├── inventory/
│   │   ├── dispense/
│   │   └── reports/
│   ├── components/                 # shadcn primitives + clinic widgets
│   └── lib/
│       ├── supabase.ts             # client init (anon key only)
│       ├── audit.ts
│       ├── money.ts                # paise <-> rupees helpers
│       ├── date.ts                 # Asia/Kolkata formatting helpers
│       └── zod-schemas/            # shared schemas (client + edge fns)
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
│       ├── full-visit.spec.ts
│       ├── dispense.spec.ts
│       └── low-stock-alert.spec.ts
├── .env.example                    # NEVER commit real keys
└── package.json
```

**Structure Decision**: Supabase-first full-stack web app. No separate backend project.
Frontend (`src/`) co-located with Supabase config (`supabase/`) in a single monorepo.

## Edge Functions

Only three edge functions — all other operations are direct Supabase JS client calls with RLS.

**`dispense_prescription`**
Input: `{ prescription_id, lines: [{ inventory_id, qty }], notes }`
In one transaction: insert `dispenses` row → insert `bill_lines` → insert negative
`inventory_adjustments` → decrement `inventory_items.stock_qty` → set prescription status
DISPENSED → write `audit_log` row. Rejects 409 if prescription already dispensed (row
lock prevents race). Rejects if any stock would go negative.

**`edit_dispensed_prescription`**
Input: `{ prescription_id, changes, reason }`
Updates prescription → writes audit row → sets `flagged_edit_after_dispense = true` on
the related dispense → raises admin notification via Supabase Realtime.

**`adjust_inventory`**
Input: `{ inventory_id, delta_qty, reason }`
Writes `inventory_adjustments` row → updates `inventory_items.stock_qty` → writes
`audit_log` row. All in one transaction.

## Realtime Channels

- **`prescriptions:status=PENDING`** — pharmacy queue subscribes; doctor insert events render new prescription cards within 2 s (SC-006).
- **`inventory_items`** — inventory page and dashboard KPI tile subscribe; stock changes trigger targeted row refetch.

## Testing Strategy

- **Unit (Vitest)**: Zod schemas, `money.ts` helpers, `date.ts` helpers, vitals validation, mobile format validation.
- **Component (RTL)**: Consultation form (medicine row add/remove), dispense screen (short-stock warning), inventory low-stock badge.
- **Contract tests**: Each edge function tested against Supabase local Docker instance — verifies request/response shape and transactional rollback on failure.
- **E2E (Playwright)**:
  1. Full visit: login as doctor → register patient → create prescription → switch to pharmacist → verify queue update → dispense → verify bill total.
  2. Edit-after-dispense raises admin alert.
  3. Stock falls below threshold → dashboard badge + inventory page highlight.
- **Coverage gate in CI**: lines ≥ 70% for `lib/` and `features/*/`; no gate on `pages/` (high UI churn).

## Environments

| Env | Frontend | Supabase project | Trigger |
|---|---|---|---|
| Local | `localhost:5173` | Supabase local (Docker) | any branch |
| Staging | `staging.medicare.example` | `medicare-staging` (ap-south-1) | merge to `main` |
| Production | `app.medicare.example` | `medicare-prod` (ap-south-1) | tagged release |

## Security Checklist (must be green before launch)

- [ ] Service-role key never present in client bundle (grep build output)
- [ ] All RLS policies enabled (`pg_policies` count in CI test)
- [ ] Sentry PHI scrubber configured (regex strips mobile, name fields)
- [ ] HTTPS-only cookies; `SameSite=Lax`
- [ ] No PHI in URL paths (UUID only)
- [ ] No PHI in `console.log` (Vite `drop_console` in prod)
- [ ] DB backup verified by restoring to scratch project before go-live
- [ ] Forgot-password rate-limited (Supabase default)
- [ ] CI anon-role test: `select * from prescriptions` returns 0 rows

## Performance Budget

| Metric | Target |
|---|---|
| First contentful paint (3G Fast) | ≤ 2.0 s |
| Patient search keystroke → results | ≤ 300 ms |
| Consultation page interactive | ≤ 1.0 s |
| Queue new-prescription render latency | ≤ 2.0 s after doctor save |
| Reports page chart render | ≤ 2.0 s for 30 days × 200 rx/day |
| JS bundle gzipped | ≤ 250 KB initial; Reports route lazy-loaded |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Internet drops mid-consultation | `sessionStorage` preserves form state; offline warning banner |
| Double-dispense race condition | `dispense_prescription` row-locks prescription; second call returns 409 |
| RLS misconfig leaks PHI | CI: `select * from prescriptions` as anon must return 0 rows |
| Supabase Mumbai outage | Document read-only fallback to backup; full HA is v2 |
| Inventory drift from physical count | Weekly audit with reason; dashboard shows last-count date |

## Constraints (agent must respect)

1. Money is **always** integer paise in code and DB. Convert at UI boundary only.
2. Dates are **always** UTC in DB. Format with Asia/Kolkata at display only.
3. Validation goes through Zod — no ad-hoc string/length checks.
4. No new top-level dependency without a one-line justification in `research.md`.
5. Every Supabase write requiring multi-row transactional atomicity goes through an edge function. Direct client writes are acceptable for single-row operations (audit rows for those are written by DB trigger).
6. No PHI in `console.log`, ever.
7. TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.

## Complexity Tracking

Three edge functions are justified by multi-row transactional atomicity requirements.
A direct Supabase JS client write cannot guarantee rollback across dispense + bill_lines +
inventory_adjustments + audit_log in a single transaction. No other complexity violations.