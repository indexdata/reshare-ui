import { test, expect, step } from '../../lib/tenants';
import { peer, item, patron, pickupLocation } from '../../lib/env';
import { chooseFirstTier, clickAction, expectState, openFromList, scan, showTab, usDate } from '../../lib/request';
import { checkA11y } from '../../lib/axe';

// Set due dates in the UI to reach overdue without waiting for a scheduler.
test('loan with a renewal', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(300_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower creates the request', async () => {
    await borrower.goto('/request/requests/create');
    await borrower.locator('[name="patronInfo.patronId"]').fill(patron.id);
    await borrower.locator('[name="systemInstanceIdentifier"]').fill(`return-${peer.symbol}::${item.id}`);
    await borrower.locator('[name="bibliographicInfo.title"]').fill(title);
    await borrower.locator('[name="bibliographicInfo.author"]').fill(item.author);
    await borrower.locator('[name="requesterPickupLocationId"]').selectOption({ label: pickupLocation.name });
    await chooseFirstTier(borrower);
    await checkA11y(borrower, 'create form, loan filled in');
    await borrower.getByRole('button', { name: 'Create patron request' }).click();
    await borrower.waitForURL(/\/requests\/(?!create)[^/]+\/flow/);
    requestId = borrower.url().match(/\/requests\/([^/]+)\/flow/)![1];
    // the branch went to the broker by id and comes back resolved by name
    await showTab(borrower, 'Details');
    await expect(borrower.getByText(pickupLocation.name, { exact: true })).toBeVisible();
    await showTab(borrower, 'Flow');
  });

  await step('lender prints the pull slip and ships, already due', async () => {
    await openFromList(lender, '/supply/requests', title);
    // the broker sent the branch's shipping address as the delivery address
    await showTab(lender, 'Details');
    await expect(lender.getByText(pickupLocation.street)).toBeVisible();
    await showTab(lender, 'Flow');
    await clickAction(lender, /pull ?slip.*printed/i);
    await expectState(lender, 'Searching');
    await clickAction(lender, /Override due date/);
    // a due date means the end of that day in the tenant's timezone, so
    // yesterday by this machine's clock can still lie ahead
    await lender.locator('[name="dueDate"]').fill(usDate(-2));
    await scan(lender, requestId);
    await expectState(lender, 'Shipped');
  });

  await step('borrower receives', async () => {
    await expectState(borrower, 'Shipped');
    await scan(borrower, requestId);
    await expectState(borrower, 'Received');
  });

  await step('lender marks the loan overdue', async () => {
    await expectState(lender, 'Received');
    await clickAction(lender, /overdue/i);
    await expectState(lender, 'Overdue');
  });

  await step('borrower asks for a renewal', async () => {
    await expectState(borrower, 'Overdue');
    await clickAction(borrower, 'Request renewal');
    await expectState(borrower, 'Renewal pending');
  });

  await step('lender accepts it with a new due date', async () => {
    await expectState(lender, 'Renewal pending');
    await lender.locator('[name="dueDate"]').fill(usDate(14));
    await clickAction(lender, 'Accept renewal');
    await expectState(lender, 'Renewed');
    await expectState(borrower, 'Renewed');
  });

  await step('borrower returns the item and lender receives it', async () => {
    await scan(borrower, requestId);
    await expectState(borrower, 'Shipped returned');
    await expectState(lender, 'Shipped return');
    await scan(lender, requestId);
    await expectState(lender, 'Completed');
    await expectState(borrower, 'Completed');
  });
});
