---
description: "Task list for MediCare Clinic Management System (v1)"
---

# Tasks: MediCare Clinic Management System (v1)

**Input**: Design documents from `specs/002-clinic-visit-workflow/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tech stack**: TypeScript 5.4 · React 18 · Vite 6 · Tailwind 4 · shadcn/ui · Zod · TanStack Query v5 · Supabase (Postgres + Auth + RLS + Realtime + Edge Functions) · Vitest · Playwright

**Constitution reminders** (v2.0.0 — check on every task):
- Money → always integer paise; convert at UI boundary only via `src/lib/money.ts`
- Dates → always UTC in DB; format Asia/Kolkata via `src/lib/date.ts`
- PHI → never in `console.log`, logs, error messages, or URLs
- Zod → every form and API boundary validated by shared schemas in `src/lib/zod-schemas/`
- RLS → every write via Supabase client or edge function; service-role key never in browser

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Task can run in parallel (no dependency conflicts)
- **[Story]**: User story label e.g. [US1]...[US10]

---

## Phase 1: Setup

**Purpose**: Project initialization — no user story work can begin until T001–T006 complete.

- [x] T001 Create Vite + React + TypeScript project shell; verify `pnpm dev` opens localhost:5173; confirm `tsc --noEmit` passes with `strict: true` in `tsconfig.json`
- [x] T002 Add Tailwind CSS 4, shadcn/ui, lucide-react, Recharts 2, Zustand (for UI-only state: queue counter badge, sidebar); verify a shadcn `Button` renders with Tailwind classes
- [x] T003 [P] Add ESLint (`@typescript-eslint/no-explicit-any: error`), Prettier, Tailwind ESLint plugin, lint-staged; verify `pnpm lint` passes clean
- [x] T004 [P] Configure `.env.example` with all required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); confirm service-role key is absent from all client-side files
- [x] T005 Initialize Supabase project locally (`supabase init`, `supabase start`); create staging project in ap-south-1 (Mumbai) via Supabase dashboard — NOTE: Supabase CLI not installed on dev machine; `supabase/config.toml` created manually; run `pnpm install -g supabase` or use scoop to install CLI before `supabase start`
- [x] T006 [P] Configure GitHub Actions workflow `.github/workflows/ci.yml`: lint → typecheck → unit tests → contract tests → build → bundle size check → PHI log scan → RLS anon test

---

## Phase 2: Foundational

**Purpose**: Data layer, shared lib, edge functions, and frontend shell — MUST complete before any user story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database Migrations

- [x] T007 Write migration `supabase/migrations/001_patients.sql`: `patients` table with UUID PK, Indian mobile check (`^[6-9][0-9]{9}$`), UNIQUE `(full_name, mobile)`, `deleted_at` soft-delete column
- [x] T008 [P] Write migration `supabase/migrations/002_users.sql`: `users` table mirroring `auth.users(id)`, `roles text[]` with CHECK constraint, seed bootstrap admin user
- [x] T009 Write migration `supabase/migrations/003_inventory.sql`: `inventory_items` (stock CHECK `>= 0`, `unit_price_paise` integer, `unique(name, batch_no)`) and `inventory_adjustments` (append-only)
- [x] T010 Write migration `supabase/migrations/004_prescriptions.sql`: `prescriptions` (status CHECK enum `PENDING/DISPENSED/CANCELLED`, `vitals jsonb`) and `prescription_items` (cascade delete, `quantity > 0` check)
- [x] T011 Write migration `supabase/migrations/005_dispenses.sql`: `dispenses` (UNIQUE `prescription_id` — one dispense per prescription) and `bill_lines` (`line_total_paise` GENERATED ALWAYS AS `qty_dispensed * unit_price_paise` STORED)
- [x] T012 Write migration `supabase/migrations/006_audit_log.sql`: `audit.audit_log` table in separate `audit` schema; `bigserial` PK; no UPDATE/DELETE RLS policy for any role; include trigger function `audit_prescriptions_update()` that fires AFTER UPDATE on `public.prescriptions` and writes one `audit.audit_log` row (actor from `auth.uid()`, before/after as JSON) in the same transaction — this is the audit mechanism for PENDING prescription edits (Constitution Principle V; C1 fix)
- [x] T013 Write all RLS policies per `specs/002-clinic-visit-workflow/data-model.md` — patients, prescriptions, inventory_items, dispenses, bill_lines, inventory_adjustments, audit.audit_log; include `current_user_roles()` helper function; add RLS CHECK on `prescriptions` INSERT that `doctor_id` must belong to a user with `Doctor` role (FR-031 — Admin cannot self-attribute as prescribing doctor)
- [x] T014 Create `inventory_for_doctor` view that excludes `unit_price_paise` column; grant SELECT to doctor role only on this view
- [x] T015 Write `supabase/seed.sql`: 3 demo patients, 8 demo medicines, 3 demo staff users (doctor/pharmacist/admin roles)
- [x] T016 Generate TypeScript types from Supabase schema into `src/lib/database.types.ts` via `supabase gen types typescript`

### Shared Library

- [x] T017 [P] Create `src/lib/supabase.ts`: Supabase client initialised with anon key only; never import service-role key here
- [x] T018 [P] Create `src/lib/money.ts`: `toPaise(rupees)`, `toRupees(paise)`, `formatRupees(paise)` with `en-IN` locale and ₹ symbol; unit tests in `tests/unit/money.test.ts`
- [x] T019 [P] Create `src/lib/date.ts`: `toIST(utcDate)`, `formatDate(date)` → `dd-MMM-yyyy`, `formatTime(date)` → 12-h AM/PM IST, `ageFromDOB(dob)`; unit tests in `tests/unit/date.test.ts`
- [x] T020 [P] Create `src/lib/zod-schemas/patient.ts` (`PatientCreateSchema`, `PatientSearchSchema`), `prescription.ts` (`PrescriptionCreateSchema`, `VitalsSchema`, `PrescriptionItemSchema`), `dispense.ts` (`DispenseInputSchema`, `BillLineInputSchema`), `inventory.ts` (`InventoryItemSchema`, `InventoryAdjustSchema`); unit tests in `tests/unit/schemas.test.ts`
- [x] T021 Create `src/lib/audit.ts`: `buildAuditPayload(actor, action, targetTable, targetId, before, after, reason?)` returning typed payload matching `audit.audit_log` insert schema

### Edge Functions

- [x] T022 Create `supabase/functions/dispense_prescription/index.ts`: validates `DispenseInputSchema`; in one Postgres transaction: insert `dispenses` → insert `bill_lines` → insert negative `inventory_adjustments` → decrement `inventory_items.stock_qty` → set prescription `status = 'DISPENSED'` → write `audit_log`; row-lock prescription to prevent race (returns 409 if already dispensed); reject if any stock would go negative
- [x] T023 Create `supabase/functions/edit_dispensed_prescription/index.ts`: validates `PrescriptionEditRequestSchema` (reason ≥ 10 chars); updates prescription → writes `audit_log` → sets `dispenses.flagged_edit_after_dispense = true` if medicines changed → publishes Realtime admin notification
- [x] T024 Create `supabase/functions/adjust_inventory/index.ts`: validates `InventoryAdjustSchema`; in one transaction: insert `inventory_adjustments` → update `inventory_items.stock_qty` → write `audit_log`; reject if resulting stock < 0

### Contract Tests

- [x] T025 [P] Create `tests/contract/dispense.contract.test.ts`: test happy path (stock decremented, status DISPENSED, audit row), 409 on double-dispense, insufficient-stock rollback, expired-item rejection — all against Supabase local Docker
- [x] T026 [P] Create `tests/contract/prescription-edit.contract.test.ts`: test symptoms-only edit (medicines_changed=false), medicine-change edit (flag set, Realtime notification), short reason rejection (< 10 chars)
- [x] T027 [P] Create `tests/contract/inventory-adjust.contract.test.ts`: test restock (+delta), write-off (−delta), negative-stock rejection (rollback verified)

### Frontend Shell

- [x] T028 Create `src/app/App.tsx` and `src/app/routes.tsx`: define all routes (`/login`, `/patients`, `/patients/:id`, `/consult/:patientId`, `/store`, `/dispense/:rxId`, `/inventory`, `/reports`); lazy-load `/reports` route (Recharts bundle)
- [x] T029 [P] Create `src/app/providers/`: TanStack QueryClient provider, AuthProvider, Sonner Toast provider; compose in `App.tsx`
- [x] T030 Create `src/auth/`: `useAuth()` hook, `useRole()` hook, `ProtectedRoute` component that redirects to `/login` if unauthenticated or role mismatch
- [x] T031 Create `src/components/Layout.tsx`: sidebar with navigation links and queue counter badge, header with user name + logout, responsive mobile hamburger (shadcn Sheet)
- [x] T032 [P] CI: add RLS verification step — connect as anon key, run `SELECT * FROM prescriptions LIMIT 1`, assert 0 rows returned
- [x] T033 [P] CI: add PHI leak step — grep `dist/` build output for hardcoded test patient names, assert 0 matches

**Checkpoint**: Foundation ready — user story phases can now begin (P1 first, others in parallel if team capacity allows).

---

## Phase 3: US-1 — Find or Register a Patient (Priority: P1) 🎯 MVP

**Goal**: Doctor can find an existing patient in < 300 ms or register a new one and land directly on the consultation screen.

**Independent Test**: Search for "Ravi" in the seeded dataset → results appear without page reload. Register "Test Patient" with a new mobile → system navigates to consultation screen. Attempt duplicate (name + mobile) → blocked with error.

### Implementation for US-1

- [x] T034 [P] [US1] Create `src/features/patients/queries.ts`: `usePatientSearch(term)` TanStack Query hook with 300 ms debounce; `useCreatePatient()` mutation; `usePatient(id)` query
- [x] T035 [US1] Create `src/pages/PatientSearch.tsx`: controlled search input, debounced query, results list with patient name + mobile + age, empty-state "Register new patient" CTA; patient tap navigates to `/patients/:id`
- [x] T036 [US1] Create `src/pages/PatientRegister.tsx`: React Hook Form + `PatientCreateSchema` validation; fields: full name, mobile (10-digit Indian), gender (M/F/O), DOB or age, address, allergies (optional); on submit calls `useCreatePatient`; duplicate (name+mobile) API error → inline form error; success navigates to `/consult/:patientId`
- [x] T037 [P] [US1] Create `src/features/patients/PatientHeader.tsx`: displays name, age/gender badge, mobile (masked last 4), allergies chip (red) if present; used by DoctorConsultation and PatientSearch detail view

**Checkpoint**: US-1 independently testable — patient search and registration work end-to-end.

---

## Phase 4: US-2 — Record a New Prescription (Priority: P2)

**Goal**: Doctor captures vitals, symptoms, medicines (with inventory autocomplete), tests, and notes in one form. Saving creates a PENDING prescription visible to the pharmacy within 2 s.

**Independent Test**: Log in as doctor, open patient, fill consultation form with 2 medicine rows, save → prescription appears in pharmacy queue (in a second tab) within 2 s without manual refresh.

### Implementation for US-2

- [x] T038 [P] [US2] Create `src/features/prescriptions/queries.ts`: `useCreatePrescription()` mutation, `usePrescriptions(patientId)` query for history, `usePrescription(id)` query
- [x] T039 [US2] Create `src/features/prescriptions/VitalsForm.tsx`: 6 optional fields (systolic BP, diastolic BP, pulse bpm, temperature °F, weight kg, height cm); out-of-range values show inline warning but do not block save
- [x] T040 [US2] Create `src/features/prescriptions/MedicinesForm.tsx`: dynamic rows (add/remove); each row: medicine name autocomplete from `inventory_items` (excluding expired), dosage text, frequency select + custom option, duration days, quantity; minimum 1 row enforced by Zod
- [x] T041 [P] [US2] Create `src/features/prescriptions/TestsForm.tsx`: free-text row list (add/remove); empty rows pruned on save
- [x] T042 [P] [US2] Create `src/features/prescriptions/DoctorNotesField.tsx`: textarea with 1000-char hard cap and live counter
- [x] T043 [US2] Create `src/pages/DoctorConsultation.tsx`: compose VitalsForm, MedicinesForm, TestsForm, DoctorNotesField; on save: insert to `prescriptions` + `prescription_items`; navigate to patient history on success
- [x] T044 [US2] Add `sessionStorage` form persistence to `DoctorConsultation.tsx`: watch form values → serialize to `sessionStorage` on `beforeunload`; restore from `sessionStorage` on mount if draft exists; clear on successful save
- [x] T045 [US2] Add Supabase Realtime subscription in `src/pages/MedicalStore.tsx` to `prescriptions` channel filtered by `status=PENDING`; new INSERT events append card to queue within 2 s

**Checkpoint**: US-2 independently testable — prescription save and real-time queue update work end-to-end.

---

## Phase 5: US-6 — Patient Medical History (Priority: P6)

**Goal**: Doctor opens a patient and immediately sees all prior visits in reverse-chronological order, loading within 1 s. Clicking an entry opens the full prescription read-only.

**Independent Test**: Create 3 prescriptions on the same patient on different dates → open patient → verify 3 entries appear newest-first with correct date, symptoms snippet, status badge.

### Implementation for US-6

- [x] T046 [P] [US6] Create `src/features/prescriptions/HistoryList.tsx`: reverse-chronological list of up to 50 visits; each entry shows IST date (dd-MMM-yyyy), symptoms (first 80 chars), vitals snapshot (BP + temp), # medicines, status badge (Pending/Dispensed/Cancelled); click navigates to read-only detail
- [x] T047 [US6] Create `src/features/prescriptions/PrescriptionDetail.tsx`: read-only view of full prescription (all vitals, symptoms, medicine table, tests, notes, doctor name, timestamp in IST); "Edit" button visible only to doctor role

**Checkpoint**: US-6 independently testable — history list loads and detail view opens correctly.

---

## Phase 6: US-7 — Edit a Prescription (Priority: P7)

**Goal**: Doctor can freely edit a PENDING prescription. Editing a DISPENSED prescription requires a written reason (≥ 10 chars); the change is flagged in the pharmacy queue and the admin dashboard.

**Independent Test**: Edit a PENDING prescription → no reason required, saves cleanly. Edit a DISPENSED prescription → reason dialog appears, short reason blocked, valid reason saves, admin dashboard shows alert.

### Implementation for US-7

- [x] T048 [US7] Create `src/features/prescriptions/EditPrescriptionModal.tsx`: if prescription status is PENDING → opens pre-filled consultation form for free editing; UPDATE via Supabase JS client (audit row written automatically by `audit_prescriptions_update` DB trigger in same transaction — Constitution V); multi-row item change: DELETE existing `prescription_items` then INSERT new rows as a batch; if DISPENSED → shows read-only fields + reason textarea (min 10 chars, enforced by Zod) → on submit calls `edit_dispensed_prescription` edge function
- [x] T049 [P] [US7] Add admin notification listener in `src/app/providers/AdminNotifications.tsx`: Supabase Realtime subscription for `edit_after_dispense` events; renders toast for admin role users; increments alert counter on Reports page

**Checkpoint**: US-7 independently testable — PENDING edit and DISPENSED edit (with reason) both work and audit row is created.

---

## Phase 7: US-4 — Pharmacy Queue (Priority: P4)

**Goal**: Pharmacist sees all PENDING prescriptions in a live-updating queue, oldest-first. Queue counter badge is always visible. No manual refresh needed.

**Independent Test**: Create a prescription as doctor in one tab → switch to pharmacist MedicalStore in another tab → prescription card appears within 2 s. Counter badge updates.

### Implementation for US-4

- [x] T050 [US4] Create `src/pages/MedicalStore.tsx`: PENDING prescriptions list, sorted oldest-first by default with sort-toggle (newest-first); Realtime subscription already wired in T045; counter badge in sidebar via shared atom/context
- [x] T051 [P] [US4] Create `src/features/dispense/QueueCard.tsx`: card showing patient name, IST date/time, doctor name, # medicines, symptoms excerpt (80 chars); click navigates to `/dispense/:rxId`
- [x] T052 [P] [US4] Create `src/features/dispense/RecentDispensedList.tsx`: last 20 DISPENSED prescriptions shown below the queue

**Checkpoint**: US-4 independently testable — queue updates in real time without page refresh.

---

## Phase 8: US-3 — Dispense Medicines and Generate Bill (Priority: P3)

**Goal**: Pharmacist opens a prescription, records dispensed quantities per medicine row (with short-stock warning), completes dispensing atomically, and prints an A5 bill in INR.

**Independent Test**: Open a seeded PENDING prescription → dispense all rows at required quantity → verify prescription status = DISPENSED, inventory stock decremented, A5 bill renders with correct ₹ total.

### Implementation for US-3

- [x] T053 [P] [US3] Create `src/features/dispense/queries.ts`: `useDispense()` mutation calling `dispense_prescription` edge function; `usePrescriptionForDispense(id)` query fetching prescription items with current inventory stock
- [x] T054 [US3] Create `src/pages/DispensePrescription.tsx`: per-row display: medicine name, prescribed qty, current stock (from inventory), dispensed-now number input (default = prescribed qty); low-stock warning when stock < required; short/substituted decision controls; expired items greyed-out and unselectable
- [x] T055 [US3] Add live bill total to `DispensePrescription.tsx`: running sum of `qty_dispensed × unit_price_paise` per row, converted to ₹ via `money.ts`; grand total updates on every input change
- [x] T056 [US3] "Complete dispensing" action in `DispensePrescription.tsx`: validates all rows have a decision → calls `useDispense()` → success toast → navigates back to `/store`
- [x] T057 [US3] Create `src/features/dispense/PrintBill.tsx`: react-to-print target component; A5 print layout with clinic name, patient name (no mobile in print), rx date in IST format, medicine line items with qty and ₹ amounts, grand total, doctor name, pharmacist name; triggered after successful dispense

**Checkpoint**: US-3 independently testable — complete dispense cycle (select → confirm → print) works, inventory is atomically decremented, and bill renders.

---

## Phase 9: US-8 — Add and Edit Inventory (Priority: P8)

**Goal**: Pharmacist/admin can add new medicines, update stock levels, and update prices. Every stock decrease requires a written reason. System never allows negative stock.

**Independent Test**: Add a new medicine "Amoxicillin 250mg" → appears in prescription autocomplete. Decrease stock by 5 with reason → audit row visible in DB. Attempt negative stock → blocked.

### Implementation for US-8

- [x] T058 [P] [US8] Create `src/features/inventory/queries.ts`: `useInventoryItems()` list query, `useCreateInventoryItem()` mutation, `useAdjustInventory()` mutation (calls `adjust_inventory` edge fn)
- [x] T059 [US8] Create `src/pages/Inventory.tsx`: searchable table of all inventory items (excluding soft-deleted), stock status badge per row (In Stock / Low / Out / Expired / Expiring Soon), sortable by name
- [x] T060 [US8] Create `src/features/inventory/AddMedicineModal.tsx`: React Hook Form + `InventoryItemSchema`; on submit: check for existing item with same name → if match found, show merge prompt with side-by-side diff → confirm merges (updates existing), cancel dismisses; new item inserted if no match
- [x] T061 [US8] Create `src/features/inventory/EditMedicineModal.tsx`: pre-filled form for stock, price, expiry, batch; any stock decrease requires reason (≥ 1 char, enforced by Zod); submit calls `adjust_inventory` edge fn; negative result rejected by edge fn with error toast

**Checkpoint**: US-8 independently testable — add, merge, and adjust inventory all work with audit rows created.

---

## Phase 10: US-9 — Stock Alerts and Expiry Warnings (Priority: P9)

**Goal**: Admin sees low-stock and expiring medicines prominently. Expired medicines cannot be dispensed.

**Independent Test**: Set a medicine's min_threshold above its stock → low-stock badge appears on inventory page and dashboard. Set expiry to yesterday → item is greyed-out in dispense screen.

### Implementation for US-9

- [x] T062 [P] [US9] Create `src/features/inventory/LowStockWidget.tsx`: list of items where `stock_qty <= min_threshold`; shown at top of Inventory page and as KPI count on Reports page
- [x] T063 [P] [US9] Create `src/features/inventory/ExpiryWidget.tsx`: items where `expiry_date <= today + 90 days` shown with days-remaining badge; items where `expiry_date < today` shown in separate "Expired" section
- [x] T064 [US9] Update `MedicinesForm.tsx` (T040) to exclude expired items from inventory autocomplete (server-side filter: `expiry_date >= today OR expiry_date IS NULL`)
- [x] T065 [P] [US9] Update `DispensePrescription.tsx` (T054) to grey-out and disable expired medicine rows, preventing selection
- [x] T066 [P] [US9] Add Supabase Realtime subscription to `inventory_items` in inventory page and dashboard KPI tile so low-stock count updates live when stock changes

**Checkpoint**: US-9 independently testable — low-stock and expiry alerts render correctly and expired items are blocked in dispense.

---

## Phase 11: US-5 — Sign In with Role (Priority: P5)

**Goal**: Doctor, Pharmacist, and Admin log in with role-appropriate access. Doctors cannot see cost prices or financial data. Session expires after 12 h inactivity.

**Independent Test**: Log in as Doctor → `/reports` and `/inventory` (cost columns) are inaccessible. Log in as Pharmacist → prescription edit controls are disabled. Log in as Admin → all screens accessible.

### Implementation for US-5

- [x] T067 [US5] Create `src/pages/Login.tsx`: email + password form with Supabase Auth sign-in; "Forgot password" magic link flow; on success redirect by role (doctor → `/patients`, pharmacist → `/store`, admin → `/reports`); session inactivity timeout configurable via Supabase Auth settings (default 12 h)
- [x] T067b [US5] Configure Supabase Auth MFA (TOTP) for Doctor and Pharmacist roles (constitution Security — MFA MUST be enforced): enable TOTP in Supabase Auth settings; on first post-login render check `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` — if Doctor/Pharmacist role and AAL < aal2, redirect to `/mfa-enroll`; create `src/pages/MfaEnroll.tsx` (QR code via `supabase.auth.mfa.enroll()`) and `src/pages/MfaChallenge.tsx` (TOTP verify via `supabase.auth.mfa.challengeAndVerify()`); Admin role: MFA optional in v1 (single-person clinic owner may self-exempt)
- [x] T068 [P] [US5] Update `ProtectedRoute` (T030) with role-specific guard: doctor cannot access `/reports` or `/inventory` cost columns; pharmacist cannot access prescription edit controls (field-level disable via role context); Admin cannot access "Start consultation" — hide the action in UI and enforce via RLS CHECK in T013 that `prescriptions.doctor_id` must map to a Doctor-role user (FR-031)
- [x] T069 [P] [US5] Verify `inventory_for_doctor` view (T014) is used for all doctor-facing inventory queries (autocomplete); confirm `unit_price_paise` is absent from doctor query responses via Vitest snapshot

**Checkpoint**: US-5 independently testable — role-based access enforced at route, component, and DB query levels. MFA enrollment flow works for Doctor/Pharmacist accounts.

---

## Phase 12: US-10 — Admin Dashboard (Priority: P10)

**Goal**: Admin sees KPI tiles and charts for patient volume, prescription throughput, revenue, and inventory health. Date-range filter adjusts all widgets. Charts load within 2 s for 200 rx/day.

**Independent Test**: With seeded data across multiple dates, open Reports → verify KPI tile counts match manual count from seed. Switch date filter to "This week" → tiles update.

### Implementation for US-10

- [x] T070 [P] [US10] Create `src/features/reports/queries.ts`: TanStack Query hooks for KPI data (`useKpiStats(range)`), prescriptions-per-day (`usePrescriptionsChart(range)`), status distribution (`useStatusPie(range)`), top medicines (`useTopMedicines(range)`)
- [x] T071 [P] [US10] Create `src/features/reports/KpiTiles.tsx`: four tiles — total patients (all-time), prescriptions today, revenue today (₹ via `money.ts`), low-stock count; data from `useKpiStats`
- [x] T072 [P] [US10] Create `src/features/reports/PrescriptionsBarChart.tsx`: Recharts `BarChart`, prescriptions per day for selected range, IST date labels (dd-MMM)
- [x] T073 [P] [US10] Create `src/features/reports/StatusPieChart.tsx`: Recharts `PieChart`, PENDING/DISPENSED/CANCELLED distribution for today, colour-coded with legend
- [x] T074 [P] [US10] Create `src/features/reports/TopMedicinesChart.tsx`: ranked list of top 5 most-prescribed medicines by dispensed quantity for selected range
- [x] T075 [US10] Create `src/pages/Reports.tsx` (lazy-loaded): date-range filter bar (today/week/month/custom DatePicker), compose KpiTiles + PrescriptionsBarChart + StatusPieChart + TopMedicinesChart; confirm chart render time ≤ 2 s with 200 rx/day seed

**Checkpoint**: US-10 independently testable — all charts render with correct data for each date range.

---

## Phase N: Polish, Hardening & Cross-Cutting Concerns

**Purpose**: Quality gates that must be green before pilot launch.

**⚠️ STOP-THE-LINE**: Nothing ships to production until every task below passes CI.

- [x] T076 Create `tests/e2e/full-visit.spec.ts` (Playwright): login as doctor → register new patient → create prescription (2 medicines) → switch to pharmacist tab → assert queue card appears within 2 s → complete dispense → assert bill total matches sum → assert inventory decremented
- [x] T077 [P] Create `tests/e2e/dispense.spec.ts` (Playwright): create DISPENSED prescription → login as doctor → edit medicines → assert admin notification appears on Reports page → assert `flagged_edit_after_dispense = true` in DB
- [x] T078 [P] Create `tests/e2e/low-stock-alert.spec.ts` (Playwright): set medicine stock to 3, min_threshold to 5 → dispense 2 units → assert low-stock badge appears on inventory page → assert dashboard KPI count increments
- [x] T079 Configure Sentry in `src/app/App.tsx` with PHI scrubbing beforeSend hook (regex strips any field matching Indian mobile pattern and common name field keys from event data); verify scrubber with a deliberate test error in CI
- [x] T080 [P] Run axe-core accessibility audit on PatientSearch, DoctorConsultation, MedicalStore, Inventory, Reports pages via Playwright; assert zero "critical" or "serious" violations
- [x] T081 [P] Add Vite bundle size check to CI: run `vite-bundle-analyzer` or `rollup-plugin-visualizer`, assert initial chunk ≤ 250 KB gzipped; assert Reports route is a separate lazy chunk
- [ ] T082 [P] DB backup restore drill: take `supabase db dump` from staging → restore to a scratch Supabase project → spot-check 10 patient rows and 10 prescription rows match source

---

## Phase Pilot: Launch

- [ ] T083 Create production Supabase project (ap-south-1, Mumbai); run all migrations; run RLS verification test (`select * from prescriptions` as anon → 0 rows)
- [ ] T084 [P] Deploy frontend to Vercel production; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to production values; confirm service-role key is absent from Vercel env vars
- [ ] T085 Run `supabase db seed --project-ref <prod>` with real clinic name and real medicines (remove demo patients); admin signs in and sees empty patients list
- [ ] T086 Conduct on-site walkthrough with doctor + pharmacist using the production system; document paper-cut issues as spec items for next iteration
- [ ] T087 One-week pilot: daily 10-minute check-in, log issues; validate SC-002 (zero un-billed dispenses) and SC-003 (inventory variance ≤ 2%)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **US Phases (3–12)**: All depend on Phase 2 completion; can then run in priority order or in parallel
- **Phase N (Polish)**: Depends on all desired user story phases completing
- **Phase Pilot**: Depends on Phase N passing all gates

### User Story Dependencies

- **US-1 (P1)**: No dependency on other stories — first to implement
- **US-2 (P2)**: Requires US-1 (patient must exist for a prescription)
- **US-6 (P6)**: Requires US-2 (prescriptions must exist to show history)
- **US-7 (P7)**: Requires US-2 and US-3 (must have DISPENSED prescriptions to edit)
- **US-4 (P4)**: Requires US-2 (queue shows PENDING prescriptions)
- **US-3 (P3)**: Requires US-4 (pharmacist enters via queue)
- **US-8 (P8)**: Can begin after Phase 2 — independent of other stories
- **US-9 (P9)**: Requires US-8 (alerts depend on inventory data)
- **US-5 (P5)**: Foundation in Phase 2; role-specific UX in Phase 11 (can run in parallel with other stories)
- **US-10 (P10)**: Requires US-3 (revenue from dispenses), US-8 (inventory counts)

### Parallel Execution Tracks (once Phase 2 complete)

- **Track A**: US-1 → US-2 → US-6 → US-7 (doctor workflow)
- **Track B**: US-4 → US-3 (pharmacy workflow; starts after US-2 delivers PENDING prescriptions)
- **Track C**: US-8 → US-9 (inventory track; independent)
- **Track D**: US-5 role-specific UX (auth foundation already done in Phase 2)
- **Track E**: US-10 dashboard (starts after US-3 and US-8 deliver data)

### Within Each User Story

1. Write contract test (if edge function involved) — MUST FAIL first
2. Create queries/hooks
3. Create components (leaf components before parent pages)
4. Wire into page
5. Verify independent test criteria before moving to next story

---

## Parallel Execution Examples

### US-1 (Patient Registration)
```
# All of these can start in parallel within Phase 3:
T034  src/features/patients/queries.ts
T037  src/features/patients/PatientHeader.tsx
# Then sequentially:
T035  src/pages/PatientSearch.tsx  (needs T034)
T036  src/pages/PatientRegister.tsx  (needs T034)
```

### US-2 (Prescription)
```
# Parallel start:
T038  src/features/prescriptions/queries.ts
T041  src/features/prescriptions/TestsForm.tsx
T042  src/features/prescriptions/DoctorNotesField.tsx
# Sequential:
T039  VitalsForm.tsx  →  T040  MedicinesForm.tsx  →  T043  DoctorConsultation.tsx
```

### US-3 (Dispense)
```
# Parallel:
T053  src/features/dispense/queries.ts
# Sequential:
T054  DispensePrescription.tsx  →  T055  live total  →  T056  complete action  →  T057  PrintBill.tsx
```

---

## Implementation Strategy

### MVP Scope (US-1 + US-2 + US-4 + US-3 + US-5 only)

1. Complete Phase 1 + Phase 2
2. US-1 (patient search + register)
3. US-2 (record prescription → pushes to queue)
4. US-4 (pharmacy queue, live)
5. US-3 (dispense + bill)
6. US-5 (login + basic role guards)
7. **STOP and pilot** — this completes one full visit cycle

### Incremental Delivery After MVP

- Add US-6 (history) → doctor sees past visits
- Add US-7 (edit) → audit-safe corrections
- Add US-8 + US-9 (inventory alerts) → stock safety
- Add US-10 (dashboard) → business intelligence

### Reviewer checklist before `/speckit-implement`

- [x] Constitution v2.0.0 committed and acknowledged by agent
- [x] All Phase 2 contract tests pass against Supabase local Docker
- [x] `tsc --noEmit` passes with zero errors
- [x] `pnpm lint` passes with no `any` violations
- [x] RLS anon test returns 0 rows
- [x] Implementing one phase at a time — do not run Phase 5–12 in a single sitting

---

## Notes

- `[P]` = different files, no dependency conflicts — safe to parallelise
- `[USn]` = maps task to a specific user story for traceability
- Contract tests (T025–T027) MUST FAIL before edge function implementation begins (TDD)
- Commit after each checkpoint to enable clean rollback
- Never use `any` in TypeScript — CI will block the PR
- Money stays as paise until the ₹ symbol appears on screen