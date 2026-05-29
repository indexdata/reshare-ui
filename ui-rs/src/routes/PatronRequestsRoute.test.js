import React from 'react';
import { Route, useLocation } from 'react-router-dom';
import { fireEvent, screen, within, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import AppNameContext from '../AppNameContext';
import PatronRequestsRoute from './PatronRequestsRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const requestRow = {
  id: 'pr-1',
  requesterRequestId: 'REQ-101',
  state: 'REQ_VALIDATED',
  supplierSymbol: 'ISIL:SUP',
  createdAt: '2026-01-05T12:00:00Z',
  updatedAt: '2026-01-06T12:00:00Z',
  illRequest: {
    bibliographicInfo: { title: 'fixture-title' },
    serviceInfo: { serviceType: 'Loan' },
    patronInfo: { surname: 'fixture-surname', givenName: 'fixture-given' },
  },
};

const responses = {
  'broker/patron_requests': { items: [requestRow], about: { count: 1 } },
  'broker/state_model/models/returnables': {
    states: [{ name: 'REQ_VALIDATED', display: 'Validated', side: 'REQUESTER' }],
  },
};

const renderList = (initialEntries = ['/requests']) => renderWithRs(
  <AppNameContext.Provider value="request">
    <Route path="/requests" render={() => (
      <>
        <PatronRequestsRoute appName="request" />
        <LocationSearch />
      </>
    )}
    />
  </AppNameContext.Provider>,
  { initialEntries }
);

const LocationSearch = () => {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
};

const patronRequestUrls = () => mockOkapi.mock.calls
  .map(([url]) => decodeURIComponent(url))
  .filter((u) => u.startsWith('broker/patron_requests'));

describe('PatronRequestsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOkapi.setResponses(responses);
  });

  it('applies the default hide-complete filter and date sort on a clean landing', async () => {
    renderList(['/requests']);
    // The useEffect pushes ?filters=terminal.false&sort=-dateCreated on the empty
    // URL, then the route refires the query with the defaults in the cql.
    await waitFor(() => {
      expect(patronRequestUrls().some((u) => u.includes('terminal_state'))).toBe(true);
    });
    const url = patronRequestUrls().at(-1);
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
    expect(screen.getByText('ui-rs.patronrequests.found')).toBeInTheDocument();
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
