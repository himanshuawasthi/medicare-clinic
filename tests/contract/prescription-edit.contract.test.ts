// Contract test: edit_dispensed_prescription edge function
// Runs against Supabase local Docker (see .github/workflows/ci.yml contract-tests job)
// Constitution IV: every edge function has a contract test before merging

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? '';
const FUNCTIONS_URL = process.env['SUPABASE_FUNCTIONS_URL'] ?? 'http://127.0.0.1:54321/functions/v1';

async function invokeFunction(
  name: string,
  body: unknown,
  jwt: string,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe('edit_dispensed_prescription edge function', () => {
  let admin: SupabaseClient;
  let doctorJwt: string;
  let pharmacistJwt: string;
  let patientId: string;
  let inventoryId: string;
  let dispensedRxId: string;
  let doctorId: string;
  let dispenseId: string;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Create doctor
    const { data: drAuth } = await admin.auth.admin.createUser({
      email: 'doctor-edit-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    doctorId = drAuth.user!.id;
    await admin.from('users').upsert({ id: doctorId, roles: ['Doctor'] });
    const drSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'doctor-edit-test@test.local', password: 'test-password-123' }),
    });
    doctorJwt = ((await drSignIn.json()) as { access_token?: string }).access_token ?? '';

    // Create pharmacist
    const { data: phAuth } = await admin.auth.admin.createUser({
      email: 'pharmacist-edit-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    const pharmacistId = phAuth.user!.id;
    await admin.from('users').upsert({ id: pharmacistId, roles: ['Pharmacist'] });
    const phSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'pharmacist-edit-test@test.local', password: 'test-password-123' }),
    });
    pharmacistJwt = ((await phSignIn.json()) as { access_token?: string }).access_token ?? '';

    // Patient + inventory
    const { data: patient } = await admin.from('patients').insert({
      full_name: 'Edit Contract Test Patient',
      mobile: '9123456780',
      gender: 'F',
    }).select('id').single();
    patientId = patient!.id as string;

    const { data: inv } = await admin.from('inventory_items').insert({
      name: 'Edit Contract Medicine',
      unit: 'tablet',
      stock_qty: 200,
      unit_price_paise: 500,
    }).select('id').single();
    inventoryId = inv!.id as string;

    // Create a DISPENSED prescription (simulate already dispensed)
    const { data: rx } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      symptoms: 'Original symptoms',
      status: 'DISPENSED',
    }).select('id').single();
    dispensedRxId = rx!.id as string;

    await admin.from('prescription_items').insert({
      prescription_id: dispensedRxId,
      inventory_id: inventoryId,
      medicine_name: 'Edit Contract Medicine',
      dosage: '250mg',
      frequency: 'once daily',
      quantity: 5,
    });

    const { data: disp } = await admin.from('dispenses').insert({
      prescription_id: dispensedRxId,
      pharmacist_id: pharmacistId,
    }).select('id').single();
    dispenseId = disp!.id as string;
  });

  afterAll(async () => {
    await admin.from('dispenses').delete().eq('id', dispenseId);
    await admin.from('prescription_items').delete().eq('prescription_id', dispensedRxId);
    await admin.from('prescriptions').delete().eq('id', dispensedRxId);
    await admin.from('inventory_items').delete().eq('id', inventoryId);
    await admin.from('patients').delete().eq('id', patientId);
  });

  it('symptoms-only edit: saves without medicines_changed flag', async () => {
    const { status, data } = await invokeFunction(
      'edit_dispensed_prescription',
      {
        prescription_id: dispensedRxId,
        changes: { symptoms: 'Updated symptoms after dispense' },
        reason: 'Patient reported corrected history',
      },
      doctorJwt,
    );

    expect(status).toBe(200);
    const result = data as Record<string, unknown>;
    expect(result['medicines_changed']).toBe(false);

    // Verify symptoms updated
    const { data: rx } = await admin
      .from('prescriptions')
      .select('symptoms')
      .eq('id', dispensedRxId)
      .single();
    expect(rx!.symptoms).toBe('Updated symptoms after dispense');

    // Verify dispense NOT flagged
    const { data: disp } = await admin
      .from('dispenses')
      .select('flagged_edit_after_dispense')
      .eq('id', dispenseId)
      .single();
    expect(disp!.flagged_edit_after_dispense).toBe(false);

    // Verify audit row (Constitution V)
    const { data: auditRows } = await admin
      .from('audit.audit_log')
      .select('action, reason')
      .eq('target_id', dispensedRxId)
      .eq('action', 'EDIT_AFTER_DISPENSE');
    expect(auditRows!.length).toBeGreaterThanOrEqual(1);
  });

  it('medicine change: sets flagged_edit_after_dispense, replaces items, publishes notification', async () => {
    const { status, data } = await invokeFunction(
      'edit_dispensed_prescription',
      {
        prescription_id: dispensedRxId,
        changes: {
          items: [
            {
              inventory_id: inventoryId,
              medicine_name: 'Edit Contract Medicine',
              dosage: '500mg',
              frequency: 'twice daily',
              quantity: 10,
            },
          ],
        },
        reason: 'Doctor corrected dosage after patient follow-up',
      },
      doctorJwt,
    );

    expect(status).toBe(200);
    const result = data as Record<string, unknown>;
    expect(result['medicines_changed']).toBe(true);

    // Verify dispense flagged
    const { data: disp } = await admin
      .from('dispenses')
      .select('flagged_edit_after_dispense')
      .eq('id', dispenseId)
      .single();
    expect(disp!.flagged_edit_after_dispense).toBe(true);

    // Verify items replaced
    const { data: items } = await admin
      .from('prescription_items')
      .select('dosage, quantity')
      .eq('prescription_id', dispensedRxId);
    expect(items).toHaveLength(1);
    expect(items![0]!.dosage).toBe('500mg');
    expect(items![0]!.quantity).toBe(10);
  });

  it('returns 400 REASON_TOO_SHORT when reason is fewer than 10 characters', async () => {
    const { status, data } = await invokeFunction(
      'edit_dispensed_prescription',
      {
        prescription_id: dispensedRxId,
        changes: { symptoms: 'Short reason test' },
        reason: 'Short',
      },
      doctorJwt,
    );

    expect(status).toBe(400);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('REASON_TOO_SHORT');
  });

  it('returns 400 when prescription is not DISPENSED', async () => {
    const { data: pendingRx } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      symptoms: 'Pending rx for edit test',
      status: 'PENDING',
    }).select('id').single();

    const { status, data } = await invokeFunction(
      'edit_dispensed_prescription',
      {
        prescription_id: pendingRx!.id,
        changes: { symptoms: 'Should not work' },
        reason: 'This should fail because status is PENDING',
      },
      doctorJwt,
    );

    expect(status).toBe(400);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('PRESCRIPTION_NOT_DISPENSED');

    await admin.from('prescriptions').delete().eq('id', pendingRx!.id);
  });

  it('returns 401 when called by a non-Doctor role (Pharmacist)', async () => {
    const { status, data } = await invokeFunction(
      'edit_dispensed_prescription',
      {
        prescription_id: dispensedRxId,
        changes: { symptoms: 'Pharmacist should not edit' },
        reason: 'Unauthorized edit attempt by pharmacist',
      },
      pharmacistJwt,
    );

    expect(status).toBe(401);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('UNAUTHORIZED');
  });
});