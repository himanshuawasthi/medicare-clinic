-- Migration 005: dispenses and bill_lines tables
-- Constitution VI: line_total_paise is a GENERATED column (integer paise, never float)

CREATE TABLE IF NOT EXISTS public.dispenses (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id             uuid NOT NULL UNIQUE REFERENCES public.prescriptions (id),
  pharmacist_id               uuid NOT NULL REFERENCES public.users (id),
  notes                       text,
  flagged_edit_after_dispense boolean NOT NULL DEFAULT false,
  dispensed_at                timestamptz NOT NULL DEFAULT now()
  -- UNIQUE on prescription_id: one dispense per prescription (FR-017)
);

CREATE TABLE IF NOT EXISTS public.bill_lines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispense_id       uuid NOT NULL REFERENCES public.dispenses (id) ON DELETE CASCADE,
  inventory_id      uuid REFERENCES public.inventory_items (id),
  medicine_name     text NOT NULL,
  qty_dispensed     integer NOT NULL CHECK (qty_dispensed >= 0),
  decision          text NOT NULL CHECK (decision IN ('dispensed', 'short', 'substituted')),
  unit_price_paise  integer NOT NULL CHECK (unit_price_paise >= 0),
  -- GENERATED ensures exact paise arithmetic, never float (Constitution VI)
  line_total_paise  integer GENERATED ALWAYS AS (qty_dispensed * unit_price_paise) STORED
);

ALTER TABLE public.dispenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_lines ENABLE ROW LEVEL SECURITY;