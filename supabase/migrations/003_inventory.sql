-- Migration 003: inventory tables
-- Constitution VI: unit_price_paise is integer (never float)

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  unit                text NOT NULL CHECK (unit IN ('tablet', 'strip', 'ml', 'bottle', 'other')),
  batch_no            text,
  stock_qty           integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_threshold       integer NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  unit_price_paise    integer NOT NULL CHECK (unit_price_paise >= 0),
  expiry_date         date,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_items_name_batch_unique UNIQUE (name, batch_no)
);

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for prescription autocomplete search
CREATE INDEX IF NOT EXISTS inventory_items_name_trgm_idx
  ON public.inventory_items USING gin (name gin_trgm_ops);

-- Append-only adjustments log (every stock change goes here)
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id    uuid NOT NULL REFERENCES public.inventory_items (id),
  delta_qty       integer NOT NULL,
  reason          text NOT NULL CHECK (char_length(reason) >= 1),
  adjusted_by     uuid NOT NULL REFERENCES public.users (id),
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only (FR-026 equivalent for inventory)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;