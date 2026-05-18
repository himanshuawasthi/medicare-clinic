-- Seed: demo data for local development and CI
-- 3 demo patients, 8 demo medicines, 3 demo staff users
-- Constitution I: these names are only in seed; PHI leak CI check catches them in dist/

-- Demo users are created via auth.users first, then mirrored to public.users
-- Run supabase auth admin create-user ... or use the Supabase dashboard

-- ── Demo Inventory (8 medicines) ──────────────────────────────────────────────
INSERT INTO public.inventory_items (name, unit, stock_qty, min_threshold, unit_price_paise, expiry_date, batch_no) VALUES
  ('Paracetamol 500mg',         'tablet', 500, 50,  150,   '2026-12-31', 'BATCH-PCM-001'),
  ('Amoxicillin 250mg',         'tablet', 200, 30,  350,   '2026-06-30', 'BATCH-AMX-001'),
  ('Azithromycin 500mg',        'tablet', 100, 20,  850,   '2026-09-30', 'BATCH-AZI-001'),
  ('Metformin 500mg',           'tablet', 300, 40,  200,   '2027-03-31', 'BATCH-MET-001'),
  ('Amlodipine 5mg',            'tablet', 150, 25,  300,   '2027-06-30', 'BATCH-AML-001'),
  ('Omeprazole 20mg',           'tablet', 250, 30,  180,   '2026-12-31', 'BATCH-OMP-001'),
  ('Cetirizine 10mg',           'tablet', 400, 50,  120,   '2027-01-31', 'BATCH-CET-001'),
  ('ORS Sachet Electral',       'other',   80, 10, 1200,   '2026-08-31', 'BATCH-ORS-001')
ON CONFLICT (name, batch_no) DO NOTHING;

-- ── Demo Patients (3 patients) ────────────────────────────────────────────────
INSERT INTO public.patients (full_name, mobile, gender, age_years, address) VALUES
  ('Ravi Kumar',       '9876543210', 'M', 35, '12, MG Road, Bengaluru'),
  ('Priya Sharma',     '9845012345', 'F', 28, '45, Gandhi Nagar, Bengaluru'),
  ('Mohammed Farhan',  '9900112233', 'M', 52, '78, Brigade Road, Bengaluru')
ON CONFLICT (full_name, mobile) DO NOTHING;

-- ── Demo Staff Users ──────────────────────────────────────────────────────────
-- NOTE: auth.users rows must exist before inserting here.
-- Create via: supabase auth admin create-user --email doctor@demo.local --password demo1234
-- Then run this seed. UUIDs below are placeholders — update to match actual auth UUIDs.
--
-- INSERT INTO public.users (id, full_name, email, roles) VALUES
--   ('<doctor-uuid>',      'Dr. Demo Doctor',     'doctor@demo.local',     ARRAY['Doctor']),
--   ('<pharmacist-uuid>',  'Demo Pharmacist',     'pharmacist@demo.local', ARRAY['Pharmacist']),
--   ('<admin-uuid>',       'Demo Admin',          'admin@demo.local',      ARRAY['Admin'])
-- ON CONFLICT (id) DO NOTHING;