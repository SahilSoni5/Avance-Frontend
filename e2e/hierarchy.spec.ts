import { test, expect } from '@playwright/test';

const ROLES = [
  { email: 'admin@acme.com', label: 'Admin' },
  { email: 'boss@acme.com', label: 'Boss' },
  { email: 'manager1@acme.com', label: 'Manager' },
  { email: 'employee1@acme.com', label: 'Employee' },
];

for (const role of ROLES) {
  test(`${role.label} can login and see dashboard`, async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', role.email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
}

test('customer portal loads', async ({ page }) => {
  await page.goto('/portal/customer');
  await expect(page.getByText(/portal|knowledge|sign in/i).first()).toBeVisible();
});
