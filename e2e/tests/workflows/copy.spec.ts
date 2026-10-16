import { test, expect, step } from '../../lib/tenants';
import { peer, item, patron } from '../../lib/env';
import { chooseFirstTier, expectState, openFromList } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

test('copy supplied as a link', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(180_000);
  const title = `${item.title} ${Date.now()}`;
  const chapter = 'E2E chapter';
  const deliveryUrl = `https://example.org/e2e/${Date.now()}.pdf`;

  await step('borrower asks for a copy of a chapter', async () => {
    await borrower.goto('/request/requests/create');
    await borrower.locator('[name="patronInfo.patronId"]').fill(patron.id);
    // stripes lays the label over its radio input, so the label takes the click
    await borrower.locator('label', { hasText: /^Copy$/ }).click();
    await borrower.locator('[name="serviceInfo.copyrightCompliance[\'#text\']"]').selectOption('US-CCG');
    await chooseFirstTier(borrower);
    await borrower.locator('[name="systemInstanceIdentifier"]').fill(`return-${peer.symbol}::${item.id}`);
    await borrower.locator('[name="bibliographicInfo.title"]').fill(title);
    await borrower.locator('[name="bibliographicInfo.author"]').fill(item.author);
    await borrower.locator('[name="bibliographicInfo.titleOfComponent"]').fill(chapter);
    await borrower.locator('[name="bibliographicInfo.pagesRequested"]').fill('1-10');
    await checkA11y(borrower, 'create form, copy filled in');
    await borrower.getByRole('button', { name: 'Create patron request' }).click();
    await borrower.waitForURL(/\/requests\/(?!create)[^/]+\/flow/);
  });

  await step('lender sees the citation and supplies the link', async () => {
    await openFromList(lender, '/supply/requests', title);
    // a copy agrees to supply on its own; there is no pull slip
    await expectState(lender, 'Will supply');
    await expect(lender.getByText(chapter, { exact: true })).toBeVisible();
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
