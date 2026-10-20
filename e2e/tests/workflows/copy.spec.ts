import { test, expect, step } from '../../lib/tenants';
import { item } from '../../lib/env';
import { createCopyRequest, expectState, openFromList } from '../../lib/request';

test('copy supplied as a link', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const chapter = 'E2E chapter';
  const deliveryUrl = `https://example.org/e2e/${Date.now()}.pdf`;

  await step('borrower asks for a copy of a chapter', () => createCopyRequest(borrower, title, chapter));

  await step('lender sees the citation and the pull slip, and supplies the link', async () => {
    await openFromList(lender, '/supply/requests', title);
    // a copy agrees to supply on its own, so no step marks the slip printed
    await expectState(lender, 'Will supply');
    await expect(lender.getByText(chapter, { exact: true })).toBeVisible();
    // the pane's action menu, not the flow's Actions accordion
    await lender.locator('[data-test-pane-header-actions-button]').click();
    await lender.getByRole('button', { name: 'Pull slip', exact: true }).click();
    // the iframe appears only once the broker has returned the PDF
    await expect(lender.locator('iframe[title="Pull slip"]')).toBeVisible();
    await lender.getByRole('button', { name: 'Close Pull slip' }).click();
    await expectState(lender, 'Will supply');
    await lender.locator('[name="deliveryUrl"]').fill(deliveryUrl);
    await lender.getByRole('button', { name: 'Supply document' }).click();
    await expectState(lender, 'Completed');
  });

  await step('borrower is done and has the link', async () => {
    await expectState(borrower, 'Completed');
    await expect(borrower.getByRole('link', { name: deliveryUrl })).toHaveAttribute('href', deliveryUrl);
    // nothing was lent, so there is no scan box to receive or return with
    await expect(borrower.locator('[name="reqId"]')).toHaveCount(0);
  });
});
