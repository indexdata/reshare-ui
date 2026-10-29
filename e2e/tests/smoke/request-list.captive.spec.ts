import { test, expect, type Page } from '@playwright/test';
import { checkA11y } from '../../lib/axe';
import { collectPageErrors, errorBoundary, expectNoPageErrors, visitRoute } from '../../lib/stripes';
import { isbn, issn, marker, requests, type SeedRequest } from '../../seed/requests';

// URL cases cover query results; a control journey covers changes on a mounted list.
// Both derive expected rows from the imported seed.

type App = 'request' | 'supply';
interface ListQuery {
  qindex?: string;
  query?: string;
  filters?: string[];
  sort?: string;
}

const sideOf = { request: 'borrowing', supply: 'lending' } as const;
const seeded = (app: App) => requests.filter((r) => r.side === sideOf[app]);
const day = (r: SeedRequest, field: 'createdAt' | 'neededAt') => r[field]?.slice(0, 10) ?? '';
const between = (value: string, start: string, end: string) => value !== '' && value >= start && value <= end;

// Default to the marker search to exclude requests created by other specs.
function listUrl(app: App, { qindex = 'title', query = marker, filters = [], sort }: ListQuery) {
  const params = new URLSearchParams({ qindex, query });
  if (filters.length) params.set('filters', filters.join(','));
  if (sort) params.set('sort', sort);
  return `/${app}/requests?${params}`;
}

// The count renders only once the query has succeeded.
const found = (page: Page) => page.getByText(/^\d+ records? found$/);

async function expectFound(page: Page, count: number) {
  await expect(found(page)).toHaveText(`${count} records found`);
}

const firstRow = (page: Page) => page.locator('[data-row-inner]').first();
// The request ID column, second after the flags.
const idCells = (page: Page) => page.locator('[data-row-inner] [role="gridcell"]:nth-child(2)');
const pageSize = 100;

// Check the total and, for a single page, IDs regardless of order.
async function expectListed(page: Page, rows: SeedRequest[], check = expect) {
  await check(found(page)).toHaveText(`${rows.length} records found`);
  if (rows.length > pageSize) return;
  await check(idCells(page)).toHaveCount(rows.length);
  check((await idCells(page).allInnerTexts()).sort()).toEqual(rows.map((r) => r.requesterRequestId).sort());
}

// Wait for URL parameters; null means absent, arrays compare as sets.
function expectParams(page: Page, expected: Record<string, string | string[] | null>) {
  return page.waitForURL((url) => Object.entries(expected).every(([name, value]) => {
    const actual = url.searchParams.get(name);
    if (Array.isArray(value)) return actual !== null && actual.split(',').sort().join() === [...value].sort().join();
    return actual === value;
  }));
}

// Option names include a trailing '+' add marker.
async function pick(page: Page, group: string, label: string) {
  const box = page.locator(`#${group}`);
  await box.getByRole('combobox').fill(label);
  await box.getByRole('option', { name: new RegExp(`^${label}\\s*\\+$`) }).click();
}

interface Case {
  name: string;
  app?: App;
  query: ListQuery;
  expected: (r: SeedRequest) => boolean;
}

const cases: Case[] = [
  { name: 'title search for the marker', query: {}, expected: () => true },
  { name: 'hide completed', query: { filters: ['terminal.false'] }, expected: (r) => !r.terminal },
  { name: 'one state', query: { filters: ['state.SENT'] }, expected: (r) => r.state === 'SENT' },
  {
    name: 'two states',
    query: { filters: ['state.SENT', 'state.SHIPPED'] },
    expected: (r) => r.state === 'SENT' || r.state === 'SHIPPED',
  },
  { name: 'needs attention', query: { filters: ['needsAttention.true'] }, expected: (r) => r.needsAttention },
  { name: 'has cost', query: { filters: ['hasCost.true'] }, expected: (r) => r.hasCost },
  { name: 'has internal note', query: { filters: ['hasInternalNote.true'] }, expected: (r) => Boolean(r.internalNote) },
  { name: 'unread messages', query: { filters: ['hasUnread.true'] }, expected: (r) => r.unread },
  { name: 'service type', query: { filters: ['serviceType.Copy'] }, expected: (r) => r.serviceType === 'Copy' },
  { name: 'service level', query: { filters: ['serviceLevel.Rush'] }, expected: (r) => r.serviceLevel === 'Rush' },
  { name: 'supplier', query: { filters: ['supplier.ISIL:US-MOCK'] }, expected: (r) => r.peer === 'ISIL:US-MOCK' },
  {
    // No seeded row falls on the end date, so this checks range filtering only.
    name: 'date needed',
    query: { filters: ['neededAt.needed_at>=2025-06-01 and needed_at<=2025-06-30'] },
    expected: (r) => between(day(r, 'neededAt'), '2025-06-01', '2025-06-30'),
  },
  {
    name: 'two filter groups together',
    query: { filters: ['needsAttention.true', 'serviceType.Loan'] },
    expected: (r) => r.needsAttention && r.serviceType === 'Loan',
  },
  { name: 'request ID index', query: { qindex: 'requester_req_id', query: 'SEED-B042' }, expected: (r) => r.requesterRequestId === 'SEED-B042' },
  { name: 'author index', query: { qindex: 'author', query: 'Lindqvist' }, expected: (r) => r.author === 'Lindqvist' },
  { name: 'ISBN index', query: { qindex: 'isbn', query: isbn }, expected: (r) => r.isbn === isbn },
  { name: 'ISSN index', query: { qindex: 'issn', query: issn }, expected: (r) => r.issn === issn },
  { name: 'requester identifier index', query: { qindex: 'patron', query: 'seedp3' }, expected: (r) => r.patronId === 'seedp3' },
  {
    name: 'requester name index, surname and given name',
    query: { qindex: 'requester_name', query: 'Seedwell, Ada' },
    expected: (r) => r.surname === 'Seedwell' && r.givenName === 'Ada',
  },
  { name: 'all fields, item barcode', query: { qindex: '', query: 'seedbc4' }, expected: (r) => r.barcode === 'seedbc4' },
  { name: 'item ID index', query: { qindex: 'item_id', query: 'seeditem5' }, expected: (r) => r.itemId === 'seeditem5' },
  { name: 'item barcode index', query: { qindex: 'barcode', query: 'seedbc6' }, expected: (r) => r.barcode === 'seedbc6' },
  { name: 'call number index', query: { qindex: 'call_number', query: 'seedcn7' }, expected: (r) => r.callNumber === 'seedcn7' },
  {
    name: 'CQL index',
    query: { qindex: 'cql', query: `title="${marker}" and service_level="Express"` },
    expected: (r) => r.serviceLevel === 'Express',
  },
  { name: 'supply: title search for the marker', app: 'supply', query: {}, expected: () => true },
  {
    name: 'supply: requester',
    app: 'supply',
    query: { filters: ['requester.ISIL:US-MOCK'] },
    expected: (r) => r.peer === 'ISIL:US-MOCK',
  },
  { name: 'supply: unread messages', app: 'supply', query: { filters: ['hasUnread.true'] }, expected: (r) => r.unread },
];

test('each filter and search index finds the seeded requests it should', async ({ page }) => {
  test.setTimeout(180_000);
  await visitRoute(page, listUrl('request', {}), found);
  for (const { name, app = 'request', query, expected } of cases) {
    await test.step(name, async () => {
      const rows = seeded(app).filter(expected);
      expect(rows.length, 'the seed gives this case at least one match').toBeGreaterThan(0);
      await page.goto(listUrl(app, query));
      await expectListed(page, rows, expect.soft);
    });
  }
});

// URL cases cannot detect missing or added controls; compare their inventories.
// In this pane, true/false filters identify checkboxes.
test('the search bar and filter pane offer what the matrix covers', async ({ page }) => {
  await visitRoute(page, listUrl('request', {}), found);
  const indexes = [...new Set(cases.map((c) => c.query.qindex ?? 'title'))].sort();
  const offered = await page.locator('select[name="qindex"] option')
    .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
  expect(offered.sort()).toEqual(indexes);

  const checkboxFilters = [...new Set(cases.flatMap((c) => c.query.filters ?? []))]
    .filter((f) => /\.(true|false)$/.test(f)).sort();
  // Stripes ids its checkboxes clickable-filter-<group>-<label>.
  const checkboxes = await page.locator('[data-test-checkbox-filter-data-option]')
    .evaluateAll((boxes) => boxes.map((b) => `${b.id.split('-')[2]}.${b.getAttribute('data-test-checkbox-filter-data-option')}`));
  expect(checkboxes.sort()).toEqual(checkboxFilters);
});

// Keep the list mounted between steps to exercise state transitions.
test('the controls build the searches on a mounted list', async ({ page }) => {
  test.setTimeout(120_000);
  const rows = seeded('request');
  const titles = rows.map((r) => r.title).sort();
  const expectRows = async (expected: (r: SeedRequest) => boolean) => {
    const matched = rows.filter(expected);
    expect(matched.length, 'the seed gives this step at least one match').toBeGreaterThan(0);
    await expectListed(page, matched);
    return matched;
  };
  const inFebruary = (r: SeedRequest) => between(day(r, 'createdAt'), '2025-02-01', '2025-02-28');
  const sentOrShipped = (r: SeedRequest) => r.state === 'SENT' || r.state === 'SHIPPED';

  await visitRoute(page, listUrl('request', { sort: 'title' }), found);
  await expectFound(page, rows.length);

  await test.step('a date range through its inputs includes the end date', async () => {
    expect(rows.some((r) => day(r, 'createdAt') === '2025-02-28')).toBe(true);
    await page.locator('#accordion-toggle-button-createdAt').click();
    const created = page.locator('#createdAt');
    await created.getByLabel('From').fill('2025-02-01');
    await created.getByLabel('To', { exact: true }).fill('2025-02-28');
    await created.getByRole('button', { name: 'Apply' }).click();
    await expectParams(page, { filters: ['createdAt.created_at>=2025-02-01 and created_at<=2025-02-28'] });
    await expectRows(inFebruary);
  });

  await test.step('a group clears from its accordion header', async () => {
    await page.getByRole('button', { name: 'Clear selected Date created filters' }).click();
    await expectParams(page, { filters: null });
    await expectFound(page, rows.length);
  });

  await test.step('a checkbox ticked on the second page shows the first page of its results', async () => {
    await page.locator('[data-test-next-paging-button]').click();
    await expect(firstRow(page)).toContainText(titles[pageSize]);
    await page.getByLabel('Hide completed').check();
    await expectParams(page, { filters: ['terminal.false'] });
    const open = await expectRows((r) => !r.terminal);
    await expect(firstRow(page)).toContainText(open.map((r) => r.title).sort()[0]);
  });

  await test.step('two states from the multi-selection', async () => {
    await pick(page, 'state', 'Sent');
    await expectParams(page, { filters: ['terminal.false', 'state.SENT'] });
    await pick(page, 'state', 'Shipped');
    await expectParams(page, { filters: ['terminal.false', 'state.SENT', 'state.SHIPPED'] });
    await expectRows(sentOrShipped);
  });

  await test.step('a second group narrows the first', async () => {
    await pick(page, 'serviceType', 'Loan');
    await expectParams(page, { filters: ['terminal.false', 'state.SENT', 'state.SHIPPED', 'serviceType.Loan'] });
    await expectRows((r) => sentOrShipped(r) && r.serviceType === 'Loan');
  });

  await test.step('the search bar changes index and term and keeps the filters', async () => {
    await page.locator('select[name="qindex"]').selectOption('author');
    await page.locator('#patron-request-search').fill('Okonkwo');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expectParams(page, { qindex: 'author', query: 'Okonkwo', filters: ['terminal.false', 'state.SENT', 'state.SHIPPED', 'serviceType.Loan'] });
    await expectRows((r) => sentOrShipped(r) && r.serviceType === 'Loan' && r.author === 'Okonkwo');
  });

  await test.step('reset all returns to the default search', async () => {
    await page.locator('#clickable-reset-all').click();
    await expectParams(page, { filters: ['terminal.false'], sort: '-dateCreated', qindex: null, query: null });
    await expect(page.locator('#patron-request-search')).toHaveValue('');
    await expect(page.locator('select[name="qindex"]')).toHaveValue('');
    await expect(page.getByLabel('Hide completed')).toBeChecked();
    await expect(page.locator('#state').getByRole('combobox')).toHaveValue('');
  });
});

// Seeded peers may lack directory names, so match options by symbol.
test('the supplier typeahead narrows to a peer with its count and filters by it', async ({ page }) => {
  const count = seeded('request').filter((r) => r.peer === 'ISIL:US-MOCK').length;
  await visitRoute(page, listUrl('request', {}), found);
  const supplier = page.locator('#supplier');
  await supplier.getByRole('combobox').fill('ISIL:US-M');
  const options = supplier.getByRole('option');
  await expect(options).toHaveCount(1);
  await expect(options).toContainText('ISIL:US-MOCK');
  await expect(options).toContainText(String(count));
  await options.click();
  await page.waitForURL(/filters=supplier\.ISIL%3AUS-MOCK/);
  await expectFound(page, count);
});

test('the seeded requests page and sort across the 100-row page', async ({ page }) => {
  const titles = seeded('request').map((r) => r.title).sort();
  const errors = collectPageErrors(page);
  await visitRoute(page, listUrl('request', { sort: 'title' }), found);
  await expectFound(page, titles.length);
  await expect(firstRow(page)).toContainText(titles[0]);
  await checkA11y(page, 'request list with seeded rows');

  await page.locator('[data-test-next-paging-button]').click();
  await expect(firstRow(page)).toContainText(titles[100]);
  await expect(page.locator('[data-row-inner]')).toHaveCount(titles.length - 100);
  await page.locator('[data-test-prev-paging-button]').click();
  await expect(firstRow(page)).toContainText(titles[0]);

  // Only the button handles sorting, not its surrounding header cell.
  await page.getByRole('button', { name: 'Title', exact: true }).click();
  await page.waitForURL(/sort=-title/);
  await expect(firstRow(page)).toContainText(titles[titles.length - 1]);
  await expect(errorBoundary(page)).toHaveCount(0);
  expectNoPageErrors(errors);
});

test('an imported request shows its flags in the list and opens', async ({ page }) => {
  const r = seeded('request')[0];
  expect([r.needsAttention, r.unread, r.hasCost]).toEqual([true, true, true]);
  const errors = collectPageErrors(page);
  await visitRoute(page, listUrl('request', { qindex: 'requester_req_id', query: r.requesterRequestId }), found);
  await expectFound(page, 1);
  const row = firstRow(page);
  await expect(row.getByRole('img', { name: 'Needs attention 1 unread message Has cost' })).toBeVisible();
  await row.getByText(r.title, { exact: true }).click();
  await expect(page.getByRole('heading', { name: r.title })).toBeVisible();
  await checkA11y(page, 'imported request');
  await expect(errorBoundary(page)).toHaveCount(0);
  expectNoPageErrors(errors);
});
