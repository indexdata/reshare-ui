import { expect, type Page } from '@playwright/test';
import { checkA11y } from './axe';

// Wait for live updates; reloading would hide a broken event stream.
export async function expectState(page: Page, state: string | RegExp) {
  const status = page.locator('#accordion-toggle-button-requestInfo').locator('xpath=ancestor::section[1]');
  await expect(status.getByText(state, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await checkA11y(page, `state ${state}`);
}

// Open a request from a list by searching for its title first, so that it is
// found however many other requests the tenant has.
export async function openFromList(page: Page, listPath: string, title: string) {
  await page.goto(listPath);
  await page.locator('#patron-request-search-qindex').selectOption({ label: 'Title' });
  await page.locator('#patron-request-search').fill(title);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  // the search navigates; a row clicked before it lands is closed again by it
  await page.waitForURL(/[?&]query=/);
  await page.locator('#requests').getByRole('gridcell', { name: title }).click();
}

// The primary action of several states is a scan box that takes the request id.
export async function scan(page: Page, requestId: string) {
  await page.locator('[name="reqId"]').fill(requestId);
  await page.getByRole('button', { name: 'Scan' }).click();
}

export async function showTab(page: Page, tab: 'Flow' | 'Details') {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.waitForURL(new RegExp(`/${tab.toLowerCase()}(\\?|$)`));
  await checkA11y(page, `${tab} tab`);
}

// Select after service type: changing it resets the tier. Index 0 is blank.
export async function chooseFirstTier(page: Page) {
  const tier = page.locator('[name="tier"]');
  if (await tier.count()) await tier.selectOption({ index: 1 });
}

export async function clickAction(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name }).click();
}

// MM/DD/YYYY, which is what the en-US datepicker takes.
export function usDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
