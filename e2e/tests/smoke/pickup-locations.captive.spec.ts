import { test, expect } from '../../lib/tenants';
import type { Page } from '@playwright/test';

// Owned entries must offer only this tenant's branches, by name.
async function pickupOptions(page: Page) {
  await page.goto('/request/requests/create');
  const select = page.locator('[name="requesterPickupLocationId"]');
  await expect(select.locator('option').nth(1)).toBeAttached();
  return (await select.locator('option').allTextContents()).filter(label => label.trim());
}

test('pickup locations are the tenant\'s own branches', async ({ ownPage, peerPage }) => {
  expect(await pickupOptions(ownPage)).toEqual(['Test1 Main Library', 'Test1 Science Library', 'Test1 Storage Annex']);
  expect(await pickupOptions(peerPage)).toEqual(['Test2 Main Library']);
});
