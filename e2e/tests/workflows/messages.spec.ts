import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { createCopyRequest, expectState, openFromList } from '../../lib/request';
import { checkA11y } from '../../lib/axe';
import type { Page } from '@playwright/test';

async function openMessages(page: Page) {
  await page.locator('#clickable-show-chat').click();
  const pane = page.locator('#chat-pane');
  await expect(pane).toBeVisible();
  await checkA11y(page, 'messages pane');
  return pane;
}

async function send(page: Page, text: string) {
  const pane = page.locator('#chat-pane');
  await pane.locator('[name="note"]').fill(text);
  await pane.getByRole('button', { name: 'Send' }).click();
  await expect(pane.getByText(text, { exact: true })).toBeVisible();
}

test('messages between borrower and lender', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const question = `Could the scan include the endnotes? ${Date.now()}`;
  const answer = `Yes, endnotes included. ${Date.now()}`;

  await step('borrower asks for a copy', () => createCopyRequest(borrower, title, 'E2E chapter'));

  await step('lender has the request waiting to supply', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
  });

  await step('borrower messages the lender, whose open request counts it unread', async () => {
    await openMessages(borrower);
    await send(borrower, question);
    // the button's name comes from its tooltip
    await expect(lender.getByRole('button', { name: 'Messages (1 unread)' })).toBeVisible({ timeout: 30_000 });
  });

  await step('lender finds the request under unread messages and reads it', async () => {
    await lender.goto('/supply/requests');
    await lender.locator('#patron-request-search-qindex').selectOption({ label: 'Title' });
    await lender.locator('#patron-request-search').fill(title);
    await lender.getByRole('button', { name: 'Search', exact: true }).click();
    await lender.waitForURL(/[?&]query=/);
    await lender.locator('label', { hasText: /^Unread messages$/ }).click();
    await lender.waitForURL(/hasUnread/);
    const row = lender.locator('#requests [role="row"]', { hasText: title });
    await expect(row.getByRole('img', { name: '1 unread message' })).toBeVisible();
    await row.getByRole('gridcell', { name: title }).click();
    // the pane marks what it shows as read after a moment but keeps it
    // highlighted while open; closing the pane refetches
    const marked = lender.waitForResponse((r) => r.request().method() === 'PUT' && r.url().endsWith('/receipt'));
    const pane = await openMessages(lender);
    await expect(pane.getByText(question, { exact: true })).toBeVisible();
    await expect(pane.getByText('Unread', { exact: true })).toBeVisible();
    expect((await marked).ok()).toBe(true);
    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(lender.getByRole('button', { name: 'Messages (1 total)' })).toBeVisible();
  });

  await step('lender replies and the borrower sees it', async () => {
    const pane = await openMessages(lender);
    await expect(pane.getByText('Read', { exact: true })).toBeVisible();
    await send(lender, answer);
    await expect(borrower.locator('#chat-pane').getByText(answer, { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});
