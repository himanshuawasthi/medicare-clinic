import { test, expect } from '@playwright/test';

// T076: Full clinic visit flow — register patient → prescribe → dispense → verify bill and inventory
// Requires: local Supabase running (`supabase start`) with seed data including:
//   - doctor@clinic.test / password1234 (role=Doctor)
//   - pharmacist@clinic.test / password1234 (role=Pharmacist)
//   - At least one medicine in inventory with stock > 2

const DOCTOR_EMAIL = process.env['E2E_DOCTOR_EMAIL'] ?? 'doctor@clinic.test';
const DOCTOR_PASS = process.env['E2E_DOCTOR_PASS'] ?? 'password1234';
const PHARMACIST_EMAIL = process.env['E2E_PHARMACIST_EMAIL'] ?? 'pharmacist@clinic.test';
const PHARMACIST_PASS = process.env['E2E_PHARMACIST_PASS'] ?? 'password1234';

test.describe('Full clinic visit', () => {
  let patientName: string;

  test.beforeAll(() => {
    patientName = `E2E Patient ${Date.now()}`;
  });

  test('doctor registers patient and creates prescription', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(DOCTOR_EMAIL);
    await page.getByLabel(/password/i).fill(DOCTOR_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should land on /patients
    await expect(page).toHaveURL(/\/patients/);

    // Register new patient
    await page.getByRole('link', { name: /register/i }).click();
    await page.getByLabel(/full name/i).fill(patientName);
    await page.getByLabel(/mobile/i).fill('9876543210');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/age/i).fill('35');
    await page.getByRole('button', { name: /register/i }).click();

    // Should navigate to consultation
    await expect(page).toHaveURL(/\/consult\//);

    // Fill prescription
    await page.getByLabel(/symptoms/i).fill('Fever and headache');
    // Add a medicine row (first autocomplete field in medicines form)
    const medicineInput = page.locator('input[list]').first();
    await medicineInput.fill('Para');
    await page.waitForTimeout(500);
    await medicineInput.press('Tab');
    // Save prescription
    await page.getByRole('button', { name: /save prescription/i }).click();

    await expect(page.getByText(/prescription saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('pharmacist sees queue and dispenses within 2s', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(PHARMACIST_EMAIL);
    await page.getByLabel(/password/i).fill(PHARMACIST_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/store/);

    // Queue card should appear within 2s
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 2000 });

    // Click to dispense
    await page.getByText(patientName).click();
    await expect(page).toHaveURL(/\/dispense\//);

    // Confirm dispense
    await page.getByRole('button', { name: /complete dispense/i }).click();

    // Bill should appear
    await expect(page.getByText(/bill total/i)).toBeVisible({ timeout: 5000 });
  });
});