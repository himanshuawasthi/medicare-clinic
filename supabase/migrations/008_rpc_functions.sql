-- Migration 008: RPC functions called by edge functions
-- All SECURITY DEFINER with explicit search_path
-- Constitution V: every function writes its audit row in the same transaction

-- Add substitute_inventory_id to bill_lines (supports 'substituted' decision)
ALTER TABLE public.bill_lines
  ADD COLUMN IF NOT EXISTS substitute_inventory_id uuid REFERENCES public.inventory_items (id);

-- ============================================================
-- dispense_prescription_txn
-- Called by: supabase/functions/dispense_prescription/index.ts
-- ============================================================
CREATE OR REPLACE FUNCTION dispense_prescription_txn(
  p_prescription_id UUID,
  p_pharmacist_id   UUID,
  p_lines           JSONB,  -- array of {inventory_id, qty, decision, substitute_inventory_id?}
  p_notes           TEXT,
  p_actor_role      TEXT    -- 'Pharmacist'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_rx           prescriptions%ROWTYPE;
  v_line         JSONB;
  v_item         inventory_items%ROWTYPE;
  v_dispense_id  UUID;
  v_total_paise  INTEGER := 0;
BEGIN
  -- Lock the prescription row to prevent double-dispense race
  SELECT * INTO v_rx
  FROM prescriptions
  WHERE id = p_prescription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_rx.status = 'DISPENSED' THEN
    RAISE EXCEPTION 'Already dispensed' USING ERRCODE = 'P0001';
  END IF;

  IF v_rx.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Prescription cancelled' USING ERRCODE = 'P0003';
  END IF;

  -- Insert the dispense record
  INSERT INTO dispenses (prescription_id, pharmacist_id, notes)
  VALUES (p_prescription_id, p_pharmacist_id, p_notes)
  RETURNING id INTO v_dispense_id;

  -- Process each dispensed line
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_item
    FROM inventory_items
    WHERE id = (v_line->>'inventory_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory item not found: %', v_line->>'inventory_id' USING ERRCODE = 'P0002';
    END IF;

    -- Belt-and-suspenders: enforce non-negative stock at DB level
    IF (v_line->>'qty')::INTEGER > v_item.stock_qty THEN
      RAISE EXCEPTION 'Insufficient stock for item %', v_item.id USING ERRCODE = 'P0001';
    END IF;

    v_total_paise := v_total_paise + ((v_line->>'qty')::INTEGER * v_item.unit_price_paise);

    -- Insert bill line
    INSERT INTO bill_lines (
      dispense_id, inventory_id, medicine_name,
      qty_dispensed, unit_price_paise, decision,
      substitute_inventory_id
    ) VALUES (
      v_dispense_id,
      (v_line->>'inventory_id')::UUID,
      v_item.name,
      (v_line->>'qty')::INTEGER,
      v_item.unit_price_paise,
      v_line->>'decision',
      NULLIF(v_line->>'substitute_inventory_id', '')::UUID
    );

    -- Decrement stock
    UPDATE inventory_items
    SET stock_qty = stock_qty - (v_line->>'qty')::INTEGER
    WHERE id = v_item.id;

    -- Record inventory adjustment for audit trail
    INSERT INTO inventory_adjustments (
      inventory_id, delta_qty, reason, adjusted_by
    ) VALUES (
      v_item.id,
      -((v_line->>'qty')::INTEGER),
      'Dispensed via prescription ' || p_prescription_id::text,
      p_pharmacist_id
    );
  END LOOP;

  -- Mark prescription as dispensed
  UPDATE prescriptions
  SET status = 'DISPENSED', updated_at = now()
  WHERE id = p_prescription_id;

  -- Write audit log (Constitution V)
  INSERT INTO audit.audit_log (
    actor_id, actor_role, action, target_table, target_id,
    before_json, after_json
  ) VALUES (
    p_pharmacist_id,
    p_actor_role,
    'DISPENSE',
    'prescriptions',
    p_prescription_id::text,
    jsonb_build_object('status', v_rx.status),
    jsonb_build_object(
      'status', 'DISPENSED',
      'dispense_id', v_dispense_id,
      'total_paise', v_total_paise
    )
  );

  RETURN jsonb_build_object(
    'dispense_id', v_dispense_id,
    'total_paise', v_total_paise,
    'status', 'DISPENSED'
  );
END;
$$;

-- ============================================================
-- edit_dispensed_prescription_txn
-- Called by: supabase/functions/edit_dispensed_prescription/index.ts
-- ============================================================
CREATE OR REPLACE FUNCTION edit_dispensed_prescription_txn(
  p_prescription_id    UUID,
  p_actor_id           UUID,
  p_actor_role         TEXT,    -- 'Doctor'
  p_update_payload     JSONB,   -- subset of prescription columns to update
  p_new_items          JSONB,   -- null or array of ItemChangeSchema
  p_reason             TEXT,
  p_medicines_changed  BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_rx_before prescriptions%ROWTYPE;
  v_item      JSONB;
BEGIN
  SELECT * INTO v_rx_before
  FROM prescriptions
  WHERE id = p_prescription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_rx_before.status <> 'DISPENSED' THEN
    RAISE EXCEPTION 'Prescription is not DISPENSED' USING ERRCODE = 'P0001';
  END IF;

  -- Apply field-level updates from payload
  IF p_update_payload ? 'symptoms' THEN
    UPDATE prescriptions SET symptoms = p_update_payload->>'symptoms' WHERE id = p_prescription_id;
  END IF;
  IF p_update_payload ? 'vitals' THEN
    UPDATE prescriptions SET vitals = p_update_payload->'vitals' WHERE id = p_prescription_id;
  END IF;
  IF p_update_payload ? 'doctor_notes' THEN
    UPDATE prescriptions SET doctor_notes = p_update_payload->>'doctor_notes' WHERE id = p_prescription_id;
  END IF;
  IF p_update_payload ? 'recommended_tests' THEN
    UPDATE prescriptions
    SET recommended_tests = ARRAY(SELECT jsonb_array_elements_text(p_update_payload->'recommended_tests'))
    WHERE id = p_prescription_id;
  END IF;

  UPDATE prescriptions SET updated_at = now() WHERE id = p_prescription_id;

  -- Replace prescription items if medicines changed (DELETE+INSERT pattern)
  IF p_medicines_changed AND p_new_items IS NOT NULL THEN
    DELETE FROM prescription_items WHERE prescription_id = p_prescription_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
    LOOP
      INSERT INTO prescription_items (
        prescription_id, inventory_id, medicine_name,
        dosage, frequency, duration_days, quantity
      ) VALUES (
        p_prescription_id,
        NULLIF(v_item->>'inventory_id', '')::UUID,
        v_item->>'medicine_name',
        v_item->>'dosage',
        v_item->>'frequency',
        NULLIF(v_item->>'duration_days', '')::INTEGER,
        (v_item->>'quantity')::INTEGER
      );
    END LOOP;

    -- Flag the dispense record for admin review
    UPDATE dispenses
    SET flagged_edit_after_dispense = true
    WHERE prescription_id = p_prescription_id;
  END IF;

  -- Write audit log (Constitution V)
  INSERT INTO audit.audit_log (
    actor_id, actor_role, action, target_table, target_id,
    before_json, after_json, reason
  ) VALUES (
    p_actor_id,
    p_actor_role,
    'EDIT_AFTER_DISPENSE',
    'prescriptions',
    p_prescription_id::text,
    row_to_json(v_rx_before)::JSONB,
    jsonb_build_object(
      'update_payload', p_update_payload,
      'medicines_changed', p_medicines_changed
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'prescription_id', p_prescription_id,
    'medicines_changed', p_medicines_changed,
    'status', 'ok'
  );
END;
$$;

-- ============================================================
-- adjust_inventory_txn
-- Called by: supabase/functions/adjust_inventory/index.ts
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_inventory_txn(
  p_inventory_id   UUID,
  p_actor_id       UUID,
  p_actor_role     TEXT,    -- 'Pharmacist' or 'Admin'
  p_delta_qty      INTEGER, -- positive = restock, negative = write-off
  p_reason         TEXT,
  p_previous_stock INTEGER, -- passed from edge function for audit reference
  p_new_stock      INTEGER  -- passed from edge function for audit reference
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_locked_stock INTEGER;
BEGIN
  -- Lock the row; re-read stock to guard against race between edge function check and here
  SELECT stock_qty INTO v_locked_stock
  FROM inventory_items
  WHERE id = p_inventory_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_locked_stock + p_delta_qty < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock' USING ERRCODE = 'P0001';
  END IF;

  -- Apply stock change
  UPDATE inventory_items
  SET stock_qty = stock_qty + p_delta_qty, updated_at = now()
  WHERE id = p_inventory_id;

  -- Append-only adjustment record (no previous_stock/new_stock columns in table by design)
  INSERT INTO inventory_adjustments (inventory_id, delta_qty, reason, adjusted_by)
  VALUES (p_inventory_id, p_delta_qty, p_reason, p_actor_id);

  -- Write audit log (Constitution V)
  INSERT INTO audit.audit_log (
    actor_id, actor_role, action, target_table, target_id,
    before_json, after_json, reason
  ) VALUES (
    p_actor_id,
    p_actor_role,
    CASE WHEN p_delta_qty > 0 THEN 'INVENTORY_RESTOCK' ELSE 'INVENTORY_WRITEOFF' END,
    'inventory_items',
    p_inventory_id::text,
    jsonb_build_object('stock_qty', v_locked_stock),
    jsonb_build_object('stock_qty', v_locked_stock + p_delta_qty),
    p_reason
  );

  RETURN jsonb_build_object(
    'inventory_id', p_inventory_id,
    'previous_stock', v_locked_stock,
    'new_stock', v_locked_stock + p_delta_qty,
    'delta_qty', p_delta_qty
  );
END;
$$;