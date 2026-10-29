import { test, expect, step } from '../../lib/tenants';
import { item, peer } from '../../lib/env';
import { createCopyRequest, expectState, openFromList, scan } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

test('lender proposes an alternative and the borrower accepts', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const deliveryUrl = `https://example.org/e2e/${Date.now()}.pdf`;
  let requestId = '';

  await step('borrower asks for a copy', async () => {
    requestId = await createCopyRequest(borrower, title, 'E2E chapter');
  });

  await step('lender proposes a retry', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.getByRole('button', { name: 'Propose alternative' }).click();
    const dialog = lender.getByRole('dialog');
    // Not found as cited is the only reason offered, so it comes selected
    await dialog.locator('[name="itemId"]').fill(`return-${peer.symbol}::${item.id}`);
    await checkA11y(lender, 'propose alternative form, filled in');
    await dialog.getByRole('button', { name: 'Propose alternative' }).click();
    await expect(dialog).toBeHidden();
    await expectState(lender, 'Completed with retry');
  });

  await step('borrower accepts the retry', async () => {
    await expectState(borrower, 'Retry pending');
    await scan(borrower, requestId);
    await expectState(borrower, 'Retry accepted');
  });

  await step('borrower follows the previous-request link', async () => {
    // the old request has ended, so the list shows only the new one
    await openFromList(borrower, '/request/requests', title);
    await expectState(borrower, 'Will supply');
    expect(borrower.url()).not.toContain(`/${requestId}/`);
    await borrower.getByRole('link', { name: 'Based on a previous request' }).click();
    await borrower.waitForURL(new RegExp(`/${requestId}/`));
    await expectState(borrower, 'Retry accepted');
    await borrower.goBack();
    await expectState(borrower, 'Will supply');
  });

  await step('lender supplies the new request and both complete', async () => {
    await openFromList(lender, '/supply/requests', title);
    await expectState(lender, 'Will supply');
    await lender.locator('[name="deliveryUrl"]').fill(deliveryUrl);
    await lender.getByRole('button', { name: 'Supply document' }).click();
    await expectState(lender, 'Completed');
    await expectState(borrower, 'Completed');
  });
});
