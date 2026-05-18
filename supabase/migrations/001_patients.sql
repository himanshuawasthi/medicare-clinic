-- Migration 001: patients table
-- Constitution I: PHI table — RLS required; no PHI in logs

-- Required for gin_trgm_ops index below
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 200),
  mobile        text NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  gender        text NOT NULL CHECK (gender IN ('M', 'F', 'O')),
  dob           date,
  age_years     smallint CHECK (age_years BETWEEN 1 AND 120),
  address       text,
  allergies     text,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Unique on name + mobile (FR-003); allows same name with different mobile
  CONSTRAINT patients_name_mobile_unique UNIQUE (full_name, mobile),

  -- Must have either DOB or age
  CONSTRAINT patients_dob_or_age CHECK (dob IS NOT NULL OR age_years IS NOT NULL)
);

-- Index for fast name/mobile search (FR-001, SC-005 ≤ 300ms)
CREATE INDEX IF NOT EXISTS patients_full_name_trgm_idx
  ON public.patients USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS patients_mobile_idx
  ON public.patients (mobile);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS enabled — policies in 007_rls.sql
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;