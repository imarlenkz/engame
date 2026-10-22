import { expect, test } from '@playwright/test';
import { addChild, PIN, playUntilDone, registerParent, prepare } from './helpers';

test.describe('family flow', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test('parent registers, adds a child, the child finishes a lesson, the parent sees the report', async ({ page }) => {
    await registerParent(page);
    await addChild(page, 'Aru');

    await page.getByRole('button', { name: 'Start playing' }).first().click();
    await expect(page).toHaveURL(/\/play$/);
    await expect(page.getByRole('heading', { name: 'Hi, Aru!' })).toBeVisible();

    await page.getByRole('button', { name: 'Start from the beginning' }).click();
    await page.getByRole('link', { name: /Continue/ }).or(page.getByRole('button', { name: /Continue/ })).first().click();
    await expect(page).toHaveURL(/\/lesson\//);

    await playUntilDone(page, /Lesson complete!/);
    await expect(page.getByText(/XP/).first()).toBeVisible();
    await page.getByRole('link', { name: 'Home' }).or(page.getByRole('button', { name: 'Home' })).first().click();

    // The missions card counts the finished lesson.
    await expect(page.getByText('1/1')).toBeVisible();

    // Parent area needs the PIN.
    await page.getByRole('button', { name: /Parent area/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('PIN').fill('0000');
    await dialog.getByRole('button', { name: 'Unlock' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByLabel('PIN').fill(PIN);
    await dialog.getByRole('button', { name: 'Unlock' }).click();
    await expect(page).toHaveURL(/\/parent/);

    await page.getByRole('link', { name: 'Report' }).first().click();
    await expect(page.getByRole('heading', { name: /Progress report|Aru/ }).first()).toBeVisible();
    await expect(page.getByText('Lessons completed')).toBeVisible();
  });

  test('a child session cannot reach parent or admin pages', async ({ page }) => {
    await registerParent(page);
    await addChild(page, 'Dana');
    await page.getByRole('button', { name: 'Start playing' }).first().click();
    await expect(page).toHaveURL(/\/play$/);

    const children = await page.request.get('/api/v1/children');
    expect(children.status()).toBe(400);
    expect((await children.json()).error.code).toBe('PARENT_MODE_LOCKED');

    const admin = await page.request.get('/api/v1/admin/overview');
    expect(admin.status()).toBe(403);
  });
});
