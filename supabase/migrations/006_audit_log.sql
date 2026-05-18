-- Migration 006: audit log (separate schema, append-only)
-- Constitution V: immutable audit trail — no UPDATE or DELETE permitted by any role

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id              bigserial PRIMARY KEY,
  actor_id        uuid REFERENCES auth.users (id),
  actor_role      text,
  action          text NOT NULL,
  target_table    text NOT NULL,
  target_id       text NOT NULL,
  before_json     jsonb,
  after_json      jsonb,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only by design (FR-026)
);

-- Constitution V: PENDING prescription edits use Supabase JS client directly.
-- This trigger writes the audit row in the same transaction automatically.
CREATE OR REPLACE FUNCTION audit.audit_prescriptions_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit.audit_log (
    actor_id, actor_role, action, target_table, target_id,
    before_json, after_json
  ) VALUES (
    auth.uid(),
    (SELECT array_to_string(roles, ',') FROM public.users WHERE id = auth.uid()),
    'prescription.update',
    'prescriptions',
    OLD.id::text,
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_prescriptions_update
  AFTER UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION audit.audit_prescriptions_update();

-- RLS: audit log is readable by Admin only; no role may UPDATE or DELETE
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select_admin ON audit.audit_log
  FOR SELECT USING ('Admin' = ANY(public.current_user_roles()));

-- No INSERT policy via client — inserts come from edge functions and DB triggers (SECURITY DEFINER)
-- No UPDATE policy — UPDATE is blocked for all roles
-- No DELETE policy — DELETE is blocked for all roles

-- doctor-facing view: excludes unit_price_paise (Constitution II / FR-029)
CREATE OR REPLACE VIEW public.inventory_for_doctor AS
  SELECT
    id, name, unit, batch_no, stock_qty, min_threshold,
    expiry_date, deleted_at, created_at, updated_at
  FROM public.inventory_items
  WHERE deleted_at IS NULL
    AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);

-- Grant: only Doctor role can SELECT from the doctor view
REVOKE ALL ON public.inventory_for_doctor FROM PUBLIC;