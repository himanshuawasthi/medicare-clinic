-- Migration 002: users table (mirrors auth.users)
-- Constitution II: roles stored here; JWT custom claims sync via trigger

CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL,
  roles         text[] NOT NULL DEFAULT '{}' CHECK (
                  roles <@ ARRAY['Doctor', 'Pharmacist', 'Admin']::text[]
                ),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: returns roles for the current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT roles FROM public.users WHERE id = auth.uid()),
    '{}'::text[]
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;