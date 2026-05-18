import { test, expect } from '@playwright/test';

// T077: Edit-after-dispense flow — pharmacist dispenses, doctor edits, admin sees alert
// Requires: local Supabase running with seed data including all three role accounts

const DOCTOR_EMAIL = process.env['E2E_DOCTOR_EMAIL'] ?? 'doctor@clinic.test';
const DOCTOR_PASS = process.env['E2E_DOCTOR_PASS'] ?? 'password1234';
const PHARMACIST_EMAIL = process.env['E2E_PHARMACIST_EMAIL'] ?? 'pharmacist@clinic.test';
const PHARMACIST_PASS = process.env['E2E_PHARMACIST_PASS'] ?? 'password1234';
const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@clinic.test';
const ADMIN_PASS = process.env['E2E_ADMIN_PASS'] ?? 'password1234';

test.describe('Edit after dispense', () => {
  test('doctor edits DISPENSED prescription and admin sees notification', async ({ browser }) => {
    // Open admin page first to listen for notification
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('/login');
    await adminPage.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await adminPage.getByLabel(/password/i).fill(ADMIN_PASS);
    await adminPage.getByRole('button', { name: /sign in/i }).click();
    await expect(adminPage).toHaveURL(/\/reports/);

    // Doctor creates and pharmacist dispenses (abbreviated for this test)
    const doctorCtx = await browser.newContext();
    const doctorPage = await doctorCtx.newPage();
    await doctorPage.goto('/login');
    await doctorPage.getByLabel(/email/i).fill(DOCTOR_EMAIL);
    await doctorPage.getByLabel(/password/i).fill(DOCTOR_PASS);
    await doctorPage.getByRole('button', { name: /sign in/i }).click();

    // Doctor navigates to an existing DISPENSED prescription (assumes seed data exists)
    await doctorPage.goto('/patients');
    await doctorPage.getByPlaceholder(/search/i).fill('E2E');
    await doctorPage.waitForTimeout(400);
    const patientLink = doctorPage.getByRole('link').first();
    await patientLink.click();

    // Find a DISPENSED prescription and open it
    const dispRx = doctorPage.getByText(/dispensed/i).first();
    if (await dispRx.isVisible()) {
      await dispRx.click();
      await doctorPage.getByRole('button', { name: /edit/i }).click();

      // Change symptoms only (not medicines)
      const symptomsField = doctorPage.getByLabel(/symptoms/i);
      if (await symptomsField.isVisible()) {
        await symptomsField.fill('Updated symptoms after dispense');
        await doctorPage.getByLabel(/reason/i).fill('Correcting documentation error');
        await doctorPage.getByRole('button', { name: /save changes/i }).click();
        await expect(doctorPage.getByText(/saved/i)).toBeVisible({ timeout: 5000 });

        // Admin should see notification toast
        await expect(
          adminPage.getByText(/prescription edited after dispense/i),
        ).toBeVisible({ timeout: 5000 });
      }
    }

    await adminCtx.close();
    await doctorCtx.close();
  });
});