// Edge Function: adjust_inventory
// Constitution V: audit row written in same transaction
// Constitution VI: delta_qty is integer paise — no float

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const AdjustRequestSchema = z.object({
  inventory_id: z.string().uuid(),
  delta_qty:    z.number().int(),
  reason:       z.string().min(1).max(500),
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('roles')
    .eq('id', user.id)
    .single();

  const roles: string[] = userData?.roles ?? [];
  if (!roles.includes('Pharmacist') && !roles.includes('Admin')) {
    return json({ error: 'Pharmacist or Admin role required', code: 'UNAUTHORIZED' }, 401);
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = AdjustRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { inventory_id, delta_qty, reason } = parsed.data;

  // Check current stock before attempting adjustment
  const { data: item } = await supabaseAdmin
    .from('inventory_items')
    .select('id, stock_qty')
    .eq('id', inventory_id)
    .single();

  if (!item) return json({ error: 'Item not found', code: 'ITEM_NOT_FOUND' }, 404);

  const newStock = item.stock_qty + delta_qty;
  if (newStock < 0) {
    return json({
      error: 'Adjustment would result in negative stock',
      code: 'WOULD_GO_NEGATIVE',
      current_stock: item.stock_qty,
    }, 422);
  }

  // All-or-nothing: insert adjustment + update stock + write audit
  const { data: result, error: rpcErr } = await supabaseAdmin.rpc('adjust_inventory_txn', {
    p_inventory_id:   inventory_id,
    p_actor_id:       user.id,
    p_actor_role:     roles.includes('Admin') ? 'Admin' : 'Pharmacist',
    p_delta_qty:      delta_qty,
    p_reason:         reason,
    p_previous_stock: item.stock_qty,
    p_new_stock:      newStock,
  });

  if (rpcErr) {
    // Catch race condition where stock went negative between our check and the RPC
    if (rpcErr.code === 'P0001') {
      return json({ error: 'Adjustment would result in negative stock', code: 'WOULD_GO_NEGATIVE', current_stock: item.stock_qty }, 422);
    }
    console.error('adjust_inventory_txn error', rpcErr.code);
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