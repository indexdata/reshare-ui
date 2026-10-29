import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { clickAction, createLoanRequest, expectState, openFromList, scan, usDate } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

test('loan recalled by the lender', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(240_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower creates the request', async () => {
    requestId = await createLoanRequest(borrower, title);
  });

  await step('lender ships', async () => {
    await openFromList(lender, '/supply/requests', title);
    await clickAction(lender, /pull ?slip.*printed/i);
    await expectState(lender, 'Searching');
    await scan(lender, requestId);
    await expectState(lender, 'Shipped');
  });

  await step('borrower receives', async () => {
    await expectState(borrower, 'Shipped');
    await scan(borrower, requestId);
    await expectState(borrower, 'Received');
  });

  await step('lender recalls with a new due date', async () => {
    await expectState(lender, 'Received');
    await clickAction(lender, 'Recall item');
    const dialog = lender.getByRole('dialog');
    await dialog.locator('[name="dueDate"]').fill(usDate(3));
    await checkA11y(lender, 'recall form, filled in');
    await dialog.getByRole('button', { name: 'Recall item' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Recalled');
  });

  await step('borrower returns the item and lender receives it', async () => {
    await expectState(borrower, 'Recalled');
    await scan(borrower, requestId);
    await expectState(borrower, 'Shipped returned');
    await expectState(lender, 'Shipped return');
    await scan(lender, requestId);
    await expectState(lender, 'Completed');
    await expectState(borrower, 'Completed');
  });
});
