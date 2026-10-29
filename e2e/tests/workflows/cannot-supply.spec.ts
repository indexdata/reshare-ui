import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { createLoanRequest, expectState, openFromList } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

// With a single supplier the rota runs out at once, so the request ends Unfilled.
test('lender cannot supply a loan', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;

  await step('borrower creates the request', () => createLoanRequest(borrower, title));

  await step('lender responds that it cannot supply', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.getByRole('button', { name: 'Respond "Cannot Supply"' }).click();
    const dialog = lender.getByRole('dialog');
    await dialog.locator('[name="reasonUnfilled"]').selectOption({ label: 'Not held' });
    await checkA11y(lender, 'cannot supply form, filled in');
    await dialog.getByRole('button', { name: 'Respond "Cannot Supply"' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Unfilled');
  });

  await step('borrower sees the request unfilled', () => expectState(borrower, 'Unfilled'));
});
