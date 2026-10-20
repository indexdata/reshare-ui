import { test, expect, type Locator } from '@playwright/test';
import { checkA11y } from '../../lib/axe';
import { own } from '../../lib/env';
import { collectPageErrors, errorBoundary, expectNoPageErrors, visitRoute } from '../../lib/stripes';

const entriesList = '#entries-list';

// The value of the KeyValue with this label.
const keyValue = (scope: Locator, label: string) =>
  scope.locator(`div:has(> div:text-is("${label}")) > [data-test-kv-value]`);

test('a symbol search opens our own entry', async ({ page }) => {
  await visitRoute(page, `/directory/entries?qindex=symbol&query=${encodeURIComponent(own.symbol)}`, (p) => p.locator(entriesList));
  const row = page.locator(`${entriesList} [role="row"]`, { hasText: own.symbol });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(keyValue(page.locator('#entry-pane'), 'Symbols')).toContainText(own.symbol);
});

// Each section renders its marker only once its queries succeed, whether or
// not anything has been saved there: a config section's per-field Edit
// buttons, a list section's Add button.
const sections = [
  { key: 'lmsconfig', loaded: '[id^="edit-lms-config-"]' },
  { key: 'catalogconfig', loaded: '[id^="edit-catalog-config-"]' },
  { key: 'holdingspolicy', loaded: '[id^="edit-holdings-policy-"]' },
  { key: 'illconfig', loaded: '[id^="edit-ill-config-"]' },
  { key: 'tiers', loaded: '#clickable-add-entry-tier' },
  { key: 'networks', loaded: '#clickable-add-entry-network' },
  { key: 'closures', loaded: '#clickable-add-closure' },
];

test('our own entry loads section by section and in the edit form', async ({ page }) => {
  const collected = collectPageErrors(page);
  await visitRoute(page, `/directory/entries/by-symbol/${own.symbol}`, (p) => p.locator('#clickable-edit-entry'));
  const entry = page.locator('#entry-pane');
  await expect(keyValue(entry, 'Symbols')).toContainText(own.symbol);
  // the sections below are an institution's
  await expect(keyValue(entry, 'Type'), 'E2E_SYMBOL names an institution').toHaveText('Institution');
  for (const { key, loaded } of sections) {
    await page.locator(`#clickable-entry-section-${key}`).click();
    await page.waitForURL(new RegExp(`/${key}(\\?|$)`));
    await expect(entry.locator(loaded).first()).toBeVisible();
    await checkA11y(page, `entry section ${key}`);
  }
  await page.locator('#clickable-entry-section-entry').click();
  await page.locator('#clickable-edit-entry').click();
  // the edit form renders only once the entry has loaded, and the directory
  // requires a name
  await expect(page.locator('[name="name"]')).toHaveValue(/\S/);
  await checkA11y(page, 'entry edit form');
  await expect(errorBoundary(page)).toHaveCount(0);
  expectNoPageErrors(collected);
});
