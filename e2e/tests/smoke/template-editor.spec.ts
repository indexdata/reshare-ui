import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors, expectNoPageErrors, visitRoute } from '../../lib/stripes';

// Uses an unsaved template and built-in preview samples; requires no seed data.

const editor = (page: Page) => page.locator('#template-body');
// CodeMirror draws each line as its own element, so only innerText has the breaks.
const lines = { useInnerText: true };

async function openPullSlipForm(page: Page) {
  await visitRoute(page, '/settings/rs/templates/new', (p) => p.locator('[name="title"]'));
  await page.locator('#template-purpose').selectOption('pullslip');
  await expect(page.locator('#template-contentType')).toHaveValue('html');
  await expect(editor(page)).toBeVisible();
}

// Typed as one insertion: keystrokes would trigger the HTML mode's tag closing.
async function setBody(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
}

test('a pull slip body is edited as source, with placeholders inserted at the cursor', async ({ page }) => {
  const collected = collectPageErrors(page);
  await openPullSlipForm(page);
  await expect(page.locator('#template-body-source')).toHaveCount(0);

  await setBody(page, '<p></p>');
  for (let i = 0; i < '</p>'.length; i++) await page.keyboard.press('ArrowLeft');
  await page.locator('#template-body-placeholder').click();
  const picker = page.getByRole('dialog', { name: 'Insert placeholders' });
  await picker.getByRole('checkbox', { name: /\{\{\.Title\}\}/ }).check();
  await picker.getByRole('button', { name: 'Insert selected' }).click();

  await expect(editor(page)).toHaveText('<p>{{.Title}}</p>');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.insertText('!');
  await expect(editor(page)).toHaveText('<p>{{.Title}}!</p>');

  // HTML the editor cannot parse is marked on its own, with no preview open,
  // and a template action inside an attribute value is not an error.
  await setBody(page, '<p class=box">{{.Title}}</p>');
  await expect(page.locator('.cm-lintRange-error')).toBeVisible();
  await setBody(page, '<p title="{{printf "%s" .Title}}">{{.Title}}</p>');
  await expect(page.locator('.cm-lintRange-error')).toHaveCount(0);

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.cm-search')).toBeVisible();
  expectNoPageErrors(collected);
});

test('the preview renders the samples and marks a template error at its line', async ({ page }) => {
  const collected = collectPageErrors(page);
  await openPullSlipForm(page);
  await setBody(page, '<p>{{.Title}}</p>');

  await page.locator('#template-body-preview').click();
  const workspace = page.locator('#template-preview-pdf');
  await expect(workspace.locator('iframe[src^="blob:"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#template-preview-editor #template-body')).toHaveText('<p>{{.Title}}</p>');
  // Checked here: the rejected body below is logged as a failed request.
  expectNoPageErrors(collected);

  await setBody(page, '<p>\n{{.Nope}}\n</p>');
  await expect(workspace.getByText(/^Line 2: /)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#template-preview-editor .cm-lintRange-error')).toBeVisible();
  // The slips from the last body that rendered stay up.
  await expect(workspace.locator('iframe[src^="blob:"]')).toBeVisible();

  await workspace.getByRole('button', { name: /close/i }).click();
  await expect(workspace).toHaveCount(0);
  await expect(editor(page)).toHaveText('<p>\n{{.Nope}}\n</p>', lines);
});
