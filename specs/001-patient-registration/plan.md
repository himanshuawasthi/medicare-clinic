# Implementation Plan: Patient Registration

**Branch**: `001-patient-registration` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-patient-registration/spec.md`

## Summary

Build a HIPAA-compliant patient registration module for Medicare Clinic that allows clinic staff to create, search, and maintain patient records with insurance details, guardian contacts, and an immutable change-history audit trail. The module is a full-stack web application (React + FastAPI + PostgreSQL) with role-based access control enforced at the service layer.

## Technical Context

**Language/Version**: Python 3.12 (backend API), TypeScript 5.4 (frontend)

**Primary Dependencies**: FastAPI 0.111, SQLAlchemy 2.0, Alembic (backend); React 18, React Hook Form, TanStack Query (frontend)

**Storage**: PostgreSQL 15 — relational model, encrypted at rest via pgcrypto / transparent database encryption

**Testing**: pytest + httpx (backend integration), pytest-cov (coverage); Jest + React Testing Library (frontend unit/component); Playwright (end-to-end)

**Target Platform**: Linux server (containerised via Docker); browser-based web application

**Project Type**: Full-stack web application — React SPA frontend + FastAPI REST backend

**Performance Goals**: Patient record search returns results in < 3 seconds; new registration form submission completes in < 2 seconds server-side

**Constraints**: HIPAA — AES-256 encryption at rest, TLS 1.3 in transit, MFA for all staff accounts, session timeout 30 min, no PHI in logs or URLs, immutable audit trail required

**Scale/Scope**: Single clinic network; estimated 10,000–50,000 patient records; up to 50 concurrent staff users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the Medicare Clinic Constitution (`.specify/memory/constitution.md`):

- [x] **I. Patient-First**: Registration feature is the entry point for patient care; design prioritises data integrity and patient identity uniqueness. Duplicate detection and draft saves prevent data loss. No PHI exposure risk in the design as specified.
- [x] **II. HIPAA Compliance**: PHI encrypted at rest (AES-256 via PostgreSQL TDE/pgcrypto) and in transit (TLS 1.3). Audit trail defined via Change Log Entry entity and FR-010. No PHI in logs — patient ID (opaque UUID) used in log lines, never name/DOB. BAA required before integrating any third-party service. All session tokens expire after 30 min (per constitution).
- [x] **III. Test-First**: Test plan defined in research.md — integration tests cover all 3 user stories; contract tests cover all REST endpoints; unit tests cover duplicate detection, validation, and state transition logic.
- [x] **IV. Security by Default**: All API endpoints require authentication (JWT Bearer). Role enforcement at service layer: Receptionist (create/edit), Clinician (read/edit clinical notes), Admin (deactivate/merge). Audit entries produced for every patient record mutation (FR-010).
- [x] **V. Simplicity**: No premature abstractions. No event sourcing or CQRS — a straightforward append-only audit log table satisfies the change history requirement. Repository pattern used only for database isolation needed by TDD. Complexity justified against HIPAA and patient-safety needs.

## Project Structure

### Documentation (this feature)

```text
specs/001-patient-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── patients.openapi.yaml
│   └── README.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── patients/
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── service.py         # Business logic, role checks, duplicate detection
│   │   ├── repository.py      # DB queries (interface boundary for TDD)
│   │   ├── router.py          # FastAPI route definitions
│   │   └── audit.py           # Audit log writer
│   ├── auth/
│   │   ├── dependencies.py    # JWT decode, MFA check, role injection
│   │   └── roles.py           # Role enum and permission matrix
│   └── core/
│       ├── config.py          # Settings (env-var backed)
│       ├── database.py        # SQLAlchemy engine / session factory
│       └── logging.py         # Structured logger — PHI-scrubbing filter
├── tests/
│   ├── contract/              # HTTP-level contract tests against OpenAPI spec
│   ├── integration/           # Full request-response tests (real DB)
│   └── unit/                  # Pure logic tests (no DB, no HTTP)
├── alembic/                   # Database migrations
└── pyproject.toml

frontend/
├── src/
│   ├── features/
│   │   └── patients/
│   │       ├── components/    # RegistrationForm, InsuranceSection, GuardianSection
│   │       ├── pages/         # RegisterPage, SearchPage, PatientDetailPage
│   │       ├── hooks/         # usePatientSearch, useCreatePatient, useUpdatePatient
│   │       └── api.ts         # Typed API client (generated from OpenAPI spec)
│   ├── auth/                  # MFA flow, session management, role context
│   └── shared/                # Common UI components, error boundaries
├── tests/
│   ├── unit/                  # Component unit tests
│   └── e2e/                   # Playwright end-to-end tests
└── package.json
```

**Structure Decision**: Full-stack web application (Option 2 variant). Backend and frontend are co-located in a monorepo with separate build roots. This reflects the web-based clinic staff interface and REST API serving it. No mobile layer in scope for v1.

## Complexity Tracking

No constitution violations requiring justification. All design choices map directly to HIPAA requirements or defined functional requirements.
