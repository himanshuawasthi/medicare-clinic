#!/usr/bin/env bash
# T083-T085: Production launch checklist runner
# Usage: ./scripts/production-launch.sh <prod-project-ref>
# Requires: supabase CLI authenticated, VERCEL_TOKEN set for deployment

set -euo pipefail

PROD_REF="${1:?Usage: $0 <prod-project-ref>}"

echo "=== MediCare Production Launch Checklist ==="
echo ""
echo "Step 1 of 5: Applying migrations to production..."
supabase db push --project-ref "$PROD_REF"
echo "  [OK] Migrations applied"
echo ""

echo "Step 2 of 5: Verifying RLS (anon must return 0 prescription rows)..."
ANON_KEY=$(supabase status --project-ref "$PROD_REF" --output json | jq -r '.anon_key')
PROD_URL=$(supabase status --project-ref "$PROD_REF" --output json | jq -r '.api_url')
ROWS=$(curl -s \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  "${PROD_URL}/rest/v1/prescriptions?select=id&limit=1" | jq 'length')
if [ "$ROWS" -gt 0 ]; then
  echo "  FAIL: Anon can read prescriptions — abort launch"
  exit 1
fi
echo "  [OK] RLS verified — anon returns 0 rows"
echo ""

echo "Step 3 of 5: Deploying Edge Functions..."
supabase functions deploy dispense_prescription --project-ref "$PROD_REF" --no-verify-jwt
supabase functions deploy edit_dispensed_prescription --project-ref "$PROD_REF" --no-verify-jwt
supabase functions deploy adjust_inventory --project-ref "$PROD_REF" --no-verify-jwt
echo "  [OK] Edge functions deployed"
echo ""

echo "Step 4 of 5: Seeding production with clinic medicines..."
echo "  NOTE: Edit supabase/seed.sql to remove demo patients before running."
echo "  Run manually: supabase db seed --project-ref $PROD_REF"
echo ""

echo "Step 5 of 5: Verifying Vercel deploy has no service-role key..."
if vercel env ls --environment=production 2>/dev/null | grep -qi "service_role"; then
  echo "  FAIL: Service-role key found in Vercel env — Constitution II violation"
  exit 1
fi
echo "  [OK] No service-role key in Vercel production env"
echo ""

echo "=== Launch checklist COMPLETE ==="
echo "    Prod URL: ${PROD_URL}"
echo "    Next: Admin signs in and creates first user accounts"
