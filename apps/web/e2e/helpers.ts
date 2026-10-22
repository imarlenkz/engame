import { expect, type Page } from '@playwright/test';

export const PIN = '2468';

/**
 * English UI, and a distinct client address per test so per-IP rate limits (5 sign-ups an hour) apply to
 * each simulated visitor separately. Needs the API to trust two proxy hops (TRUST_PROXY_HOPS=2), as in
 * production behind nginx.
 */
export async function prepare(page: Page) {
  const origin = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000').origin;
  await page.context().addCookies([{ name: 'eg_locale', value: 'en', url: origin }]);
  const ip = `198.18.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 253)}`;
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ip });
}

/** Registers a new parent account with email and password and lands on the parent dashboard. */
export async function registerParent(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('E2E Parent');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create a parent account' }).click();
  await expect(page).toHaveURL(/\/parent/);
  await page.getByLabel('Set a 4–6 digit PIN').fill(PIN);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('PIN saved')).toBeVisible();
  return { email };
}

export async function addChild(page: Page, nickname: string) {
  await page.getByRole('button', { name: '+ Add a child' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nickname').fill(nickname);
  await dialog.getByRole('checkbox').first().check();
  await dialog.getByRole('button', { name: /save|add|create/i }).last().click();
  await expect(page.getByText(nickname).first()).toBeVisible();
}

/**
 * Plays whatever step is on screen, without knowing the answers: picks the first option, places tiles in
 * order, and flips memory cards pairwise. Wrong answers are fine; the lesson still finishes.
 */
export async function playUntilDone(page: Page, doneText: RegExp) {
  for (let guard = 0; guard < 80; guard++) {
    if (await page.getByRole('heading', { name: doneText }).isVisible()) return;
    const main = page.locator('main');
    const footerButton = page.locator('footer button').last();
    if (await footerButton.isVisible().catch(() => false)) {
      if (await footerButton.isEnabled()) {
        await footerButton.click();
        continue;
      }
    }
    const radios = main.getByRole('radio');
    if ((await radios.count()) > 0 && (await radios.first().isEnabled())) {
      await radios.first().click();
      await page.locator('footer button').last().waitFor();
      continue;
    }
    const check = main.getByRole('button', { name: 'Check' });
    if (await check.isVisible().catch(() => false)) {
      const tiles = main.locator('div.flex-wrap[lang="en"] button');
      const n = await tiles.count();
      for (let i = 0; i < n && !(await check.isEnabled()); i++) {
        if (await tiles.nth(i).isEnabled()) await tiles.nth(i).click();
      }
      await check.click();
      await page.locator('footer button').last().waitFor();
      continue;
    }
    const cards = main.locator('div.grid button[aria-label]');
    const count = await cards.count();
    if (count > 0) {
      // Try each pair until the board is cleared; matched cards stop responding.
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          if (await page.locator('footer button').last().isVisible().catch(() => false)) break;
          const a = cards.nth(i);
          const b = cards.nth(j);
          if ((await a.getAttribute('class'))?.includes('bg-green-100') || (await b.getAttribute('class'))?.includes('bg-green-100')) continue;
          await a.click();
          await b.click();
          await page.waitForTimeout(1000);
        }
      }
      continue;
    }
    await page.waitForTimeout(300);
  }
  throw new Error('Lesson did not finish');
}
