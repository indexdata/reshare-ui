import { test, expect, step } from '../../lib/tenants';
import { item, own, peer } from '../../lib/env';
import { clickAction, createCopyRequest, expectState, expectSupplier, holding, openFromList } from '../../lib/request';

// The broker puts the requester's own holding first in a rota and, for a
// transparent requester, treats it as a local supply instead of sending the
// request to itself. Declining it sends the rota on to the next supplier.
test('local copy declined, supplied by the peer', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const chapter = 'E2E chapter';
  const deliveryUrl = `https://example.org/e2e/${Date.now()}.pdf`;

  await step('borrower asks for a copy held locally and by the peer', () =>
    createCopyRequest(borrower, title, chapter, [holding(own.symbol), holding(peer.symbol)].join(';')));

  await step('borrower is asked to review the local holding and declines it', async () => {
    await expectState(borrower, 'Requires review - locally available');
    await expectSupplier(borrower, own.symbol);
    // the action has no translation yet, so the button shows the message id
    await clickAction(borrower, /cannot.supply.locally/i);
    await expectSupplier(borrower, peer.symbol);
    await expectState(borrower, 'Will supply');
  });

  await step('lender supplies the link', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.locator('[name="deliveryUrl"]').fill(deliveryUrl);
    await lender.getByRole('button', { name: 'Supply document' }).click();
    await expectState(lender, 'Completed');
  });

  await step('borrower is done and has the link', async () => {
    await expectState(borrower, 'Completed');
    await expect(borrower.getByRole('link', { name: deliveryUrl })).toHaveAttribute('href', deliveryUrl);
  });
});
