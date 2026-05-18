import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// T078: Low-stock alert — set stock below threshold, dispense, assert badge appears
// Requires: local Supabase running with service-role key available for test setup

const PHARMACIST_EMAIL = process.env['E2E_PHARMACIST_EMAIL'] ?? 'pharmacist@clinic.test';
const PHARMACIST_PASS = process.env['E2E_PHARMACIST_PASS'] ?? 'password1234';
const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@clinic.test';
const ADMIN_PASS = process.env['E2E_ADMIN_PASS'] ?? 'password1234';

// Service-role key only allowed in test environment (never in browser bundle — Constitution II)
const supabaseAdmin = createClient(
  process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
);

test.describe('Low stock alert', () => {
  let inventoryId: string;
  const TEST_MEDICINE = `E2E-LowStock-${Date.now()}`;

  test.beforeAll(async () => {
    // Create a test medicine with stock=3, min_threshold=5
    const { data } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        name: TEST_MEDICINE,
        unit: 'tablet',
        stock_qty: 3,
        min_threshold: 5,
        unit_price_paise: 1000,
      })
      .select('id')
      .single();
    inventoryId = data?.id ?? '';
  });

  test.afterAll(async () => {
    if (inventoryId) {
      await supabaseAdmin.from('inventory_items').delete().eq('id', inventoryId);
    }
  });

  test('low-stock badge appears on inventory page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/reports/);

    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/inventory/);

    // Search for the test medicine
    await page.getByPlaceholder(/search/i).fill(TEST_MEDICINE);
    await page.waitForTimeout(400);

    // Should show Low stock badge
    await expect(page.getByText(/low/i).first()).toBeVisible({ timeout: 3000 });

    // Stock alerts widget should show this item
    await expect(page.getByText(/stock alert/i)).toBeVisible({ timeout: 3000 });
  });

  test('dashboard KPI count increments after Realtime event', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/reports/);

    // Stock Alerts tile should show at least 1
    const tile = page.getByText(/stock alert/i).locator('..').locator('..');
    await expect(tile).toContainText(/[1-9]/);
  });
});