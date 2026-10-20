import { test, expect } from '@playwright/test';
import { visitRoute } from '../../lib/stripes';

// Scanning only looks the request up and acts if it finds one, so an id no
// request carries leaves the target untouched.
test('update reports a scan that matches no request', async ({ page }) => {
  const scanBox = page.locator('[name="hrid"]');
  await visitRoute(page, '/update', () => scanBox);
  // ship prompts for no item barcode, unlike the default add-item
  await page.getByRole('combobox', { name: 'Action' }).selectOption('ship');
  const id = 'e2e-no-such-request';
  await scanBox.fill(id);
  await scanBox.press('Enter');
  await expect(scanBox).toHaveValue('');
  // the scan joins the list, which also names it in the pane title
  await expect(page.getByRole('gridcell', { name: id })).toBeVisible();
  await expect(page.getByText('No request found matching scanned id')).toBeVisible();
});
