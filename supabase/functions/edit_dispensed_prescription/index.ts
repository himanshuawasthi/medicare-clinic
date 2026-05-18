// Edge Function: edit_dispensed_prescription
// Only for DISPENSED prescriptions — PENDING edits go through Supabase JS client + DB trigger
// Constitution V: audit row written in same transaction; medicines_changed flag set

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const VitalsChangeSchema = z.object({
  sys_bp:     z.number().int().positive().optional(),
  dia_bp:     z.number().int().positive().optional(),
  pulse:      z.number().int().positive().optional(),
  temp_f:     z.number().positive().optional(),
  weight_kg:  z.number().positive().optional(),
  height_cm:  z.number().positive().optional(),
});

const ItemChangeSchema = z.object({
  inventory_id:  z.string().uuid().optional(),
  medicine_name: z.string().min(1),
  dosage:        z.string().min(1),
  frequency:     z.string().min(1),
  duration_days: z.number().int().positive().optional(),
  quantity:      z.number().int().positive(),
});

const EditRequestSchema = z.object({
  prescription_id: z.string().uuid(),
  changes: z
    .object({
      symptoms:           z.string().min(1).max(2000).optional(),
      vitals:             VitalsChangeSchema.optional(),
      doctor_notes:       z.string().max(1000).optional(),
      recommended_tests:  z.array(z.string()).optional(),
      items:              z.array(ItemChangeSchema).min(1).optional(),
    })
    .refine((o) => Object.keys(o).length > 0, {
      message: 'At least one field must be provided in changes',
    }),
  reason: z.string().min(10, 'Reason must be at least 10 characters (FR-010)').max(1000),
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

  if (!userData?.roles?.includes('Doctor')) {
    return json({ error: 'Doctor role required', code: 'UNAUTHORIZED' }, 401);
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = EditRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.message?.includes('10 characters')) {
      return json({ error: firstIssue.message, code: 'REASON_TOO_SHORT' }, 400);
    }
    return json({ error: parsed.error.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { prescription_id, changes, reason } = parsed.data;

  const { data: rx } = await supabaseAdmin
    .from('prescriptions')
    .select('id, status')
    .eq('id', prescription_id)
    .single();

  if (!rx) return json({ error: 'Prescription not found', code: 'PRESCRIPTION_NOT_FOUND' }, 404);
  if (rx.status !== 'DISPENSED') {
    return json({ error: 'Only DISPENSED prescriptions use this function', code: 'PRESCRIPTION_NOT_DISPENSED' }, 400);
  }

  const medicinesChanged = changes.items !== undefined;

  // Build the prescription update payload
  const updatePayload: Record<string, unknown> = {};
  if (changes.symptoms)           updatePayload.symptoms = changes.symptoms;
  if (changes.vitals)             updatePayload.vitals = changes.vitals;
  if (changes.doctor_notes)       updatePayload.doctor_notes = changes.doctor_notes;
  if (changes.recommended_tests)  updatePayload.recommended_tests = changes.recommended_tests;

  // Transaction: update prescription + items + audit + flag
  const { data: result, error: rpcErr } = await supabaseAdmin.rpc(
    'edit_dispensed_prescription_txn',
    {
      p_prescription_id: prescription_id,
      p_actor_id:        user.id,
      p_actor_role:      'Doctor',
      p_update_payload:  updatePayload,
      p_new_items:       changes.items ?? null,
      p_reason:          reason,
      p_medicines_changed: medicinesChanged,
    },
  );

  if (rpcErr) {
    console.error('edit_dispensed_prescription_txn error', rpcErr.code);
    return json({ error: 'Transaction failed', code: 'VALIDATION_ERROR' }, 500);
  }

  // Publish Realtime notification to admin channel (FR-011)
  if (medicinesChanged) {
    await supabaseAdmin.channel('admin-alerts').send({
      type: 'broadcast',
      event: 'edit_after_dispense',
      payload: { prescription_id, actor_id: user.id },
    });
  }

  return json(result, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}