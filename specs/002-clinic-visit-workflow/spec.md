# Feature Specification: MediCare Clinic Management System (v1)

**Feature Branch**: `002-clinic-visit-workflow`

**Created**: 2026-05-18

**Status**: Draft

**Owner**: himanshu

## Background

A small-to-medium clinic / dispensary in India today runs on paper or on disconnected tools:
a doctor writes a prescription, the patient walks it to the in-clinic pharmacy, the
pharmacist re-keys it onto a bill, and stock is reconciled at the end of the day (or not).
This causes (a) lost patient history between visits, (b) dispensing errors when handwriting
is unclear, (c) stock-outs because nobody sees consumption in real time, and (d) revenue
leakage because billing is informal.

The system must turn one full patient visit — search → consult → prescribe → dispense →
bill — into a single digital workflow, with prescription history that follows the patient
across visits and inventory that updates the moment a medicine is dispensed.

## User Roles

| Role | Who they are | Primary need |
|---|---|---|
| **Doctor** | Clinician seeing patients in the consultation room | See history fast; record a complete prescription without slowing the patient flow |
| **Pharmacist / Store Keeper** | Person at the in-clinic medicine counter | See the queue of prescriptions, dispense correctly, bill correctly, keep stock accurate |
| **Clinic Admin / Owner** | Person responsible for inventory and finances | Know what's selling, what's about to run out, what's about to expire, what was earned |

A single person may hold multiple roles in a very small clinic; the system must allow that.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Find or Register a Patient (Priority: P1)

A doctor starts every visit by locating the patient in the system. If the patient is new,
they register them on the spot and land directly in the consultation screen. The whole
search-or-register action must be fast enough that it doesn't break the doctor's flow.

**Why this priority**: Every other user story depends on a patient record existing. Without
fast, reliable patient lookup and registration, no consultation can begin.

**Independent Test**: Can be fully tested by searching for an existing patient by name and
mobile, verifying results filter correctly, then registering a brand-new patient and
confirming the system navigates to the consultation screen with the new record.

**Acceptance Scenarios**:

1. **Given** a search string of ≥ 2 characters is entered, **When** the user types, **Then** the patient list filters in under 300 ms client-side, matching name (case-insensitive, substring) and mobile (digits-only, substring).
2. **Given** the search returns zero results, **When** the empty state is displayed, **Then** a "Register new patient" action is visible and accessible.
3. **Given** the user fills in the new-patient form (full name, 10-digit Indian mobile, gender M/F/Other, age 1–120 or date of birth, address), **When** the form is saved, **Then** a patient record is created and the user is taken directly to the consultation screen for that patient.
4. **Given** a registration with a name + mobile combination that already exists, **When** the user attempts to save, **Then** the system blocks the save and shows a duplicate error. Two patients may share a name — only the name + mobile combination is blocked.

---

### User Story 2 — Record a New Prescription (Priority: P2)

On the consultation screen, the doctor captures vitals, symptoms, medicines, recommended
tests, and free-text notes in a single form. Saving the form sends the prescription to the
pharmacy queue instantly.

**Why this priority**: Recording the prescription is the core clinical act. It is the event
that triggers the pharmacy workflow, drives the bill, and creates the audit trail. Without
it, the rest of the system has nothing to process.

**Independent Test**: Can be fully tested by opening a patient record, filling in a
prescription with at least one medicine row, saving, and confirming the prescription appears
in the pharmacy queue with status Pending within 2 seconds.

**Acceptance Scenarios**:

1. **Given** the consultation form is open, **When** the doctor fills in vitals (any subset of systolic BP, diastolic BP, pulse bpm, temperature °F, weight kg, height cm), symptoms (required, max 2000 chars), at least one medicine row, optional test rows, and optional doctor comments (max 1000 chars), **Then** the form accepts the input without error.
2. **Given** symptoms are blank or no medicine row is present, **When** the doctor attempts to save, **Then** the system highlights the missing required fields and prevents submission.
3. **Given** the form is saved successfully, **When** the prescription is committed, **Then** it receives a unique ID, is timestamped (UTC, displayed in Asia/Kolkata), is attributed to the logged-in doctor, its status is set to Pending, and it appears in the pharmacy queue within 2 seconds via real-time push.
4. **Given** the medicine name field in a prescription row, **When** the doctor types, **Then** an autocomplete list drawn from the active inventory is shown.

---

### User Story 3 — Dispense Medicines and Generate Bill (Priority: P3)

The pharmacist opens a prescription from the queue, confirms each medicine quantity
(adjusting for short stock), and completes dispensing. The system atomically decrements
inventory and produces a printable A5 bill in INR.

**Why this priority**: Dispensing closes the visit loop. It converts the prescription into
a bill, reduces stock, and marks the prescription Dispensed — the only event that generates
revenue and updates inventory truth.

**Independent Test**: Can be fully tested by opening a Pending prescription, entering
dispensed quantities for each medicine row, completing dispensing, and verifying the
prescription status changes to Dispensed, inventory decrements correctly, and a bill is
generated with the correct INR totals.

**Acceptance Scenarios**:

1. **Given** a Pending prescription is opened, **When** the dispensing screen loads, **Then** each medicine row shows: medicine name, prescribed quantity, current stock from inventory, and a dispensed-now input defaulting to the prescribed quantity.
2. **Given** current stock is less than the prescribed quantity, **When** the row renders, **Then** a warning shows the available stock; the pharmacist may enter up to the available quantity and mark the remainder "short".
3. **Given** all medicine rows have a decision (dispensed, short, or substituted), **When** "Complete dispensing" is clicked, **Then** the prescription status changes to Dispensed, inventory stock is decremented by the dispensed quantities in a single atomic operation (no partial updates), and a printable A5 bill is generated showing line totals (dispensed qty × unit price in ₹) and grand total in INR.
4. **Given** an inventory item is expired, **When** the dispensing screen loads, **Then** that item cannot be selected or dispensed.
5. **Given** "Complete dispensing" is clicked but a network or database failure occurs mid-write, **When** the transaction rolls back, **Then** inventory is unchanged and prescription status remains Pending.

---

### User Story 4 — Work the Pharmacy Queue (Priority: P4)

The pharmacist sees all Pending prescriptions in a live-updating queue, ordered oldest-first
by default. A persistent counter in the navigation shows how many prescriptions are waiting.

**Why this priority**: Without the queue, the pharmacist has no visibility into what needs
to be done. The queue is the handoff point between the doctor's consultation and the
dispensing workflow.

**Independent Test**: Can be fully tested by creating a prescription in one browser tab,
switching to the pharmacist view in another tab, and verifying the prescription card appears
in the queue within 2 seconds without a manual refresh.

**Acceptance Scenarios**:

1. **Given** the pharmacist lands on the queue page, **When** it loads, **Then** all Pending prescriptions are listed in oldest-first order, each card showing patient name, prescription date/time, doctor name, number of medicines, and a brief symptoms excerpt.
2. **Given** a new prescription is saved by the doctor, **When** it is committed, **Then** it appears in the pharmacist queue within 2 seconds via real-time push — no manual refresh required.
3. **Given** the queue has entries, **When** the pharmacist switches the sort order to newest-first, **Then** the list reorders without a page reload.
4. **Given** the user is anywhere in the application, **When** prescriptions are waiting, **Then** a queue counter badge is always visible in the navigation.

---

### User Story 5 — Sign In with a Role (Priority: P5)

Any user authenticates with email and password (plus MFA for clinical staff). The system
grants access to screens and data based on the user's role(s). Sessions expire after 12
hours of inactivity.

**Why this priority**: Role enforcement is a security and compliance requirement. It prevents
doctors from accessing financial data, pharmacists from editing prescriptions, and
unauthenticated access to any PHI.

**Independent Test**: Can be fully tested by logging in as each role (Doctor, Pharmacist,
Admin) and verifying that the correct screens are accessible and restricted screens are
blocked, including at the data layer (not just UI).

**Acceptance Scenarios**:

1. **Given** a user enters valid credentials, **When** they log in, **Then** they are authenticated and land on the role-appropriate home screen.
2. **Given** a Doctor is logged in, **When** they navigate, **Then** inventory cost prices and the financial dashboard are not accessible — not merely hidden, but unauthorised at the data layer.
3. **Given** a Pharmacist is logged in, **When** they open a prescription, **Then** they can mark medicines dispensed/short/substituted but cannot edit the prescription fields (symptoms, vitals, medicine rows).
4. **Given** an Admin is logged in, **When** they navigate, **Then** they can access all screens except the "prescribing doctor" attribution — Admins cannot sign a prescription as the doctor.
5. **Given** a session has been inactive for 12 hours, **When** the user next interacts, **Then** they are redirected to the login screen and must re-authenticate.
6. **Given** a user clicks "Forgot password", **When** they submit their email, **Then** a magic link or OTP is sent for password reset.

---

### User Story 6 — See the Patient's Medical History (Priority: P6)

When a doctor opens a patient record, they immediately see all previous visits in
reverse-chronological order. Each entry is a summary; clicking opens the full prescription
read-only, with an option to edit.

**Why this priority**: History continuity is the primary reason to adopt a digital system
over paper. Doctors must be able to see prior prescriptions in under 1 second on clinic
broadband.

**Independent Test**: Can be fully tested by creating two prescriptions on the same patient
on different dates, opening the patient record, and verifying both entries appear newest-first
with the correct summary data and are clickable to the full read-only view.

**Acceptance Scenarios**:

1. **Given** a patient record is opened, **When** the history panel loads, **Then** all previous visits appear in reverse-chronological order within 1 second on typical clinic broadband.
2. **Given** the history list renders, **When** each entry displays, **Then** it shows: visit date, primary symptoms (first 80 chars), latest vitals (BP and temperature), number of medicines prescribed, and prescription status (Pending / Dispensed / Cancelled).
3. **Given** a history entry is clicked, **When** the full prescription view opens, **Then** it is read-only by default with an "Edit" control visible to authorised users (Doctors).

---

### User Story 7 — Edit a Prescription (Priority: P7)

A doctor can correct any field on a Pending prescription without restriction. Correcting a
Dispensed prescription requires a written reason and triggers an alert to the pharmacist and
admin dashboard. Every edit is logged immutably.

**Why this priority**: Clinical accuracy requires that mistakes can be fixed. But corrections
to dispensed prescriptions carry regulatory and patient-safety implications — they must be
audited and flagged, not silently overwritten.

**Independent Test**: Can be fully tested by editing a Pending prescription (verifying
no-friction editing), then editing a Dispensed prescription with a reason, and confirming
the audit log row exists and the pharmacist queue shows a flag on the modified prescription.

**Acceptance Scenarios**:

1. **Given** a prescription with status Pending, **When** the doctor clicks Edit and changes any field, **Then** the changes save without additional prompts.
2. **Given** a prescription with status Dispensed, **When** the doctor clicks Edit, **Then** a mandatory reason field (free text, minimum 10 characters) must be filled before saving.
3. **Given** any prescription edit is saved, **When** the transaction commits, **Then** an immutable audit-log row is created capturing: actor (user ID + role), timestamp (UTC), fields changed, before values, after values, and reason (if Dispensed).
4. **Given** a Dispensed prescription is edited and medicine names or quantities change, **When** the save commits, **Then** the prescription card in the pharmacy queue is flagged as "Modified after dispensing" and an alert appears in the admin dashboard.

---

### User Story 8 — Add and Edit Inventory (Priority: P8)

Pharmacists and admins maintain the medicine catalogue: adding new items, adjusting stock
levels, updating prices, and recording batch and expiry information. Every stock decrease
is audited with a mandatory reason.

**Why this priority**: Inventory accuracy is what makes autocomplete, stock warnings, and
dispensing decisions reliable. Without truthful stock data the clinical workflow degrades.

**Independent Test**: Can be fully tested by adding a new medicine, then manually adjusting
its stock down (with a reason), and verifying the new stock level is reflected in the
dispensing screen and that an audit row was created for the adjustment.

**Acceptance Scenarios**:

1. **Given** a new medicine is being added, **When** the user enters: name, unit (tablet/strip/ml/bottle/other), current stock, minimum-stock threshold, unit price (₹), expiry date, and optional batch number, **Then** the medicine is saved and immediately available in prescription autocomplete.
2. **Given** a medicine name is entered that matches an existing inventory item, **When** the user attempts to save, **Then** the system prompts "merge into existing?" with a side-by-side diff of the two records.
3. **Given** a user edits the stock quantity downward, **When** the save is attempted, **Then** a mandatory reason field (free text) must be completed; on save an audit-log row records: actor, timestamp, item ID, previous stock, new stock, reason.
4. **Given** any inventory edit would result in a negative stock value, **When** the save is attempted, **Then** the system blocks the save with an error.

---

### User Story 9 — Stock Alerts and Expiry Warnings (Priority: P9)

The admin sees at a glance which medicines are running low and which are expiring soon.
Expired medicines are blocked from dispensing. The dashboard surfaces aggregate counts;
the inventory page shows the detail rows.

**Why this priority**: Stock-outs and expired dispensing are the two most operationally
damaging errors for a small clinic. Proactive alerting prevents patient harm and write-offs.

**Independent Test**: Can be fully tested by setting a medicine's minimum threshold above
its current stock, verifying the low-stock badge appears on the inventory page and the
dashboard, then setting an expiry date to yesterday and confirming the item cannot be
selected in the dispensing screen.

**Acceptance Scenarios**:

1. **Given** a medicine's current stock ≤ its minimum-stock threshold, **When** the inventory page and dashboard load, **Then** that medicine appears in the "Low stock" list.
2. **Given** a medicine's expiry date is within 90 days, **When** the inventory page loads, **Then** the row is highlighted and shows days remaining until expiry.
3. **Given** a medicine's expiry date is in the past, **When** the dispensing screen loads for a prescription containing that medicine, **Then** the item is greyed out and cannot be selected for dispensing.
4. **Given** the admin views the dashboard, **When** it loads, **Then** aggregate counts for low-stock items and expiring-soon items are displayed as KPI tiles.

---

### User Story 10 — Admin Dashboard (Priority: P10)

The admin sees a single screen with key operational metrics: patient volume, prescription
throughput, revenue, and inventory health. Charts cover the last 30 days; a date-range
filter adjusts the view. The admin typically checks this daily from a phone.

**Why this priority**: The dashboard gives the clinic owner decision-making visibility
without manual data gathering. It is a read-only summary layer — no clinical workflow is
blocked if it is slow or unavailable.

**Independent Test**: Can be fully tested by creating several prescriptions and dispense
records, then opening the dashboard and verifying all KPI tiles and charts reflect the
correct counts and totals for the selected date range.

**Acceptance Scenarios**:

1. **Given** the admin opens the dashboard, **When** it loads, **Then** it shows four KPI tiles: total patients (all-time), prescriptions today, revenue today (₹), and low-stock count.
2. **Given** the dashboard is open, **When** it renders, **Then** it shows: (a) a bar chart of prescriptions per day for the last 30 days, (b) a pie chart of prescription status distribution for today, (c) a list of the top 5 most-prescribed medicines in the last 30 days.
3. **Given** the user selects a date-range filter (today / this week / this month / custom), **When** the filter changes, **Then** all charts and revenue KPI update to reflect the selected range.
4. **Given** the clinic has up to 200 prescriptions per day, **When** the dashboard loads for any date range, **Then** all charts render within 2 seconds.

---

### Edge Cases

- What happens when a network drop occurs mid-consultation — form data must be preserved for reconnect (graceful degradation; full offline writes are v2).
- What happens when two pharmacists attempt to complete dispensing on the same prescription simultaneously — one must win; the other must see an "already dispensed" error.
- What happens when an inventory item's stock reaches exactly zero after dispensing — the item must show as out-of-stock in autocomplete, not negative.
- What happens when a user holds multiple roles — all permitted screens and actions from all held roles must be available in the same session.
- What happens when a patient with the same name and mobile is registered by two different staff members simultaneously — the system must block one and surface the duplicate error.
- What happens when the session expires mid-form — the form data must not be silently lost; user must be able to recover after re-authentication.

## Requirements *(mandatory)*

### Functional Requirements

**Patient Management**
- **FR-001**: System MUST allow staff to search for existing patients by name (case-insensitive substring) or mobile (digit substring) with results appearing within 300 ms.
- **FR-002**: System MUST allow staff to register a new patient with full name, 10-digit Indian mobile, gender (M/F/Other), age (1–120) or date of birth, and address.
- **FR-003**: System MUST block registration of a patient with a name + mobile combination that already exists, and MUST warn (but not block) when only the name matches an existing record.
- **FR-004**: System MUST navigate the user to the consultation screen immediately after a new patient is saved.

**Prescriptions**
- **FR-005**: System MUST allow a Doctor to record vitals (any subset of: systolic BP, diastolic BP, pulse bpm, temperature °F, weight kg, height cm), symptoms (required, max 2000 chars), one or more medicine rows, optional recommended tests, and optional doctor comments (max 1000 chars) in a single form.
- **FR-006**: Each medicine row MUST include: medicine name (autocomplete from active inventory), dosage strength, frequency (preset choices + custom), duration in days, and quantity.
- **FR-007**: System MUST assign a unique prescription ID, timestamp (UTC stored, IST displayed), and doctor attribution on save.
- **FR-008**: System MUST set a new prescription's status to Pending and push it to the pharmacy queue within 2 seconds of save via real-time mechanism.
- **FR-009**: System MUST allow a Doctor to edit a Pending prescription without restriction.
- **FR-010**: System MUST require a written reason (free text, minimum 10 characters) before allowing a Doctor to edit a Dispensed prescription.
- **FR-011**: System MUST flag an edited Dispensed prescription on the pharmacy queue and raise an alert in the admin dashboard when medicine names or quantities change.

**Dispensing & Billing**
- **FR-012**: System MUST show the pharmacist, for each medicine row in a prescription: prescribed quantity, current inventory stock, and a dispensed-now input defaulting to the prescribed quantity.
- **FR-013**: System MUST warn when current stock is less than the prescribed quantity, and MUST allow the pharmacist to dispense up to available stock and mark the remainder "short".
- **FR-014**: System MUST prevent dispensing of an expired inventory item.
- **FR-015**: System MUST compute line totals (dispensed qty × unit price in ₹) and grand total live as the pharmacist enters quantities.
- **FR-016**: System MUST require every medicine row to have a decision (dispensed, short, or substituted) before "Complete dispensing" is permitted.
- **FR-017**: On completion, system MUST atomically set prescription status to Dispensed and decrement inventory stock by dispensed quantities — partial updates on failure are not permitted.
- **FR-018**: System MUST generate a printable A5 bill on dispense completion showing patient name, prescription date, each medicine line, and grand total in INR (₹).

**Inventory**
- **FR-019**: System MUST maintain an inventory record per medicine with: name, unit, current stock, minimum-stock threshold, unit price (₹), expiry date, and optional batch number.
- **FR-020**: System MUST prompt a "merge into existing?" confirmation when a new medicine name matches an existing record, showing a diff.
- **FR-021**: System MUST prevent stock from going below zero.
- **FR-022**: System MUST require a written reason for any manual stock decrease, and MUST write an audit-log row for every stock adjustment.
- **FR-023**: System MUST flag medicines as low-stock when current stock ≤ minimum threshold.
- **FR-024**: System MUST flag medicines as expiring-soon when expiry date is within 90 days, and as expired when expiry date is past today.

**Audit & History**
- **FR-025**: System MUST write an immutable audit-log row for every prescription create, prescription edit, and inventory stock adjustment, capturing: actor (user ID + role), action type, target entity ID, before values, after values, timestamp (UTC), and reason where applicable.
- **FR-026**: Audit log MUST be append-only; no update or delete of audit rows is permitted.
- **FR-027**: System MUST display a patient's full visit history in reverse-chronological order on the patient detail screen, loading within 1 second on typical clinic broadband.

**Authentication & Roles**
- **FR-028**: System MUST support three roles: Doctor, Pharmacist, Admin. A user MAY hold multiple roles simultaneously.
- **FR-029**: Doctors MUST NOT have access to inventory cost prices or the financial dashboard.
- **FR-030**: Pharmacists MUST NOT be able to edit prescription fields; they can only record dispensing decisions.
- **FR-031**: Admins MUST NOT be able to create a prescription attributed to themselves as the prescribing doctor.
- **FR-032**: Sessions MUST expire after 12 hours of inactivity.
- **FR-033**: System MUST provide a forgot-password flow via email magic link or OTP.

**Dashboard**
- **FR-034**: Admin dashboard MUST display: total patients (all-time), prescriptions today, revenue today (₹), and low-stock count as KPI tiles.
- **FR-035**: Dashboard MUST show: prescriptions-per-day bar chart (last 30 days), status-distribution pie chart (today), and top-5 most-prescribed medicines (last 30 days).
- **FR-036**: Dashboard MUST support date-range filters: today, this week, this month, custom.
- **FR-037**: All dashboard charts MUST load within 2 seconds for clinics with up to 200 prescriptions per day.

### Key Entities *(include if feature involves data)*

- **Patient**: Individual receiving care. Attributes: unique patient ID, full name, 10-digit mobile, gender, age or date of birth, address, registration date. PHI — treat as sensitive.
- **Prescription / Visit**: Clinical record per consultation. Attributes: unique ID, patient ID, doctor ID, status (Pending / Dispensed / Cancelled), vitals snapshot, symptoms text, doctor comments, recommended tests, created-at (UTC), updated-at (UTC).
- **Prescription Medicine Row**: One medicine per row on a prescription. Attributes: prescription ID, inventory item ID, medicine name snapshot, dosage strength, frequency, duration (days), prescribed quantity.
- **Inventory Item**: Medicine in stock at the clinic pharmacy. Attributes: unique ID, name, unit, current stock (integer), minimum-stock threshold, unit price (paise integer), expiry date, batch number (optional), soft-deleted flag.
- **Dispense Record**: Links prescription to pharmacist action. Attributes: prescription ID, inventory item ID, pharmacist ID, prescribed quantity, dispensed quantity, unit price at dispense (paise), line total (paise), decision (dispensed / short / substituted), completed-at (UTC).
- **User**: Clinic staff member. Attributes: unique ID, full name, email, hashed credentials, role(s) (Doctor / Pharmacist / Admin), active flag.
- **Audit Log Entry**: Immutable change record. Attributes: ID, actor user ID, actor role, action type, target entity type, target entity ID, before (JSON), after (JSON), reason (text, nullable), created-at (UTC).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full doctor-to-pharmacy visit completes in ≤ 5 minutes of clerical work for a returning patient and ≤ 7 minutes for a new patient.
- **SC-002**: Zero un-billed dispenses occur during a one-week pilot (every dispensing action produces a bill).
- **SC-003**: Inventory variance between the system and a physical count is ≤ 2% after a one-month pilot.
- **SC-004**: Zero PHI (patient name, mobile, symptoms, vitals, medicines) appears in application logs or error pages on a security review.
- **SC-005**: Patient search results appear within 300 ms for a patient list of up to 10,000 records.
- **SC-006**: The pharmacy queue updates within 2 seconds of a prescription being saved.
- **SC-007**: The patient history screen (including all prior visits) loads within 1 second on typical clinic broadband.
- **SC-008**: All dashboard charts load within 2 seconds for a clinic with up to 200 prescriptions per day.
- **SC-009**: 100% of prescription creates/edits and inventory adjustments have a corresponding audit-log row.
- **SC-010**: Dispensing atomicity: in 100% of tested failure scenarios, inventory is either fully decremented or fully unchanged — never partially decremented.

## Assumptions

- The system is for a single clinic location in India; multi-clinic is explicitly out of scope for v1.
- All monetary values are in INR (₹); no multi-currency logic is required.
- All timestamps are stored as UTC and displayed in Asia/Kolkata (IST, UTC+05:30) in the format dd-MMM-yyyy.
- The system is a browser-based web application; no native mobile app is built. The UI is responsive for use on a 1366×768 clinic PC, a 10" tablet, and a 5.5" Android phone (admin-only on phone).
- Photo ID scanning, barcode scanning, and biometric verification are out of scope for v1.
- Insurance claims, TPA integration, lab integration, and patient-facing portal are out of scope for v1.
- Appointment scheduling and queue tokens are out of scope for v1.
- Offline writes are out of scope for v1; the browser form MUST preserve unsaved input during a network drop so data is not lost on reconnect (graceful degradation only).
- Supplier purchase orders are out of scope; stock is updated manually.
- Patient and prescription data is retained indefinitely. Soft-delete only; hard-delete requires admin action with a mandatory reason and an audit row.
- Daily automated database backups with 30-day retention are a deployment-level concern, not a UI feature.
- Multiple doctors in the same clinic are supported; "logged-in doctor" is the prescribing attribution — not a hard-coded single user.
- India's Digital Personal Data Protection Act (DPDPA) 2023 applies to all patient personal data handling.
