// Creates E2E test accounts in the local Supabase instance.
// Run via: node scripts/create-e2e-accounts.mjs
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
// Constitution II: service-role key used only in this Node script, never shipped to the browser.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const accounts = [
  { email: 'doctor@clinic.test', password: 'password1234', role: 'Doctor' },
  { email: 'pharmacist@clinic.test', password: 'password1234', role: 'Pharmacist' },
  { email: 'admin@clinic.test', password: 'password1234', role: 'Admin' },
];

for (const { email, password, role } of accounts) {
  let userId;

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (!createError.message.toLowerCase().includes('already')) {
      console.error(`Failed to create ${email}:`, createError.message);
      continue;
    }
    // User already exists — look up their ID
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) { console.error(`Failed to list users:`, listError.message); continue; }
    userId = listData.users.find(u => u.email === email)?.id;
  } else {
    userId = createData?.user?.id;
  }

  if (!userId) { console.error(`Could not resolve ID for ${email}`); continue; }

  const { error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email, roles: [role], full_name: `E2E ${role}` });

  if (upsertError) {
    console.error(`Failed to upsert users row for ${email}:`, upsertError.message);
  } else {
    console.log(`✓ ${role} account ready: ${email}`);
  }
}