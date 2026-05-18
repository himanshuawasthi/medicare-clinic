# Research: MediCare Clinic Management System (v1)

**Phase 0 output** | Branch: `002-clinic-visit-workflow` | Date: 2026-05-18

All decisions below were either explicit in the user-provided plan (`02_plan.md`) or derived
from constitution v2.0.0 non-negotiables. No NEEDS CLARIFICATION items remain.

---

## Decision 1: Frontend Framework

**Decision**: React 18.3 + Vite 6 + TypeScript 5.4 (strict)

**Rationale**: Already used in the Figma prototype. React 18 concurrent features improve
form responsiveness on the 20+ field consultation form. Vite 6 provides sub-second HMR.
TypeScript strict mode is a constitution non-negotiable (Principle III).

**Alternatives considered**:
- Next.js: adds SSR/SSG complexity with no benefit for a login-gated clinic SPA. Rejected.
- SvelteKit: smaller bundle but no existing prototype alignment. Rejected.

---

## Decision 2: Backend Platform

**Decision**: Supabase managed (ap-south-1, Mumbai)

**Rationale**: Provides PostgreSQL + Auth + RLS + Realtime + Storage + Edge Functions in
one managed service. Data residency in Mumbai satisfies India data-localisation expectations.
RLS is the constitution's mandatory access control mechanism (Principle II), and Supabase
makes RLS the primary API surface — no separate backend needed for simple CRUD.

**Alternatives considered**:
- Node.js/Express + Postgres on Railway: doubles infra surface, no built-in RLS enforcement,
  separate auth service required. Rejected.
- Firebase: no SQL, no RLS, weak relational integrity for prescription ↔ inventory atomicity.
  Rejected.

---

## Decision 3: Authentication

**Decision**: Supabase Auth (email/password + magic link); roles stored as JWT custom claims

**Rationale**: Built-in, integrates directly with RLS via `auth.jwt()`. Magic link satisfies
the forgot-password requirement (FR-033) without a separate email service integration.
Roles in JWT custom claims allow RLS policies to call `current_user_roles()` without a
round-trip to the users table on every query.

**Alternatives considered**:
- Auth0: additional cost, external PHI exposure risk via JWT claims. Rejected.
- Custom JWT: maintenance burden, security risk. Rejected.

---

## Decision 4: Validation Library

**Decision**: Zod (latest) — single source of truth for all schemas

**Rationale**: Constitution Principle III mandates Zod for all form and API boundaries.
`z.infer<typeof Schema>` eliminates duplicate TypeScript type declarations. Schemas in
`src/lib/zod-schemas/` are imported by React components and Supabase edge functions alike.

**Alternatives considered**:
- Yup: weaker TypeScript inference, no infer pattern. Rejected.
- io-ts: too verbose for clinic staff forms. Rejected.

---

## Decision 5: Transactional Operations via Edge Functions

**Decision**: Three Supabase Edge Functions for multi-row atomic writes; all other
operations use direct Supabase JS client with RLS.

**Rationale**: Constitution Principle II requires all writes to go through RLS. However,
three operations require multi-row transactional atomicity that the JS client cannot
guarantee: dispense (5 tables), edit-after-dispense (3 tables + notification), inventory
adjust (3 tables). Edge Functions run server-side Deno with the service-role key,
wrap operations in a single Postgres transaction, and are tested via contract tests
(Principle IV).

**Alternatives considered**:
- Postgres stored procedures (RPCs): viable, but harder to unit-test and version-control
  alongside application code. Deferred to v2 consideration.
- Client-side multi-statement: no transaction guarantee, PHI in error surfaces. Rejected.

---

## Decision 6: Real-time Delivery

**Decision**: Supabase Realtime (Postgres replication channel)

**Rationale**: Satisfies SC-006 (queue updates within 2 s of prescription save) without
polling. No separate WebSocket server required. Subscribing to `prescriptions:status=PENDING`
means the pharmacy queue only reacts to relevant changes.

**Alternatives considered**:
- Polling every 5 s: violates the 2 s latency target and wastes bandwidth. Rejected.
- Server-Sent Events via Edge Function: requires persistent function execution, not suited
  to Supabase Edge Function model. Rejected.

---

## Decision 7: Money Representation

**Decision**: Integer paise (1 INR = 100 paise) in all DB columns and application code;
conversion to ₹ display only in `src/lib/money.ts`

**Rationale**: Constitution Principle VI mandates this explicitly. Floating-point arithmetic
on monetary values produces rounding errors in billing (e.g., 0.1 + 0.2 ≠ 0.3). Integer
paise is the standard in Indian fintech (e.g., Razorpay, Stripe INR).

**GST**: Deferred to v2. The spec's open question (item 8) was not resolved in clarify.
Bill lines store base price only. Constitution confirms "tax line items stored separately"
if GST is added — the schema is forward-compatible via a nullable `gst_rate_paise` column.

---

## Decision 8: Date/Time Handling

**Decision**: UTC storage in all `timestamptz` columns; `src/lib/date.ts` converts to
Asia/Kolkata (IST, UTC+05:30) for display in `dd-MMM-yyyy` format.

**Rationale**: Constitution Principle VII mandates this explicitly. Supabase (PostgreSQL)
stores `timestamptz` as UTC internally regardless of client timezone. `date-fns-tz` or
`Temporal` API in the `date.ts` utility handles IST conversion correctly including DST
edge cases (India does not observe DST, so Asia/Kolkata is always +05:30).

---

## Decision 9: Offline Handling

**Decision**: `sessionStorage` form persistence on network loss; full offline writes deferred to v2.

**Rationale**: Spec assumption explicitly defers full offline writes. React Hook Form's
`watch()` + a `beforeunload` + `online`/`offline` event listeners can persist the current
form state to `sessionStorage` and restore it on reconnect, satisfying the graceful
degradation requirement without service workers.

---

## Decision 10: Print / Bill Generation

**Decision**: `react-to-print` + print CSS stylesheet; A5 page; no server-side PDF in v1.

**Rationale**: User-provided plan specifies this explicitly. Browser print dialog is
sufficient for a single-clinic POS setting and avoids a PDF generation dependency. The
A5 layout is defined in a print-only CSS class that React-to-print targets.

---

## Decision 11: New Dependencies Added vs. Plan

No new dependencies have been introduced beyond those listed in the user-provided plan.
All packages listed in Technical Context are justified by the plan's §1 tech stack table.

---

## Deferred Items (open questions not yet resolved)

The following open questions from the spec remain deferred pending a `/speckit-clarify` run:

| # | Question | Impact if unresolved |
|---|---|---|
| 1 | Prescription Cancellation rules | Minor: Cancelled state exists in schema; cancellation trigger TBD in tasks |
| 3 | Patient allergy capture | Additive: `allergies` column present in schema as `text`; surfacing in prescription form is a task |
| 5 | Generic substitution detail | The `decision` field on `bill_lines` captures `substituted` flag; substitute item ID TBD |
| 6 | Unpaid prescription fate | Implementation assumption: Dispensed status is set on completion; payment tracking is v2 |
| 8 | GST on bill | Deferred to v2; schema forward-compatible |

These do not block Phase 1 design. Tasks will include placeholder tasks for items 1, 3, and 5.