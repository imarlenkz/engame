import { expect, test } from '@playwright/test';
import { prepare } from './helpers';

// Needs an admin account created with the CLI:
//   docker compose exec -e ADMIN_PASSWORD=... api node dist/cli.js create-admin <email> <name>
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('admin', () => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test('signs in, changes the daily goal, and the change is in the audit log', async ({ page }) => {
    await prepare(page);
    await page.goto('/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Published lessons')).toBeVisible();

    await page.getByRole('link', { name: 'Settings' }).click();
    const goal = page.locator('form', { has: page.getByRole('heading', { name: 'Daily goal' }) });
    const minutes = 10 + Math.floor(Math.random() * 20);
    await goal.locator('textarea').fill(JSON.stringify({ minutes }));
    await goal.getByRole('button', { name: 'Save' }).click();
    await expect(goal.getByRole('button', { name: /Saved/ })).toBeVisible();

    // Invalid values are rejected by the server, not silently stored.
    await goal.locator('textarea').fill(JSON.stringify({ minutes: 0 }));
    await goal.getByRole('button', { name: /Save/ }).click();
    await expect(goal.getByRole('alert')).toBeVisible();

    await page.getByRole('link', { name: 'Audit log' }).click();
    await expect(page.getByText('setting.update').first()).toBeVisible();
    await expect(page.getByText(`"minutes": ${minutes}`).first()).toBeVisible();
  });
});
