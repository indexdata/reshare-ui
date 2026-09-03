import { screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '../../../../test/quietQueryLog';
import Suppliers from './Suppliers';

// Jest permits hoisted mock factories to reference variables prefixed with mock.
const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

jest.mock('@folio/stripes/core', () => require('../../../../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const skipped = {
  id: 'ls-1',
  supplierSymbol: 'ISIL:SUP-A',
  ordinal: 0,
  supplierStatus: 'skipped',
  lastStatus: 'Unfilled',
  supplierRequestID: 'SUP-9',
};

const selected = {
  id: 'ls-2',
  supplierSymbol: 'ISIL:SUP-B',
  ordinal: 1,
  supplierStatus: 'selected',
  lastStatus: 'WillSupply',
};

const renderSection = (record = { id: 'pr-1', side: 'borrowing', requesterRequestId: 'REQ-101' }) => (
  renderWithRs(<Suppliers record={record} />)
);

describe('Suppliers', () => {
  quietQueryLog(/directory entry not found/);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the rota in order, naming each supplier from the directory', async () => {
    mockOkapi.setResponses({
      'broker/located_suppliers': { items: [skipped, selected] },
      'directory/entries/by-symbol/ISIL:SUP-A': { id: 'ent-a', name: 'Library A' },
      'directory/entries/by-symbol/ISIL:SUP-B': { id: 'ent-b', name: 'Library B' },
    });
    renderSection();

    expect(await screen.findByText('1. Library A')).toBeInTheDocument();
    expect(screen.getByText('2. Library B')).toBeInTheDocument();

    // The mock keys responses on pathname alone, so the scoping is only proven here.
    expect(mockOkapi).toHaveBeenCalledWith('broker/located_suppliers', expect.objectContaining({
      searchParams: { requester_req_id: 'REQ-101' },
    }));

    // Both render through their defaultMessage, the raw code, until the key lands.
    expect(screen.getByText('skipped')).toBeInTheDocument();
    expect(screen.getByText('Unfilled')).toBeInTheDocument();
    expect(screen.getByText('SUP-9')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: 'ui-rs.viewInDirectory' });
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      '/directory/entries/ent-a',
      '/directory/entries/ent-b',
    ]);
  });

  it('falls back to the bare symbol, with no link, when the directory has no entry', async () => {
    mockOkapi.setResponses({
      'broker/located_suppliers': { items: [skipped] },
      'directory/entries/by-symbol/ISIL:SUP-A': () => {
        throw Object.assign(new Error('directory entry not found'), { status: 404 });
      },
    });
    renderSection();

    expect(await screen.findByText('1. ISIL:SUP-A')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ui-rs.viewInDirectory' })).not.toBeInTheDocument();
  });

  it('shows the empty state when nothing was located, without a wasted fetch', async () => {
    const { unmount } = renderSection({ id: 'pr-1', side: 'borrowing' });
    expect(screen.getByText('ui-rs.suppliers.empty')).toBeInTheDocument();
    expect(mockOkapi).not.toHaveBeenCalled();
    unmount();

    mockOkapi.setResponses({ 'broker/located_suppliers': { items: [] } });
    renderSection();
    expect(await screen.findByText('ui-rs.suppliers.empty')).toBeInTheDocument();
  });

  it('renders nothing on a lending request, without asking the broker', () => {
    renderSection({ id: 'pr-1', side: 'lending', requesterRequestId: 'REQ-101' });

    expect(screen.queryByText('ui-rs.information.heading.suppliers')).not.toBeInTheDocument();
    expect(mockOkapi).not.toHaveBeenCalled();
  });
});
