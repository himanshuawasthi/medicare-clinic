// T021: audit payload builder — used by edge functions to write audit_log rows
// Constitution V: every prescription write and inventory adjustment MUST produce an audit row

export interface AuditPayload {
  actor_id:     string;
  actor_role:   string;
  action:       string;
  target_table: string;
  target_id:    string;
  before_json:  Record<string, unknown> | null;
  after_json:   Record<string, unknown> | null;
  reason:       string | null;
}

/**
 * Build a typed audit payload for insertion into audit.audit_log.
 * Call this inside the same DB transaction as the mutating operation.
 */
export function buildAuditPayload(
  actorId: string,
  actorRole: string,
  action: string,
  targetTable: string,
  targetId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason?: string,
): AuditPayload {
  return {
    actor_id:     actorId,
    actor_role:   actorRole,
    action,
    target_table: targetTable,
    target_id:    targetId,
    before_json:  before,
    after_json:   after,
    reason:       reason ?? null,
  };
}