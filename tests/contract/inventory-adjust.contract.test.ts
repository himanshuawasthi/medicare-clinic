// Contract test: adjust_inventory edge function
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

describe('adjust_inventory edge function', () => {
  let admin: SupabaseClient;
  let pharmacistJwt: string;
  let doctorJwt: string;
  let inventoryId: string;
  const INITIAL_STOCK = 50;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Create pharmacist
    const { data: phAuth } = await admin.auth.admin.createUser({
      email: 'pharmacist-adjust-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    await admin.from('users').upsert({ id: phAuth.user!.id, roles: ['Pharmacist'] });
    const phSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'pharmacist-adjust-test@test.local', password: 'test-password-123' }),
    });
    pharmacistJwt = ((await phSignIn.json()) as { access_token?: string }).access_token ?? '';

    // Create doctor (for role-check test)
    const { data: drAuth } = await admin.auth.admin.createUser({
      email: 'doctor-adjust-test@test.local',
      password: 'test-password-123',
      email_confirm: true,
    });
    await admin.from('users').upsert({ id: drAuth.user!.id, roles: ['Doctor'] });
    const drSignIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ email: 'doctor-adjust-test@test.local', password: 'test-password-123' }),
    });
    doctorJwt = ((await drSignIn.json()) as { access_token?: string }).access_token ?? '';

    // Seed inventory item
    const { data: inv } = await admin.from('inventory_items').insert({
      name: 'Adjust Contract Medicine',
      unit: 'tablet',
      batch_no: 'BATCH-ADJ-001',
      stock_qty: INITIAL_STOCK,
      unit_price_paise: 2000,
    }).select('id').single();
    inventoryId = inv!.id as string;
  });

  afterAll(async () => {
    await admin.from('inventory_adjustments').delete().eq('inventory_id', inventoryId);
    await admin.from('inventory_items').delete().eq('id', inventoryId);
  });

  it('restock (+delta): increases stock, appends adjustment record, writes audit row', async () => {
    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: inventoryId,
        delta_qty: 20,
        reason: 'New shipment received from supplier',
      },
      pharmacistJwt,
    );

    expect(status).toBe(200);
    const result = data as Record<string, unknown>;
    expect(result['previous_stock']).toBe(INITIAL_STOCK);
    expect(result['new_stock']).toBe(INITIAL_STOCK + 20);
    expect(result['delta_qty']).toBe(20);

    // Verify DB stock updated
    const { data: item } = await admin
      .from('inventory_items')
      .select('stock_qty')
      .eq('id', inventoryId)
      .single();
    expect(item!.stock_qty).toBe(INITIAL_STOCK + 20);

    // Verify adjustment record appended
    const { data: adjustments } = await admin
      .from('inventory_adjustments')
      .select('delta_qty, reason')
      .eq('inventory_id', inventoryId)
      .eq('delta_qty', 20);
    expect(adjustments).toHaveLength(1);
    expect(adjustments![0]!.reason).toBe('New shipment received from supplier');

    // Verify audit log (Constitution V)
    const { data: auditRows } = await admin
      .from('audit.audit_log')
      .select('action, before_json, after_json')
      .eq('target_id', inventoryId)
      .eq('action', 'INVENTORY_RESTOCK');
    expect(auditRows!.length).toBeGreaterThanOrEqual(1);
    const latestAudit = auditRows![auditRows!.length - 1]!;
    expect((latestAudit.before_json as Record<string, number>)['stock_qty']).toBe(INITIAL_STOCK);
    expect((latestAudit.after_json as Record<string, number>)['stock_qty']).toBe(INITIAL_STOCK + 20);
  });

  it('write-off (-delta): decreases stock, appends adjustment, writes audit row', async () => {
    const stockBeforeWriteoff = INITIAL_STOCK + 20;

    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: inventoryId,
        delta_qty: -5,
        reason: 'Damaged tablets removed from stock',
      },
      pharmacistJwt,
    );

    expect(status).toBe(200);
    const result = data as Record<string, unknown>;
    expect(result['previous_stock']).toBe(stockBeforeWriteoff);
    expect(result['new_stock']).toBe(stockBeforeWriteoff - 5);

    // Verify DB
    const { data: item } = await admin
      .from('inventory_items')
      .select('stock_qty')
      .eq('id', inventoryId)
      .single();
    expect(item!.stock_qty).toBe(stockBeforeWriteoff - 5);

    // Verify writeoff audit action
    const { data: auditRows } = await admin
      .from('audit.audit_log')
      .select('action')
      .eq('target_id', inventoryId)
      .eq('action', 'INVENTORY_WRITEOFF');
    expect(auditRows!.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 422 WOULD_GO_NEGATIVE and rollback when delta would go below zero', async () => {
    const { data: item } = await admin
      .from('inventory_items')
      .select('stock_qty')
      .eq('id', inventoryId)
      .single();
    const currentStock = item!.stock_qty as number;

    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: inventoryId,
        delta_qty: -(currentStock + 1),  // one more than available
        reason: 'This should fail with rollback',
      },
      pharmacistJwt,
    );

    expect(status).toBe(422);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('WOULD_GO_NEGATIVE');
    expect(result['current_stock']).toBe(currentStock);

    // Verify stock unchanged (rollback)
    const { data: itemAfter } = await admin
      .from('inventory_items')
      .select('stock_qty')
      .eq('id', inventoryId)
      .single();
    expect(itemAfter!.stock_qty).toBe(currentStock);

    // Verify NO audit row written for the failed adjustment
    const { count } = await admin
      .from('inventory_adjustments')
      .select('id', { count: 'exact', head: true })
      .eq('inventory_id', inventoryId)
      .eq('delta_qty', -(currentStock + 1));
    expect(count).toBe(0);
  });

  it('returns 404 ITEM_NOT_FOUND for unknown inventory_id', async () => {
    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: '00000000-0000-0000-0000-000000000000',
        delta_qty: 10,
        reason: 'Should return not found',
      },
      pharmacistJwt,
    );

    expect(status).toBe(404);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('ITEM_NOT_FOUND');
  });

  it('returns 401 when called by a Doctor (not Pharmacist or Admin)', async () => {
    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: inventoryId,
        delta_qty: 10,
        reason: 'Unauthorized doctor attempt',
      },
      doctorJwt,
    );

    expect(status).toBe(401);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('UNAUTHORIZED');
  });

  it('returns 401 when called without auth token', async () => {
    const res = await fetch(`${FUNCTIONS_URL}/adjust_inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory_id: inventoryId, delta_qty: 10, reason: 'No auth' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 VALIDATION_ERROR for empty reason', async () => {
    const { status, data } = await invokeFunction(
      'adjust_inventory',
      {
        inventory_id: inventoryId,
        delta_qty: 5,
        reason: '',
      },
      pharmacistJwt,
    );

    expect(status).toBe(400);
    const result = data as Record<string, unknown>;
    expect(result['code']).toBe('VALIDATION_ERROR');
  });
});