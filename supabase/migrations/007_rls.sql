-- Migration 007: Row-Level Security policies
-- Constitution II: all writes enforced at DB layer; UI hiding is supplementary only

-- ── patients ──────────────────────────────────────────────────────────────────
-- All authenticated staff can search/read patients (FR-001)
CREATE POLICY patients_select_authenticated ON public.patients
  FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Any authenticated staff can register patients (FR-002)
CREATE POLICY patients_insert_authenticated ON public.patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admin only can soft-delete (set deleted_at)
CREATE POLICY patients_update_admin ON public.patients
  FOR UPDATE USING ('Admin' = ANY(public.current_user_roles()));

-- ── prescriptions ─────────────────────────────────────────────────────────────
-- All authenticated can read prescriptions (Doctor sees history; Pharmacist sees queue)
CREATE POLICY prescriptions_select_authenticated ON public.prescriptions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only Doctor role may INSERT a prescription (FR-031: doctor_id must be a Doctor)
CREATE POLICY prescriptions_insert_doctor ON public.prescriptions
  FOR INSERT WITH CHECK (
    'Doctor' = ANY(public.current_user_roles())
    AND doctor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND 'Doctor' = ANY(roles)
    )
  );

-- Doctor may UPDATE their own PENDING prescriptions (FR-009)
-- DISPENSED prescription updates go through the edge function (service-role key)
CREATE POLICY prescriptions_update_doctor_pending ON public.prescriptions
  FOR UPDATE USING (
    'Doctor' = ANY(public.current_user_roles())
    AND status = 'PENDING'
    AND doctor_id = auth.uid()
  );

-- ── prescription_items ───────────────────────────────────────────────────────
CREATE POLICY prescription_items_select_authenticated ON public.prescription_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY prescription_items_insert_doctor ON public.prescription_items
  FOR INSERT WITH CHECK ('Doctor' = ANY(public.current_user_roles()));

CREATE POLICY prescription_items_update_doctor ON public.prescription_items
  FOR UPDATE USING ('Doctor' = ANY(public.current_user_roles()));

CREATE POLICY prescription_items_delete_doctor ON public.prescription_items
  FOR DELETE USING ('Doctor' = ANY(public.current_user_roles()));

-- ── inventory_items ───────────────────────────────────────────────────────────
-- All authenticated can read (for autocomplete); Doctor gets the view without price
CREATE POLICY inventory_items_select_authenticated ON public.inventory_items
  FOR SELECT USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Pharmacist or Admin can add/edit inventory items
CREATE POLICY inventory_items_insert_pharm_admin ON public.inventory_items
  FOR INSERT WITH CHECK (
    'Pharmacist' = ANY(public.current_user_roles())
    OR 'Admin' = ANY(public.current_user_roles())
  );

CREATE POLICY inventory_items_update_pharm_admin ON public.inventory_items
  FOR UPDATE USING (
    'Pharmacist' = ANY(public.current_user_roles())
    OR 'Admin' = ANY(public.current_user_roles())
  );

-- ── inventory_adjustments ─────────────────────────────────────────────────────
-- Pharmacist/Admin can read; edge function handles inserts via service-role
CREATE POLICY inventory_adjustments_select_pharm_admin ON public.inventory_adjustments
  FOR SELECT USING (
    'Pharmacist' = ANY(public.current_user_roles())
    OR 'Admin' = ANY(public.current_user_roles())
  );

-- ── dispenses ─────────────────────────────────────────────────────────────────
-- Pharmacist can read and insert dispenses; Admin can read
CREATE POLICY dispenses_select_pharm_admin ON public.dispenses
  FOR SELECT USING (
    'Pharmacist' = ANY(public.current_user_roles())
    OR 'Admin' = ANY(public.current_user_roles())
  );

-- ── bill_lines ────────────────────────────────────────────────────────────────
CREATE POLICY bill_lines_select_pharm_admin ON public.bill_lines
  FOR SELECT USING (
    'Pharmacist' = ANY(public.current_user_roles())
    OR 'Admin' = ANY(public.current_user_roles())
  );

-- ── users ─────────────────────────────────────────────────────────────────────
-- All authenticated staff can see the user list (for attribution display)
CREATE POLICY users_select_authenticated ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only Admin can manage user records
CREATE POLICY users_insert_admin ON public.users
  FOR INSERT WITH CHECK ('Admin' = ANY(public.current_user_roles()));

CREATE POLICY users_update_admin ON public.users
  FOR UPDATE USING ('Admin' = ANY(public.current_user_roles()));