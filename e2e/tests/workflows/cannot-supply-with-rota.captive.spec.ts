import { test, expect, step } from '../../lib/tenants';
import { illmock, item, peer } from '../../lib/env';
import { createLoanRequest, expectState, expectSupplier, holding, openFromList, scan } from '../../lib/request';

// The seed's network priorities put the peer before illmock in a rota. A
// supplier's Unfilled is not shown to the borrower while suppliers remain:
// the request stays as it was until the next supplier answers. illmock's
// scenario is the record id the broker passes on to it.
test('lender cannot supply, the next supplier lends', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(240_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower asks for a loan held by the peer and by illmock', async () => {
    requestId = await createLoanRequest(borrower, title, [holding(peer.symbol), holding(illmock.symbol, 'LOANED')].join(';'));
    await expectSupplier(borrower, peer.symbol);
    await expectState(borrower, 'Will supply');
  });

  await step('lender responds that it cannot supply', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.getByRole('button', { name: 'Respond "Cannot Supply"' }).click();
    const dialog = lender.getByRole('dialog');
    await dialog.locator('[name="reasonUnfilled"]').selectOption({ label: 'Not held' });
    await dialog.getByRole('button', { name: 'Respond "Cannot Supply"' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Unfilled');
  });

  await step('the request moves on to illmock, which ships', async () => {
    await expectSupplier(borrower, illmock.symbol);
    await expectState(borrower, 'Shipped');
  });

  await step('borrower receives and returns, and illmock completes the loan', async () => {
    await scan(borrower, requestId);
    await expectState(borrower, 'Received');
    // illmock completes the loan a moment after the return, so Shipped
    // returned may never be on screen
    await scan(borrower, requestId);
    await expectState(borrower, 'Completed');
  });
});
