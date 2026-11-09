import { test, step } from '../../lib/tenants';
import { illmock, item } from '../../lib/env';
import { clickAction, createLoanRequest, expectState, holding, scan } from '../../lib/request';

// Covers the borrower receiving Overdue from a supplier, here illmock, since a
// lender's loan only becomes overdue through the broker's batch action.
test('supplier reports the loan overdue, the borrower renews', async ({ ownPage: borrower }) => {
  test.setTimeout(120_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower asks illmock for a loan, which ships', async () => {
    requestId = await createLoanRequest(borrower, title, holding(illmock.symbol, 'LOANED_OVERDUE'));
    await expectState(borrower, 'Shipped');
  });

  // illmock answers fast enough that Received and Renewal pending may never
  // be on screen
  await step('borrower receives and illmock reports it overdue', async () => {
    await scan(borrower, requestId);
    await expectState(borrower, 'Overdue');
  });

  await step('borrower renews and illmock accepts', async () => {
    await clickAction(borrower, 'Request renewal');
    await expectState(borrower, 'Renewed');
  });
});
