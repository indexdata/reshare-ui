import { test, expect, step } from '../../lib/tenants';
import { item, pickupLocation } from '../../lib/env';
import { clickAction, createLoanRequest, expectState, openFromList, scan, showTab, usDate } from '../../lib/request';

// Set due dates in the UI to reach overdue without waiting for a scheduler.
test('loan with a renewal', async ({ ownPage: borrower, peerPage: lender }) => {
  test.setTimeout(300_000);
  const title = `${item.title} ${Date.now()}`;
  let requestId = '';

  await step('borrower creates the request', async () => {
    requestId = await createLoanRequest(borrower, title);
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

  // check-out and check-in leave the state as it is; the callout reports the LMS call succeeded
  await step('borrower checks the item out to the patron', async () => {
    await clickAction(borrower, 'Check out to patron');
    await expect(borrower.getByText('Success: Check out to patron')).toBeVisible();
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

  await step('borrower checks in the item', async () => {
    await clickAction(borrower, 'Check in item');
    await expect(borrower.getByText('Success: Check in item')).toBeVisible();
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
