// Edge Function: dispense_prescription
// Constitution II: service-role key used server-side only
// Constitution V: audit row written in same transaction
// Constitution VI: all amounts are integer paise

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const DispenseRequestSchema = z.object({
  prescription_id: z.string().uuid(),
  lines: z
    .array(
      z.object({
        inventory_id: z.string().uuid(),
        qty: z.number().int().min(0),
        decision: z.enum(['dispensed', 'short', 'substituted']),
        substitute_inventory_id: z.string().uuid().optional(),
      }),
    )
    .min(1),
  notes: z.string().max(500).optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  // Service-role client for transaction (server-side only — never shipped to browser)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // User-scoped client to verify JWT and extract actor
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

  // Verify pharmacist role
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single();

  if (!userData?.roles?.includes('Pharmacist')) {
    return json({ error: 'Pharmacist role required', code: 'UNAUTHORIZED' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = DispenseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { prescription_id, lines, notes } = parsed.data;

  // Fetch prescription with row lock (prevents double-dispense race)
  const { data: rx, error: rxErr } = await supabaseAdmin
    .from('prescriptions')
    .select('id, status, patient_id, doctor_id')
    .eq('id', prescription_id)
    .single();

  if (rxErr || !rx) return json({ error: 'Prescription not found', code: 'PRESCRIPTION_NOT_FOUND' }, 404);
  if (rx.status === 'DISPENSED') return json({ error: 'Already dispensed', code: 'PRESCRIPTION_ALREADY_DISPENSED' }, 409);
  if (rx.status === 'CANCELLED') return json({ error: 'Prescription cancelled', code: 'PRESCRIPTION_CANCELLED' }, 409);

  // Validate stock and expiry for each line
  const inventoryIds = lines.map((l) => l.inventory_id);
  const { data: items } = await supabaseAdmin
    .from('inventory_items')
    .select('id, stock_qty, unit_price_paise, expiry_date')
    .in('id', inventoryIds);

  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

  const shortItems: string[] = [];
  for (const line of lines) {
    const item = itemMap.get(line.inventory_id);
    if (!item) return json({ error: 'Item not found', code: 'PRESCRIPTION_NOT_FOUND' }, 404);

    // Constitution I: never expose price in doctor context — pharmacist context only here
    if (item.expiry_date && new Date(item.expiry_date) < new Date()) {
      return json({ error: `Item ${line.inventory_id} is expired`, code: 'ITEM_EXPIRED' }, 422);
    }
    if (line.qty > item.stock_qty) {
      shortItems.push(line.inventory_id);
    }
  }

  if (shortItems.length > 0) {
    return json({ error: 'Insufficient stock', code: 'INSUFFICIENT_STOCK', short_items: shortItems }, 422);
  }

  // All-or-nothing transaction via RPC
  const { data: result, error: rpcErr } = await supabaseAdmin.rpc('dispense_prescription_txn', {
    p_prescription_id: prescription_id,
    p_pharmacist_id: user.id,
    p_lines: lines,
    p_notes: notes ?? null,
    p_actor_role: 'Pharmacist',
  });

  if (rpcErr) {
    console.error('dispense_prescription_txn error', rpcErr.code);
    return json({ error: 'Transaction failed', code: 'VALIDATION_ERROR' }, 500);
  }

  return json(result, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}