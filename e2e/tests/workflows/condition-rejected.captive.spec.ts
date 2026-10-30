import { test, expect, step } from '../../lib/tenants';
import { illmock, item, peer } from '../../lib/env';
import { accordion, clickAction, createLoanRequest, expectState, expectSupplier, holding, openFromList, showTab } from '../../lib/request';

// Rejecting a condition cancels with that supplier only, so once the lender
// accepts the cancellation the broker moves the request on. illmock, second by
// the seed's network priorities, answers Unfilled, and with no supplier left
// the request ends Unfilled.
test('condition rejected, rota exhausted', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(240_000);
  const title = `${item.title} ${Date.now()}`;
  const condition = 'Use in library only';

  await step('borrower asks for a loan held by the peer and by illmock', async () => {
    await createLoanRequest(borrower, title, [holding(peer.symbol), holding(illmock.symbol, 'UNFILLED')].join(';'));
    await expectSupplier(borrower, peer.symbol);
    await expectState(borrower, 'Will supply');
  });

  await step('lender adds a condition', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.getByRole('button', { name: 'Add conditions' }).click();
    const dialog = lender.getByRole('dialog');
    // stripes lays the label over its radio input, so the label takes the click
    await dialog.locator('label', { hasText: new RegExp(`^${condition}$`) }).click();
    await dialog.getByRole('button', { name: 'Add conditions' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Condition pending');
  });

  await step('borrower sees the condition and rejects it', async () => {
    await expectState(borrower, 'Condition pending');
    const conditions = borrower.locator('#loanConditions');
    // with no note, the note column repeats the condition
    await expect(conditions.getByRole('gridcell', { name: condition, exact: true }).first()).toBeVisible();
    await expect(conditions.getByText('Pending', { exact: true })).toBeVisible();
    await clickAction(borrower, 'Reject conditions');
    await expectState(borrower, 'Cancel pending');
    await expect(conditions.getByText('Rejected', { exact: true })).toBeVisible();
  });

  await step('lender accepts the cancellation', async () => {
    await expectState(lender, 'Cancel requested');
    await clickAction(lender, 'Accept cancellation');
    await expectState(lender, 'Cancelled');
  });

  await step('illmock, next in the rota, cannot supply either and the request ends unfilled', async () => {
    // The Unfilled the borrower ends in is the broker's own, so the supplier
    // field never names illmock. Its rota card shows it was tried and
    // answered Unfilled.
    await expectState(borrower, 'Unfilled');
    await showTab(borrower, 'Details');
    const illmockCard = accordion(borrower, 'suppliers').locator('[data-test-card-body]').filter({ hasText: illmock.symbol });
    await expect(illmockCard.getByText('Unfilled', { exact: true })).toBeVisible();
  });
});
