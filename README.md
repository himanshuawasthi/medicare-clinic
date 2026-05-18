# MediCare Clinic Management System

A digital workflow system for small-to-medium clinics and dispensaries in India. Turns a complete patient visit — search → consult → prescribe → dispense → bill — into a single connected flow, with prescription history that follows the patient across visits and inventory that updates the moment a medicine is dispensed.

## Roles

| Role | Responsibilities |
|---|---|
| **Doctor** | Patient lookup, recording prescriptions (vitals, symptoms, medicines, tests) |
| **Pharmacist** | Dispensing from the prescription queue, printing bills, managing stock |
| **Admin / Owner** | Inventory management, reports, expiry tracking, revenue overview |

A single person may hold multiple roles.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite |
| UI | Tailwind CSS, shadcn/ui (Radix UI), Recharts |
| State | TanStack Query, Zustand, React Hook Form |
| Validation | Zod (shared schemas across client and server) |
| Backend | Supabase (Postgres + Row-Level Security + Edge Functions) |
| Auth | Supabase Auth with MFA enforced |
| Testing | Vitest (unit + contract), Playwright (E2E) |
| CI | GitHub Actions |
| Deploy | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (`npm i -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Local setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key in .env.local

# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Start the dev server
pnpm dev
```

### Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Type-check + production build
pnpm typecheck        # TypeScript check only
pnpm lint             # ESLint (zero warnings policy)
pnpm test             # Unit + contract tests
pnpm test:contract    # Contract tests only
pnpm test:e2e         # Playwright E2E tests
pnpm test:coverage    # Coverage report
```

## Project Structure

```
src/
├── app/            # App shell, routing, providers, global store
├── auth/           # Auth context, protected routes, role hook
├── components/     # Shared UI components
├── features/       # Feature modules (patients, prescriptions, dispense, inventory, reports)
├── lib/            # Supabase client, Zod schemas, date/money utilities, audit writer
└── pages/          # Route-level page components

supabase/
├── migrations/     # SQL migrations (patients, users, inventory, prescriptions, audit log, RLS)
├── functions/      # Edge Functions (dispense, adjust inventory, edit dispensed prescription)
└── seed.sql        # Local dev seed data

specs/              # Feature specs, plans, tasks, and contract definitions
tests/
├── unit/           # Unit tests (date, money utilities)
├── contract/       # API contract tests against shared Zod schemas
└── e2e/            # Playwright end-to-end tests
```

## Key Design Decisions

- **INR / paise**: All monetary values stored as integers in paise (1 INR = 100 paise) to avoid floating-point errors. Display uses ₹ with Indian number formatting.
- **UTC storage**: All timestamps stored in UTC, converted to Asia/Kolkata (IST) at the display layer only. Display format: `dd-MMM-yyyy`, 12-hour AM/PM.
- **RLS everywhere**: All database writes go through Supabase Row-Level Security policies. The service-role key never reaches the browser.
- **Immutable audit log**: Every prescription create/edit and every inventory adjustment writes an append-only audit row in the same transaction.
- **Zod schemas**: All API boundaries and forms are validated by shared Zod schemas. Types are inferred from schemas — no parallel type declarations.

## Environment Variables

See `.env.example` for required variables. Never commit real keys.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## License

Private — all rights reserved.
