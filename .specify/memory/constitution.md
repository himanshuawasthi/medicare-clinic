<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Status: Major amendment — principles redefined for India-specific clinic management system
with Supabase, TypeScript, and Zod stack.

Modified principles:
  - I. Patient-First (retained, merged with PHI Privacy)
  - II. HIPAA Compliance by Design → II. Supabase RLS Security (redefined — MAJOR)
  - III. Test-First Development (retained, expanded with mandatory contract tests)
  - IV. Security by Default → IV–VIII. Expanded into five specific non-negotiables
  - V. Simplicity & Maintainability (retained)

Added sections:
  - Principle III: Type-Safe Contracts — Zod Everywhere (new)
  - Principle V: Immutable Audit Trail (new)
  - Principle VI: INR Currency Standard (new)
  - Principle VII: UTC Storage / Asia/Kolkata Display (new)

Removed sections:
  - HIPAA-specific compliance language removed (not applicable — Indian clinic)

Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gates updated to reflect v2 principles
  ✅ .specify/templates/spec-template.md — PHI sensitivity note updated; INR + date-format assumption added
  ✅ .specify/templates/tasks-template.md — Contract tests marked mandatory; Zod schema tasks + audit-log tasks added to foundational phase
  ⚠  .specify/templates/constitution-template.md — source template, not modified (correct)

Follow-up TODOs:
  - specs/001-patient-registration/plan.md — Constitution Check section references v1 principles;
    update to v2 gates on next /speckit-plan run for that feature.
-->

# MediCare Clinic Constitution

## Core Principles

### I. Patient-First & PHI Privacy (NON-NEGOTIABLE)

Every design decision MUST prioritize patient safety, data privacy, and care quality above
technical convenience. Patient PHI (name, mobile, address, age, gender, symptoms, vitals,
prescribed medicines) MUST be treated as sensitive at all times.

PHI MUST NEVER appear in:
- Application logs (structured or unstructured)
- Error messages returned to the client or written to log sinks
- URL query parameters or path segments
- Analytics pipelines or third-party monitoring tools

Violations are a hard blocker — code that leaks PHI MUST NOT be merged. Log lines MUST
reference opaque entity IDs only (e.g., patient UUID), never names, contact details, or
clinical data.

### II. Supabase RLS Security (NON-NEGOTIABLE)

All database writes — without exception — MUST go through Supabase Row-Level Security
policies enforced at the database layer. RLS policies are the authoritative access control
boundary; UI-level hiding of controls is supplementary only.

Rules:
- The browser client MUST use the anon key or a user-scoped JWT. Service-role keys MUST
  NEVER be shipped to or accessible in the browser.
- Every table that contains PHI or financial data MUST have RLS enabled with explicit
  policies for each role (Doctor, Pharmacist, Admin).
- RLS policies MUST be reviewed in every pull request that adds or alters a table.
- Any Supabase Edge Function or server-side route that legitimately uses the service-role
  key MUST be deployed server-side only, never bundled into the frontend.

### III. Type-Safe Contracts — Zod Everywhere (NON-NEGOTIABLE)

All data crossing a system boundary — form submissions, API request bodies, API response
shapes, server-action arguments — MUST be validated by a Zod schema.

Rules:
- Zod schemas MUST be defined once and imported by both the client and the server (shared
  schema package or shared path). Duplication is prohibited.
- TypeScript strict mode (`"strict": true`) MUST be enabled in every `tsconfig.json`.
  The `any` type is banned; `unknown` MUST be narrowed before use.
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitReturns` MUST
  be enabled alongside strict mode.
- ESLint rule `@typescript-eslint/no-explicit-any` MUST be set to `error` in CI.
- Schema inference (`z.infer<typeof Schema>`) MUST be used to derive TypeScript types
  rather than writing parallel type declarations.

### IV. Test-First with Mandatory Contract Coverage (NON-NEGOTIABLE)

TDD is mandatory: tests MUST be written and must FAIL before implementation begins.
The Red-Green-Refactor cycle MUST be strictly enforced.

Every new feature MUST have:
- A **contract test** for every API endpoint or server action (verifies request/response
  shape against the shared Zod schema; runs in CI against a real Supabase local instance).
- At least one **integration test** covering the primary user journey end-to-end.
- **Unit tests** for every function containing branching logic, calculation, or state
  transition (e.g., duplicate-patient detection, stock decrement, audit-log writing).

Contract tests are NOT optional — they are the enforcement mechanism for Principle III.
Tests failing CI MUST block merge. Coverage MUST not regress below the established baseline.

### V. Immutable Audit Trail (NON-NEGOTIABLE)

Every prescription create or edit, and every inventory stock adjustment, MUST produce an
immutable audit log row before the transaction is committed.

Rules:
- Audit rows MUST capture: actor (user ID + role), action type, target entity ID, previous
  value (JSON), new value (JSON), timestamp (UTC), and a reason string where the operation
  requires one.
- The audit log table MUST be append-only. No UPDATE or DELETE on audit rows is permitted;
  RLS MUST enforce this.
- Audit writes MUST be part of the same database transaction as the mutating operation.
  A mutation that succeeds without an audit row is a bug — partial writes that omit the
  audit row MUST be rolled back.
- Audit data MUST be queryable by admin users for compliance review; it is NOT accessible
  to Doctors or Pharmacists.

### VI. INR Currency Standard (NON-NEGOTIABLE)

All monetary values in the system are denominated in Indian Rupees (INR, symbol ₹).

Rules:
- Currency values MUST be stored as integers representing paise (1 INR = 100 paise) to
  avoid floating-point rounding errors in billing.
- All display formatting MUST use the ₹ symbol with Indian number formatting
  (e.g., ₹1,23,456.00 for lakhs notation).
- No multi-currency logic, currency conversion, or foreign currency fields may be
  introduced in v1. Any such request requires a constitution amendment.
- GST and tax handling: if added, tax line items MUST be stored separately from base price.

### VII. UTC Storage / Asia/Kolkata Display (NON-NEGOTIABLE)

All timestamps MUST be stored in UTC and converted to IST (Asia/Kolkata, UTC+05:30) only
at the display layer.

Rules:
- Database columns for all timestamps MUST use the UTC timezone. No local timestamps in the
  database.
- All date display in the UI MUST use the format `dd-MMM-yyyy` (e.g., `18-May-2026`).
- All time display MUST be in 12-hour format with AM/PM in Asia/Kolkata.
- The application server and Supabase instance timezone MUST be configured to UTC.
- Date arithmetic and business-day calculations MUST be performed in UTC, then converted
  for display. Doing date math in local time is a bug.

### VIII. Simplicity & Maintainability

Complexity MUST be justified against a patient-care or compliance need. YAGNI principles
apply: features are built for current, defined requirements only. Abstractions MUST earn
their place — three similar lines of code are preferred over a premature helper. Technical
debt MUST be logged and triaged, not silently accumulated. Code MUST be readable by a
developer unfamiliar with the original author's intent.

## Compliance & Security Requirements

All development MUST satisfy the following non-negotiable constraints:

- **Regulatory**: India's Digital Personal Data Protection Act (DPDPA) 2023 applies to all
  features handling patient personal data. Drug dispensing records may be subject to
  Drugs and Cosmetics Act requirements; controlled substances (Schedule H / H1) require
  additional logging where applicable.
- **Data Residency**: Patient data MUST remain on Supabase infrastructure within an approved
  geographic region. Cross-region replication requires explicit approval.
- **Access Control**: Multi-factor authentication MUST be enforced for all staff accounts.
  Session tokens MUST expire after 12 hours of inactivity (configurable per deployment).
- **Secrets Management**: All API keys, service-role keys, and credentials MUST be stored
  in server-side environment variables or a secrets manager. NEVER committed to source
  control. The Supabase service-role key is server-side only (see Principle II).
- **Incident Response**: Any potential PHI exposure MUST be escalated to the clinic owner
  within 1 hour of detection. Automated alerting MUST be in place for anomalous access
  patterns on PHI tables.
- **Third-Party Integrations**: Any third-party service that receives PHI (SMS providers,
  email services) MUST be vetted for data-handling compliance before integration.

## Development Workflow

- **Branching**: All work MUST happen on feature branches following the naming convention
  `###-short-description` (e.g., `001-patient-registration`). Direct commits to `main`
  are prohibited.
- **Code Review**: Every pull request MUST receive at least one peer review. Reviews MUST
  verify constitution compliance — specifically: PHI log check (Principle I), RLS policy
  review (Principle II), Zod schema coverage (Principle III), contract test presence
  (Principle IV), audit row coverage (Principle V), currency/date handling (VI & VII) —
  before approval.
- **Quality Gates (CI/CD)**:
  1. All tests MUST pass (unit + integration + contract).
  2. TypeScript compilation with strict mode MUST succeed with zero errors.
  3. ESLint with `no-explicit-any` as error MUST pass cleanly.
  4. PHI log scan MUST find no patient names, mobiles, or clinical data in log output.
  5. Build MUST be green before merge is allowed.
- **Deployment**: Releases MUST be tagged with semantic versions. Production deployments
  MUST go through a staging environment. Rollback procedures MUST be documented and tested
  before each major release.

## Governance

This constitution supersedes all other project practices and coding guidelines. Any practice
not covered here defaults to the principle of least surprise, patient safety, and data
privacy.

**Amendment Procedure**:
1. Propose the change in a pull request against `.specify/memory/constitution.md`.
2. Provide rationale, affected principles, and a migration plan for existing code.
3. Obtain approval from at least two team members familiar with the clinical domain.
4. Update the version number and `LAST_AMENDED_DATE` per the versioning policy below.
5. Propagate changes to all dependent templates (see Sync Impact Report format above).

**Versioning Policy**:
- MAJOR: Principle removal, redefinition, or governance restructuring that breaks prior
  compliance assumptions.
- MINOR: New principle added, new mandatory section, or materially expanded guidance.
- PATCH: Clarifications, wording improvements, typo fixes, non-semantic refinements.

**Compliance Review**: Constitution compliance MUST be verified in every pull request.
Quarterly reviews MUST audit active features against current DPDPA guidance and Indian
pharmacy regulations, with findings documented in `.specify/memory/`.

**Version**: 2.0.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
