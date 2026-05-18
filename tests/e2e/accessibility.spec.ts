import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// T080: axe-core accessibility audit — zero critical/serious violations on key pages
// Runs against the login page (unauthenticated) and authenticated pages via session reuse.
// Full authenticated page audit requires seeded accounts and local Supabase.

const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@clinic.test';
const ADMIN_PASS = process.env['E2E_ADMIN_PASS'] ?? 'password1234';

async function login(page: Parameters<typeof AxeBuilder>[0]['page'], email: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(pass);
  await page.getByRole('button', { name: /sign in/i }).click();
}

function assertNoViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  const critical = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (critical.length > 0) {
    const summary = critical
      .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
      .join('\n');
    expect(critical, `Accessibility violations:\n${summary}`).toHaveLength(0);
  }
}

test.describe('Accessibility audit', () => {
  test('Login page has no critical violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    assertNoViolations(results);
  });

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, ADMIN_EMAIL, ADMIN_PASS);
      // Wait for redirect to complete
      await page.waitForURL(/\/(reports|patients|store)/);
    });

    test('Reports page has no critical violations', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assertNoViolations(results);
    });

    test('Patients (PatientSearch) page has no critical violations', async ({ page }) => {
      await page.goto('/patients');
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assertNoViolations(results);
    });

    test('Inventory page has no critical violations', async ({ page }) => {
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assertNoViolations(results);
    });
  });
});