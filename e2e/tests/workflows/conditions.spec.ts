import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { createCopyRequest, expectState, openFromList, scan } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

test('copy supplied with a condition the borrower accepts', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const note = `Reading room only ${Date.now()}`;
  const deliveryUrl = `https://example.org/e2e/${Date.now()}.pdf`;
  let requestId = '';

  await step('borrower asks for a copy', async () => {
    requestId = await createCopyRequest(borrower, title, 'E2E chapter');
  });

  await step('lender adds a condition', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.getByRole('button', { name: 'Add conditions' }).click();
    const dialog = lender.getByRole('dialog');
    await dialog.locator('label', { hasText: /^Use in library only$/ }).click();
    await dialog.locator('[name="note"]').fill(note);
    await checkA11y(lender, 'add conditions form, filled in');
    await dialog.getByRole('button', { name: 'Add conditions' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Condition pending');
  });

  await step('borrower sees the condition and accepts it', async () => {
    await expectState(borrower, 'Condition pending');
    const conditions = borrower.locator('#loanConditions');
    // the condition's name also begins its note
    await expect(conditions.getByRole('gridcell', { name: 'Use in library only', exact: true })).toBeVisible();
    await expect(conditions.getByText(note)).toBeVisible();
    await expect(conditions.getByText('Pending', { exact: true })).toBeVisible();
    // accepting is the primary action here, so it takes a scan
    await scan(borrower, requestId);
    await expectState(borrower, 'Will supply');
    await expect(conditions.getByText('Accepted', { exact: true })).toBeVisible();
  });

  await step('lender supplies the copy', async () => {
    await expectState(lender, 'Will supply');
    await lender.locator('[name="deliveryUrl"]').fill(deliveryUrl);
    await lender.getByRole('button', { name: 'Supply document' }).click();
    await expectState(lender, 'Completed');
    await expectState(borrower, 'Completed');
  });
});
