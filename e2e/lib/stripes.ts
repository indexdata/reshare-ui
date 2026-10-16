import { expect, type Locator, type Page } from '@playwright/test';
import { checkA11y } from './axe';

// Allowlist optional endpoint failures by source URL, never blanket 404 text.
// Justify each entry; unexpected failures must remain visible.
const IGNORED_URLS: RegExp[] = [];

export interface PageErrors {
  errors: string[];
}

// Start collecting uncaught exceptions and console.error output. Call before
// page.goto; assert with expectNoPageErrors once the route has rendered.
export function collectPageErrors(page: Page): PageErrors {
  const collected: PageErrors = { errors: [] };
  page.on('pageerror', (err) => {
    collected.errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const url = msg.location().url;
    if (url && IGNORED_URLS.some((re) => re.test(url))) return;
    collected.errors.push(`console.error: ${msg.text()}${url ? ` (${url})` : ''}`);
  });
  return collected;
}

export function expectNoPageErrors(collected: PageErrors) {
  expect(collected.errors, 'no uncaught errors or console.error output').toEqual([]);
}

// The stripes-components ErrorBoundary heading, in case a module crashes
// inside an intact chrome.
export function errorBoundary(page: Page): Locator {
  return page.getByText(/an error occurred|something went wrong/i);
}

// Setting E2E_USERNAME selects external mode throughout the suite.
export function isExternalTarget(): boolean {
  return Boolean(process.env.E2E_USERNAME);
}

// Each fresh context logs in; the mock accepts the default credentials.
export async function login(page: Page, credentials?: { username: string; password: string }) {
  const username = credentials?.username ?? process.env.E2E_USERNAME ?? 'e2e';
  const password = credentials?.password ?? process.env.E2E_PASSWORD ?? 'e2e';
  const usernameField = page.locator('#input-username');
  await usernameField.fill(username);
  await page.locator('#input-password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await usernameField.waitFor({ state: 'detached', timeout: 30_000 });
}

// Login preserves the destination. Navigating again would abort route fetches.
export async function visitRoute(
  page: Page,
  path: string,
  landmark: (page: Page) => Locator,
) {
  await page.goto(path);
  await login(page);
  await expect(landmark(page)).toBeVisible({ timeout: 30_000 });
}

export async function visitAndCheck(
  page: Page,
  path: string,
  landmark: (page: Page) => Locator,
) {
  const collected = collectPageErrors(page);
  await visitRoute(page, path, landmark);
  await expect(errorBoundary(page)).toHaveCount(0);
  expectNoPageErrors(collected);
  await checkA11y(page, `route ${path}`);
}
