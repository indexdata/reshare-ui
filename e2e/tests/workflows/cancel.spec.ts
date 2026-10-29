import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { clickAction, createLoanRequest, expectState, openFromList, scan } from '../../lib/request';

test('loan cancelled by the borrower', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower creates the request', async () => {
    requestId = await createLoanRequest(borrower, title);
  });

  await step('lender opens the request', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
  });

  await step('borrower cancels', async () => {
    await expectState(borrower, 'Will supply');
    await clickAction(borrower, 'Cancel request');
    const dialog = borrower.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog).toBeHidden();
    await expectState(borrower, 'Cancel pending');
  });

  await step('lender accepts the cancellation', async () => {
    await expectState(lender, 'Cancel requested');
    await scan(lender, requestId);
    await expectState(lender, 'Cancelled');
    await expectState(borrower, 'Cancelled');
  });
});
