-- Migration 004: prescriptions and prescription_items tables
-- Constitution VII: all timestamps are timestamptz (UTC stored)

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES public.patients (id),
  doctor_id         uuid NOT NULL REFERENCES public.users (id),
  status            text NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'DISPENSED', 'CANCELLED')),
  symptoms          text NOT NULL CHECK (char_length(symptoms) BETWEEN 1 AND 2000),
  vitals            jsonb,
  recommended_tests text[],
  doctor_notes      text CHECK (char_length(doctor_notes) <= 1000),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for patient history (FR-027)
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_created_at_idx
  ON public.prescriptions (patient_id, created_at DESC);

-- Index for pharmacy queue (status=PENDING)
CREATE INDEX IF NOT EXISTS prescriptions_status_created_at_idx
  ON public.prescriptions (status, created_at ASC);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     uuid NOT NULL REFERENCES public.prescriptions (id) ON DELETE CASCADE,
  inventory_id        uuid REFERENCES public.inventory_items (id),
  medicine_name       text NOT NULL,
  dosage              text NOT NULL,
  frequency           text NOT NULL,
  duration_days       integer CHECK (duration_days > 0),
  quantity            integer NOT NULL CHECK (quantity > 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;