# Quickstart: MediCare Clinic Management System (v1)

**Phase 1 output** | Branch: `002-clinic-visit-workflow`

---

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker Desktop (for Supabase local)
- Supabase CLI (`brew install supabase/tap/supabase` or `scoop install supabase`)
- Git

---

## 1. Clone and install

```bash
git clone <repo-url> medicare-clinic
cd medicare-clinic
pnpm install
```

---

## 2. Start Supabase local

```bash
supabase start
# Outputs local URLs and keys — copy them to .env.local
```

Copy `.env.example` to `.env.local` and fill in the values printed by `supabase start`:

```bash
cp .env.example .env.local
```

```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start output>
# NEVER put the service-role key here — it is server-side only
```

---

## 3. Run migrations and seed

```bash
supabase db push               # applies all migrations in supabase/migrations/
supabase db seed               # inserts demo data (8 medicines, 3 patients, 3 users)
```

Demo accounts seeded:

| Email | Password | Role |
|---|---|---|
| `doctor@demo.local` | `demo1234` | Doctor |
| `pharmacist@demo.local` | `demo1234` | Pharmacist |
| `admin@demo.local` | `demo1234` | Admin |

---

## 4. Start the dev server

```bash
pnpm dev
# → http://localhost:5173
```

---

## 5. Run the test suite

```bash
# Unit + component tests (Vitest)
pnpm test

# Contract tests (requires supabase start to be running)
pnpm test:contract

# E2E tests (Playwright — starts dev server automatically)
pnpm test:e2e

# Type check only (no emit)
pnpm typecheck

# Lint
pnpm lint
```

---

## 6. Validate the golden path manually

With the dev server running and Supabase local started:

1. **Log in as Doctor** (`doctor@demo.local`)
2. Search for "Ravi" — should find the demo patient
3. Open the patient → see empty history
4. Create a prescription:
   - Symptoms: "Headache and mild fever"
   - Add medicine: type "Para" → select Paracetamol 500mg → quantity 10
   - Save
5. **Open a new tab, log in as Pharmacist** (`pharmacist@demo.local`)
6. Navigate to `/store` — the prescription card should appear **without refreshing**
7. Click the card → click "Complete dispensing"
8. Verify the bill shows ₹ amount and A5 print dialog opens
9. **Open a third tab, log in as Admin** (`admin@demo.local`)
10. Navigate to `/reports` — prescriptions today = 1, revenue today = ₹ amount

---

## 7. CI pipeline (GitHub Actions)

On every PR:
1. `pnpm typecheck` — TypeScript strict; fails on `any` via ESLint
2. `pnpm lint` — ESLint + Prettier
3. Supabase local spun up in CI → `pnpm test:contract` — edge function contracts
4. `pnpm test` — unit + component (coverage gate ≥ 70% for `lib/` and `features/*/`)
5. `pnpm build` — Vite production build; verify bundle ≤ 250 KB gzipped
6. PHI leak check: grep build output for known test patient names → must return 0 matches
7. RLS anon test: `select * from prescriptions` as anon key → must return 0 rows

On merge to `main`:
- Deploy frontend to Vercel staging
- `supabase db push` to `medicare-staging`

On tagged release (manual approval required):
- `supabase db push` to `medicare-prod`
- Deploy frontend to Vercel production

---

## 8. Key library locations

| What | Where |
|---|---|
| Supabase client (anon) | `src/lib/supabase.ts` |
| Money helpers (paise ↔ ₹) | `src/lib/money.ts` |
| Date helpers (UTC → IST) | `src/lib/date.ts` |
| All Zod schemas | `src/lib/zod-schemas/` |
| Edge functions | `supabase/functions/` |
| DB migrations | `supabase/migrations/` |
| Contract tests | `tests/contract/` |
| E2E specs | `tests/e2e/` |

---

## 9. Constitution reminders for contributors

- **Never put `unit_price_paise` in doctor-facing queries** — use the `inventory_for_doctor` view.
- **Never use `float` for money** — always integer paise; use `money.ts`.
- **Never call `console.log` with patient fields** — log patient UUID only.
- **Never use `any` in TypeScript** — ESLint will fail CI.
- **Never import the service-role key in `src/`** — it must not reach the browser bundle.
- **Every new edge function needs a contract test** before merging.