import React from 'react';
import { Route, useLocation } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { act, fireEvent, screen, within, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import AppNameContext from '../AppNameContext';
import PatronRequestsRoute from './PatronRequestsRoute';
import { buildPatronRequestsCql } from '../util/buildPatronRequestsCql';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => mockOkapi));
jest.mock('../util/buildPatronRequestsCql', () => {
  const actual = jest.requireActual('../util/buildPatronRequestsCql');
  return {
    ...actual,
    buildPatronRequestsCql: jest.fn(actual.buildPatronRequestsCql),
  };
});

const requestRow = {
  id: 'pr-1',
  requesterRequestId: 'REQ-101',
  state: 'REQ_VALIDATED',
  supplierSymbol: 'ISIL:SUP',
  createdAt: '2026-01-05T12:00:00Z',
  updatedAt: '2026-01-06T12:00:00Z',
  items: [
    { id: 'item-1', barcode: 'pr-1', itemId: '30001000123456' },
    { id: 'item-2', barcode: 'pr-1', itemId: '30001000654321' },
  ],
  illRequest: {
    bibliographicInfo: { title: 'fixture-title' },
    serviceInfo: { serviceType: 'Loan' },
    patronInfo: { surname: 'fixture-surname', givenName: 'fixture-given' },
  },
};

const responses = {
  'broker/patron_requests': { items: [requestRow], about: { count: 1 } },
  'broker/state_model/models/default': {
    states: [{ name: 'REQ_VALIDATED', display: 'Validated', side: 'REQUESTER' }],
  },
};

// An explicit history, so tests can assert where the route navigates and whether it
// pushed or replaced.
const renderList = (initialEntries = ['/requests'], appName = 'request') => {
  const history = createMemoryHistory({ initialEntries });
  return {
    history,
    ...renderWithRs(
      <AppNameContext.Provider value={appName}>
        <Route
          path="/requests"
          render={() => (
            <>
              <PatronRequestsRoute appName={appName} />
              <LocationSearch />
            </>
          )}
        />
      </AppNameContext.Provider>,
      { initialEntries, history }
    ),
  };
};

const LocationSearch = () => {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
};

const patronRequestUrls = () => mockOkapi.calledUrls()
  .map((url) => decodeURIComponent(url))
  .filter((u) => u.startsWith('broker/patron_requests'));

// The paged list query, as distinct from the peer facet's own options query, which shares
// the same pathname. Identified by what the options query is rather than by PER_PAGE:
// limit=0 (aggregates only, no rows) is inherent to it, whereas the page size is a tunable.
const listQueryUrls = () => patronRequestUrls().filter((u) => !u.includes('limit=0'));

describe('PatronRequestsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOkapi.setResponses(responses);
  });

  it('normalizes a clean landing to the default hide-complete filter and date sort', async () => {
    const { history } = renderList();
    // The clean URL is normalized before anything queries against it.
    await waitFor(() => expect(history.location.search)
      .toBe('?filters=terminal.false&sort=-dateCreated'));
    await waitFor(() => {
      expect(patronRequestUrls().some((u) => u.includes('terminal_state'))).toBe(true);
    });
    expect(patronRequestUrls().every((u) => u.includes('cql='))).toBe(true);
    expect(history.length).toBe(1); // replaced, not pushed
    // The peer facet's options query shares this pathname, so pick out the list query.
    const url = listQueryUrls().at(-1);
    expect(url).toContain('side=borrowing');
    // terminal filter maps to terminal_state with the broker-specific single '='
    // operator (filters2cql's default would be '==').
    expect(url).toContain('terminal_state="false"');
    expect(url).not.toContain('terminal_state==');
    // dateCreated sort maps to the broker's created_at column, descending.
    expect(url).toContain('created_at/sort.descending');
  });

  it('renders a request row across its columns', async () => {
    renderList(['/requests?sort=-dateCreated']);
    const hrid = await screen.findByText('REQ-101');
    const row = hrid.closest('[role="row"], tr');
    expect(row).not.toBeNull();
    const r = within(row);
    expect(r.getByText('fixture-title')).toBeInTheDocument();
    expect(r.getByText('ISIL:SUP')).toBeInTheDocument();
    expect(r.getByText('ui-rs.patronrequests.itemBarcode.multiVolume')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.patronrequests.found')).toBeInTheDocument();
  });

  it('shows the supplier barcode of a lone item on the borrowing side', async () => {
    mockOkapi.setResponses({
      ...responses,
      'broker/patron_requests': {
        items: [{ ...requestRow, items: [requestRow.items[0]] }],
        about: { count: 1 },
      },
    });
    renderList(['/requests?sort=-dateCreated']);
    const hrid = await screen.findByText('REQ-101');
    const r = within(hrid.closest('[role="row"], tr'));
    expect(r.getByText('30001000123456')).toBeInTheDocument();
    // Not the placeholder barcode the requester stores in its own copy of the item.
    expect(r.queryByText('pr-1')).not.toBeInTheDocument();
  });

  it('shows the item barcode of a lone item on the lending side', async () => {
    mockOkapi.setResponses({
      ...responses,
      'broker/patron_requests': {
        items: [{ ...requestRow, items: [{ id: 'item-1', barcode: '30001000123456' }] }],
        about: { count: 1 },
      },
    });
    renderList(['/requests?sort=-dateCreated'], 'supply');
    const hrid = await screen.findByText('REQ-101');
    const r = within(hrid.closest('[role="row"], tr'));
    expect(r.getByText('30001000123456')).toBeInTheDocument();
  });

  it('keeps the selected qindex in the URL and search dropdown after submit', async () => {
    renderList(['/requests?sort=-dateCreated']);
    await screen.findByText('REQ-101');

    fireEvent.change(document.querySelector('select[name="qindex"]'), {
      target: { name: 'qindex', value: 'title' },
    });
    fireEvent.change(document.querySelector('input[name="query"]'), {
      target: { name: 'query', value: 'fixture-title' },
    });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('qindex=title');
    });
    expect(document.querySelector('select[name="qindex"]').value).toBe('title');
    expect(patronRequestUrls().at(-1)).toContain('title="fixture-title"');
  });

  // No filter-interaction test here on purpose: behaviour #1 already proves a real
  // `filters=` param flows through buildPatronRequestsCql to the broker cql, and
  // the remaining half — a filter *control* writing the URL param — is Stripes'
  // CheckboxFilter/SearchAndSortQuery behaviour, not ours. Driving it also floods
  // the test with act() warnings from the navigate-and-refetch, for little signal.
});

// ---- Peer facet filter ---------------------------------------------------------

// A patron_requests body carrying facets only when the request asked for them, as the broker
// does. Responses are matched on pathname alone (see okapiKyMock — the query string holds
// generated CQL that tests should not have to spell out), so without this the mock would keep
// serving an option list even if the list query stopped requesting one, and every test below
// would pass on a facet it never asked for.
const facetBody = (url, facetValues) => ({
  items: [],
  about: {
    count: 0,
    ...(url.includes('facets=supplier_symbol')
      ? { facets: [{ name: 'supplier_symbol', values: facetValues }] }
      : {}),
  },
});

const peerResponses = (facetValues) => ({
  'broker/patron_requests': (url) => facetBody(url, facetValues),
  'broker/state_model/models/default': { states: [] },
});

// Open the supplier peer accordion and return its combobox filter input. The input only
// appears once the base facet has loaded (until then a spinner shows), so wait for it.
const peerInputSelector = 'input[aria-labelledby="accordion-toggle-button-supplier"]';
const openPeerFilter = async () => {
  fireEvent.click(await screen.findByText('ui-rs.filter.supplier'));
  await waitFor(() => expect(document.querySelector(peerInputSelector)).not.toBeNull());
  const input = document.querySelector(peerInputSelector);
  fireEvent.focus(input);
  fireEvent.click(input);
  return input;
};

// Visible option rows within the peer menu (scoped to its listbox so the qindex
// <select>'s own options are not picked up).
const peerMenuOptions = (input) => {
  const menu = document.getElementById(input.getAttribute('aria-controls'));
  return menu ? [...menu.querySelectorAll('[role="option"]')].map((o) => o.textContent) : [];
};

// URLSearchParams encodes CQL spaces as '+', which decodeURIComponent leaves intact;
// normalise them back to spaces so clause assertions read naturally.
const peerCqlUrls = () => patronRequestUrls().map((u) => u.replace(/\+/g, ' '));

describe('PatronRequestsRoute peer facet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('settles after the async filter reports an unchanged empty term', async () => {
    mockOkapi.setResponses(peerResponses([
      { value: 'ISIL:US-A', label: 'Alpha Library', count: 5 },
    ]));
    renderList(['/requests?sort=-dateCreated']);
    const input = await openPeerFilter();
    await waitFor(() => expect(peerMenuOptions(input).length).toBe(1));

    // MultiSelection reports its initial empty term after a 300 ms debounce; once that
    // callback has landed, the route must stop re-rendering.
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    const settledRenderCount = buildPatronRequestsCql.mock.calls.length;
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));

    expect(buildPatronRequestsCql).toHaveBeenCalledTimes(settledRenderCount);
  });

  it('selecting an option filters on the symbol and shows the combined-label chip', async () => {
    mockOkapi.setResponses(peerResponses([
      { value: 'ISIL:US-A', label: 'Alpha Library', count: 5 },
    ]));
    renderList(['/requests?sort=-dateCreated']);
    const input = await openPeerFilter();
    await waitFor(() => expect(peerMenuOptions(input).length).toBe(1));
    const menu = document.getElementById(input.getAttribute('aria-controls'));
    fireEvent.click(menu.querySelector('[role="option"]'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('supplier.ISIL');
    });
    await waitFor(() => {
      expect(patronRequestUrls().some((u) => u.includes('supplier_symbol="ISIL:US-A"'))).toBe(true);
    });
    // Chip reuses the combined label (no count / dropdown layout).
    expect(screen.getByText('Alpha Library (ISIL:US-A)')).toBeInTheDocument();
  });

  it('keeps a selected peer that the facet response omits', async () => {
    // The facet only ever returns the server's top-N, so a selected symbol ranked below
    // the cut has no row to resolve against. Its chip must still render (from the symbol
    // alone) rather than silently vanishing from the filter.
    mockOkapi.setResponses(peerResponses([
      { value: 'ISIL:US-OTHER', label: 'Other Library', count: 5 },
    ]));
    renderList(['/requests?sort=-dateCreated&filters=supplier.ISIL%3AUS-A']);
    // Scoped to the chip in the selected-values list: the symbol also appears on the
    // appended row in the option menu, which is not what this is about.
    await waitFor(() => {
      expect(document.querySelector('.valueChipValue')).toHaveTextContent('(ISIL:US-A)');
    });
    expect(patronRequestUrls().some((u) => u.includes('supplier_symbol="ISIL:US-A"'))).toBe(true);
  });

  it('typing issues a narrowed server request over name and symbol', async () => {
    const hundred = Array.from({ length: 100 }, (_, i) => ({ value: `ISIL:US-${i}`, label: `Lib ${i}`, count: 100 - i }));
    mockOkapi.setResponses({
      'broker/patron_requests': (url) => facetBody(
        url,
        url.includes('supplier_name') ? hundred.slice(0, 3) : hundred,
      ),
      'broker/state_model/models/default': { states: [] },
    });
    renderList(['/requests?sort=-dateCreated']);
    const input = await openPeerFilter();
    await waitFor(() => expect(peerMenuOptions(input).length).toBe(100));

    fireEvent.change(input, { target: { value: 'smi' } });
    await waitFor(() => {
      expect(peerCqlUrls().some((u) => (
        u.includes('(supplier_name = "smi*" or supplier_symbol = "smi*")')
      ))).toBe(true);
    }, { timeout: 2000 });

    // Each keystroke re-queries: the term is part of the options query's key, so a narrowing
    // that happens to fit in the rows already on screen still asks the server.
    fireEvent.change(input, { target: { value: 'smit' } });
    await waitFor(() => {
      expect(peerCqlUrls().some((u) => u.includes('"smit*"'))).toBe(true);
    }, { timeout: 2000 });
  });

  // The filter subtree is keyed on location.search, so any filter change remounts the input
  // empty. The term must go with it: the remounted MultiSelection does eventually report ''
  // through its debounced filter callback, but a term that outlives its input drives a
  // narrowed request in the meantime, off text nothing on screen shows.
  it('drops the typeahead term when a filter change remounts the input', async () => {
    const peers = [
      { value: 'ISIL:US-A', label: 'Alpha Library', count: 5 },
      { value: 'ISIL:US-B', label: 'Beta Library', count: 2 },
    ];
    mockOkapi.setResponses({
      'broker/patron_requests': (url) => facetBody(
        url,
        url.includes('supplier_name') ? peers.slice(0, 1) : peers,
      ),
      'broker/state_model/models/default': { states: [] },
    });
    renderList(['/requests?sort=-dateCreated']);
    const input = await openPeerFilter();
    await waitFor(() => expect(peerMenuOptions(input).length).toBe(2));

    fireEvent.change(input, { target: { value: 'alp' } });
    await waitFor(() => expect(peerCqlUrls().some((u) => u.includes('"alp*"'))).toBe(true), { timeout: 2000 });

    // CheckboxFilter builds its id from the option's translated label, so match on the prefix.
    fireEvent.click(document.querySelector('input[id^="clickable-filter-needsAttention-"]'));
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('needsAttention.true');
    });
    // The new filter's option list is fetched unnarrowed...
    await waitFor(() => expect(peerCqlUrls().some((u) => (
      u.includes('needs_attention') && !u.includes('alp*')
    ))).toBe(true));
    // ...and the dead term never reaches the server alongside it. The wait has to be
    // inside act: it spans the remounted input's 300 ms debounce, and everything that
    // callback sets off (peer term, refetch, MCL and filter re-render) lands within it.
    await act(() => new Promise((r) => setTimeout(r, 400)));
    expect(peerCqlUrls().some((u) => u.includes('needs_attention') && u.includes('alp*'))).toBe(false);
    expect(document.querySelector(peerInputSelector)).toHaveValue('');
  });
});
