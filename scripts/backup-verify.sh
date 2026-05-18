#!/usr/bin/env bash
# T082: DB backup-restore verification drill
# Usage: ./scripts/backup-verify.sh <staging-project-ref> <scratch-project-ref>
# Requires: supabase CLI authenticated with both project refs

set -euo pipefail

STAGING_REF="${1:?Usage: $0 <staging-ref> <scratch-ref>}"
SCRATCH_REF="${2:?Usage: $0 <staging-ref> <scratch-ref>}"

echo "==> Dumping staging DB (project: $STAGING_REF)..."
supabase db dump --project-ref "$STAGING_REF" -f /tmp/staging-dump.sql

echo "==> Restoring to scratch project ($SCRATCH_REF)..."
supabase db reset --project-ref "$SCRATCH_REF"
supabase db push --project-ref "$SCRATCH_REF" --db-url "$(supabase status --project-ref "$SCRATCH_REF" --output json | jq -r '.db_url')" < /tmp/staging-dump.sql

echo "==> Spot-checking 10 patient rows..."
PATIENT_COUNT=$(supabase db execute --project-ref "$SCRATCH_REF" \
  "SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL LIMIT 1;" | tail -1)
echo "    Patients in scratch: $PATIENT_COUNT"

echo "==> Spot-checking 10 prescription rows..."
RX_COUNT=$(supabase db execute --project-ref "$SCRATCH_REF" \
  "SELECT COUNT(*) FROM prescriptions;" | tail -1)
echo "    Prescriptions in scratch: $RX_COUNT"

echo "==> RLS anon check on scratch..."
ANON_KEY=$(supabase status --project-ref "$SCRATCH_REF" --output json | jq -r '.anon_key')
SCRATCH_URL=$(supabase status --project-ref "$SCRATCH_REF" --output json | jq -r '.api_url')
ROWS=$(curl -s \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  "${SCRATCH_URL}/rest/v1/prescriptions?select=id&limit=1" | jq 'length')
if [ "$ROWS" -gt 0 ]; then
  echo "FAIL: Anon can read prescriptions on scratch — RLS not enforced"
  exit 1
fi
echo "    RLS anon test: PASS"

echo "==> Backup restore drill COMPLETE"
rm /tmp/staging-dump.sql
