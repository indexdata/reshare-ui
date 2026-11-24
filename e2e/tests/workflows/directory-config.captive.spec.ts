import { test, expect, type Locator, type Page } from '@playwright/test';
import { illmock } from '../../lib/env';
import { visitRoute } from '../../lib/stripes';

// Saves configuration through the directory app's settings cards and reads it
// back from the directory. Captive: it edits the seed's consortium and mock
// entries. Minimum cost is a decimal that inherits from the consortium, and
// the broker reads it only for an offered cost, which no workflow offers. The
// duplicate check window is a second ILL setting beside it; mock never
// borrows, so no workflow meets it.
const consortium = 'ISIL:US-E2E';
const branch = 'ISIL:US-TEST1-MAIN';
const minimumCost = 'ill-config-minimumCost';
const duplicateWindow = 'ill-config-duplicateCheckWindowHours';

// A setting's value as its card shows it, without the inheritance notes below it.
const value = (page: Page, id: string): Locator => page.locator(`#value-${id}`);

// The captive directory, which trusts the permissions header as stack-up.sh does.
const directory = 'http://localhost:8086/directory';

// A run that fails part way leaves its values behind, and mock inherits the
// consortium's, so each test starts with neither entry storing either setting.
test.beforeEach(async ({ page, request }) => {
  for (const symbol of [consortium, illmock.symbol]) {
    const response = await request.patch(`${directory}/entries/by-symbol/${symbol}`, {
      headers: { 'X-Okapi-Permissions': '["directory.consortium.all"]' },
      data: { illConfig: { minimumCost: null, duplicateCheckWindowHours: null } },
    });
    expect(response.ok(), `clear ${symbol}'s settings`).toBe(true);
  }
  await visitRoute(page, '/directory/entries', (p) => p.locator('#entries-list'));
});

async function openSection(page: Page, symbol: string, section: string) {
  await page.goto(`/directory/entries/by-symbol/${symbol}`);
  await expect(page.locator('#clickable-edit-entry')).toBeVisible({ timeout: 30_000 });
  await page.locator(`#clickable-entry-section-${section}`).click();
  await page.waitForURL(new RegExp(`/${section}(\\?|$)`));
}

// Edits one field, saves it and waits for the card to leave edit mode, which
// it does once the PATCH has succeeded.
async function saveField(page: Page, id: string, value: string) {
  const edit = page.locator(`#edit-${id}`);
  await expect(edit).toBeEnabled();
  await edit.click();
  await page.locator(`#${id}`).fill(value);
  await page.locator(`#save-${id}`).click();
  await expect(edit).toBeEnabled();
}

// Reloads the section, so what the card shows comes from the directory rather
// than from the editor's own state.
async function reloadSection(page: Page, id: string) {
  await page.reload();
  await expect(page.locator(`#edit-${id}`)).toBeEnabled({ timeout: 30_000 });
}

// Each save sends one field, which must leave the other settings stored in
// the same section alone.
test('a minimum cost saved on an institution reads back and clears, keeping its other settings', async ({ page }) => {
  await openSection(page, illmock.symbol, 'illconfig');
  const shown = value(page, minimumCost);
  const sibling = value(page, duplicateWindow);

  await saveField(page, duplicateWindow, '48');
  await saveField(page, minimumCost, '2.5');
  await reloadSection(page, minimumCost);
  await expect(shown).toHaveText('2.5');
  await expect(sibling).toHaveText('48');

  await saveField(page, minimumCost, '');
  await reloadSection(page, minimumCost);
  await expect(shown).toHaveText('');
  await expect(sibling).toHaveText('48');
});

test("an institution inherits the consortium's minimum cost unless it sets its own, and a branch its NCIP address", async ({ page }) => {
  await openSection(page, consortium, 'illconfig');
  await saveField(page, minimumCost, '1.25');

  await openSection(page, illmock.symbol, 'illconfig');
  const shown = value(page, minimumCost);
  const edit = page.locator(`#edit-${minimumCost}`);
  const restore = page.locator(`#restore-${minimumCost}`);
  await expect(shown).toHaveText('1.25');
  await expect(edit).toHaveText('Override');
  await expect(restore).toHaveCount(0);

  // A local value overrides the consortium's; restoring inherits again.
  await saveField(page, minimumCost, '2.5');
  await reloadSection(page, minimumCost);
  await expect(shown).toHaveText('2.5');
  await expect(edit).toHaveText('Edit');
  await restore.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore inherited value' }).click();
  await expect(restore).toHaveCount(0);
  await reloadSection(page, minimumCost);
  await expect(shown).toHaveText('1.25');
  await expect(edit).toHaveText('Override');

  await openSection(page, consortium, 'illconfig');
  await saveField(page, minimumCost, '');
  await openSection(page, illmock.symbol, 'illconfig');
  await expect(edit).toBeEnabled();
  await expect(shown).toHaveText('');

  // A branch sets its own pickup location but shows its institution's NCIP
  // address read-only.
  await openSection(page, branch, 'lmsconfig');
  await expect(page.locator('#edit-lms-config-requesterPickupLocation')).toBeEnabled();
  await expect(value(page, 'lms-config-address')).toHaveText('http://illmock:8081/ncip');
  await expect(page.locator('#edit-lms-config-address')).toHaveCount(0);
});
