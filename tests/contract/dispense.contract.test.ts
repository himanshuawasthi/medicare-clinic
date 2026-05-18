// Contract test: dispense_prescription edge function
// Runs against Supabase local Docker (see .github/workflows/ci.yml contract-tests job)
// Constitution IV: every edge function has a contract test before merging

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? '';
const FUNCTIONS_URL = process.env['SUPABASE_FUNCTIONS_URL'] ?? 'http://127.0.0.1:54321/functions/v1';

// Helpers
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

describe('dispense_prescription edge function', () => {
  let admin: SupabaseClient;
  let pharmacistJwt: string;
  let doctorJwt: string;
  let patientId: string;
  let inventoryId: string;
  let pendingRxId: string;
  let dispensedRxId: string;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Seed: create a pharmacist user
    const { data: pharmacistData } = await admin.auth.admin.createUser({
      email: 'pharmacist-dispense-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    const pharmacistId = pharmacistData.user!.id;
    await admin.from('users').upsert({ id: pharmacistId, roles: ['Pharmacist'] });
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'pharmacist-dispense-test@test.local',
    });
    // Use service role to generate a JWT for testing
    await admin.auth.admin.getUserById(pharmacistId);
    const phSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'pharmacist-dispense-test@test.local', password: 'test-password-123' }),
    });
    const phTokenJson = (await phSignIn.json()) as { access_token?: string };
    pharmacistJwt = phTokenJson.access_token ?? '';

    // Seed: create a doctor user
    await admin.auth.admin.createUser({
      email: 'doctor-dispense-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    await admin.from('users')
      .select('id').eq('id', (await admin.auth.admin.listUsers()).data.users
        .find(u => u.email === 'doctor-dispense-test@test.local')!.id)
      .single();
    const doctorId = (await admin.auth.admin.listUsers()).data.users
      .find(u => u.email === 'doctor-dispense-test@test.local')!.id;
    await admin.from('users').upsert({ id: doctorId, roles: ['Doctor'] });
    const drSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'doctor-dispense-test@test.local', password: 'test-password-123' }),
    });
    const drTokenJson = (await drSignIn.json()) as { access_token?: string };
    doctorJwt = drTokenJson.access_token ?? '';

    // Seed: patient
    const { data: patient } = await admin.from('patients').insert({
      full_name: 'Contract Test Patient',
      mobile: '9876543210',
      gender: 'M',
    }).select('id').single();
    patientId = patient!.id as string;

    // Seed: inventory item with 100 units at ₹10 each (1000 paise)
    const { data: inv } = await admin.from('inventory_items').insert({
      name: 'Contract Test Medicine',
      unit: 'tablet',
      batch_no: 'BATCH-CT-001',
      stock_qty: 100,
      unit_price_paise: 1000,
    }).select('id').single();
    inventoryId = inv!.id as string;

    // Seed: PENDING prescription
    const { data: rx } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      symptoms: 'Test symptoms for contract test',
      status: 'PENDING',
    }).select('id').single();
    pendingRxId = rx!.id as string;
    await admin.from('prescription_items').insert({
      prescription_id: pendingRxId,
      medicine_name: 'Contract Test Medicine',
      inventory_id: inventoryId,
      dosage: '500mg',
      frequency: 'twice daily',
      quantity: 10,
    });

    // Seed: second PENDING rx for double-dispense test (will be dispensed to setup state)
    const { data: rx2 } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      symptoms: 'Already dispensed prescription',
      status: 'DISPENSED',
    }).select('id').single();
    dispensedRxId = rx2!.id as string;
  });

  afterAll(async () => {
    // Cleanup test data (order matters for FK constraints)
    await admin.from('inventory_adjustments').delete().eq('inventory_id', inventoryId);
    await admin.from('bill_lines').delete().in(
      'dispense_id',
      (await admin.from('dispenses').select('id').eq('prescription_id', pendingRxId)).data?.map(d => d.id) ?? [],
    );
    await admin.from('dispenses').delete().eq('prescription_id', pendingRxId);
    await admin.from('prescription_items').delete().eq('prescription_id', pendingRxId);
    await admin.from('prescriptions').delete().in('id', [pendingRxId, dispensedRxId]);
    await admin.from('inventory_items').delete().eq('id', inventoryId);
    await admin.from('patients').delete().eq('id', patientId);
  });

  it('happy path: dispenses prescription, decrements stock, writes audit row', async () => {
    const { status, data } = await invokeFunction(
      'dispense_prescription',
      {
        prescription_id: pendingRxId,
        lines: [{ inventory_id: inventoryId, qty: 10, decision: 'dispensed' }],
        notes: 'Contract test dispense',
      },
      pharmacistJwt,
    );

    expect(status).toBe(200);
    const result = data as Record<string, unknown>;
    expect(result['status']).toBe('DISPENSED');
    expect(typeof result['dispense_id']).toBe('string');
    expect(result['total_paise']).toBe(10000); // 10 × 1000

    // Verify stock decremented
    const { data: item } = await admin
      .from('inventory_items')
      .select('stock_qty')
      .eq('id', inventoryId)
      .single();
    expect(item!.stock_qty).toBe(90);

    // Verify prescription status updated
    const { data: rx } = await admin
      .from('prescriptions')
      .select('status')
      .eq('id', pendingRxId)
      .single();
    expect(rx!.status).toBe('DISPENSED');

    // Verify audit log row written (Constitution V)
    const { data: auditRows } = await admin
      .from('audit.audit_log')
      .select('action, target_id')
      .eq('target_id', pendingRxId)
      .eq('action', 'DISPENSE');
    expect(auditRows).toHaveLength(1);
  });

  it('returns 409 PRESCRIPTION_ALREADY_DISPENSED on double-dispense', async () => {
    const { status, data } = await invokeFunction(
      'dispense_prescription',
      {
        prescription_id: dispensedRxId,
        lines: [{ inventory_id: inventoryId, qty: 5, decision: 'dispensed' }],
      },
      pharmacistJwt,
    );

    expect(status).toBe(409);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('PRESCRIPTION_ALREADY_DISPENSED');
  });

  it('returns 422 INSUFFICIENT_STOCK when qty exceeds available stock', async () => {
    // Create a fresh PENDING prescription for this test
    const { data: freshRx } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: (await admin.from('users').select('id').contains('roles', ['Doctor']).single()).data!.id,
      symptoms: 'Insufficient stock test',
      status: 'PENDING',
    }).select('id').single();

    const { status, data } = await invokeFunction(
      'dispense_prescription',
      {
        prescription_id: freshRx!.id,
        lines: [{ inventory_id: inventoryId, qty: 9999, decision: 'dispensed' }],
      },
      pharmacistJwt,
    );

    expect(status).toBe(422);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('INSUFFICIENT_STOCK');
    expect(Array.isArray(result['short_items'])).toBe(true);

    // Cleanup
    await admin.from('prescriptions').delete().eq('id', freshRx!.id);
  });

  it('returns 422 ITEM_EXPIRED for an expired item', async () => {
    const { data: expiredItem } = await admin.from('inventory_items').insert({
      name: 'Expired Medicine Test',
      unit: 'tablet',
      stock_qty: 50,
      unit_price_paise: 500,
      expiry_date: '2020-01-01',
    }).select('id').single();

    const { data: freshRx } = await admin.from('prescriptions').insert({
      patient_id: patientId,
      doctor_id: (await admin.from('users').select('id').contains('roles', ['Doctor']).single()).data!.id,
      symptoms: 'Expired item test',
      status: 'PENDING',
    }).select('id').single();

    const { status, data } = await invokeFunction(
      'dispense_prescription',
      {
        prescription_id: freshRx!.id,
        lines: [{ inventory_id: expiredItem!.id, qty: 5, decision: 'dispensed' }],
      },
      pharmacistJwt,
    );

    expect(status).toBe(422);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('ITEM_EXPIRED');

    // Cleanup
    await admin.from('prescriptions').delete().eq('id', freshRx!.id);
    await admin.from('inventory_items').delete().eq('id', expiredItem!.id);
  });

  it('returns 401 when called without auth token', async () => {
    const res = await fetch(`${FUNCTIONS_URL}/dispense_prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescription_id: pendingRxId, lines: [] }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when called by a Doctor (not Pharmacist)', async () => {
    const { status, data } = await invokeFunction(
      'dispense_prescription',
      { prescription_id: pendingRxId, lines: [] },
      doctorJwt,
    );
    expect(status).toBe(401);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('UNAUTHORIZED');
  });
});