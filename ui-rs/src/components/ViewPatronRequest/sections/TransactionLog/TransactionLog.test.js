import React, { useState } from 'react';
import { fireEvent, screen } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../../../../test/renderWithRs';
import { makeOkapiKyMock } from '../../../../test/okapiKyMock';
import TransactionLog from './TransactionLog';

// Jest permits hoisted mock factories to reference variables prefixed with mock.
const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../../../../test/iconMock').default);

// Jest cannot parse react-syntax-highlighter's ESM entry points.
jest.mock('react-syntax-highlighter', () => ({
  LightAsync: ({ children }) => require('react').createElement('pre', null, children),
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/hljs', () => ({ github: { hljs: {} } }));

jest.mock('@folio/stripes/core', () => require('../../../../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const transactionFixture = {
  id: 'txn-1',
  timestamp: '2026-01-05T12:00:00Z',
  requesterSymbol: 'ISIL:REQ',
  supplierSymbol: 'ISIL:SUP',
  requesterRequestID: 'REQ-101',
  supplierRequestID: 'SUP-9',
  lastRequesterAction: 'Request',
  prevRequesterAction: '',
  lastSupplierStatus: 'ExpectToSupply',
  prevSupplierStatus: '',
};

const eventFixture = {
  id: 'ev-1',
  timestamp: '2026-01-05T12:01:00Z',
  eventName: 'request-received',
  eventType: 'NOTICE',
  eventStatus: 'SUCCESS',
  eventData: {},
  resultData: {},
};

const renderSection = (record = { id: 'pr-1', side: 'borrowing', requesterRequestId: 'REQ-101' }) => (
  renderWithRs(<TransactionLog record={record} />)
);

const openSection = () => (
  fireEvent.click(screen.getByRole('button', { name: 'ui-rs.information.heading.transactionLog' }))
);

describe('TransactionLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches lazily on open, then shows the transaction summary and events', async () => {
    mockOkapi.setResponses({
      'broker/ill_transactions': { items: [transactionFixture] },
      'broker/ill_transactions/txn-1/events': { items: [eventFixture] },
    });
    renderSection();

    expect(mockOkapi).not.toHaveBeenCalled();

    openSection();

    expect(document.querySelector('#transaction-log-card')).toBeNull();
    expect(screen.queryByText('ui-rs.transactionLog.noTransaction')).not.toBeInTheDocument();

    expect(await screen.findByText('ISIL:SUP')).toBeInTheDocument();
    expect(screen.getByText('SUP-9')).toBeInTheDocument();
    expect(screen.getByText('ExpectToSupply')).toBeInTheDocument();

    expect(await screen.findByText('request-received')).toBeInTheDocument();
  });

  it('shows the empty state when the transaction has no events', async () => {
    mockOkapi.setResponses({
      'broker/ill_transactions': { items: [transactionFixture] },
      'broker/ill_transactions/txn-1/events': { items: [] },
    });
    renderSection();
    openSection();

    expect(await screen.findByText('ui-rs.transactionLog.empty')).toBeInTheDocument();
  });

  it('shows the no-transaction state, distinct from "no events", without wasted fetches', async () => {
    const { unmount } = renderSection({ id: 'pr-1', side: 'borrowing' });
    openSection();
    expect(screen.getByText('ui-rs.transactionLog.noTransaction')).toBeInTheDocument();
    expect(mockOkapi).not.toHaveBeenCalled();
    unmount();

    mockOkapi.setResponses({ 'broker/ill_transactions': { items: [] } });
    renderSection();
    openSection();
    expect(await screen.findByText('ui-rs.transactionLog.noTransaction')).toBeInTheDocument();
    expect(screen.queryByText('ui-rs.transactionLog.empty')).not.toBeInTheDocument();
    expect(mockOkapi.mock.calls.map(([p]) => p)).toEqual(['broker/ill_transactions']);
  });

  it('renders nothing on a lending request, where the broker never returns the transaction', () => {
    renderSection({ id: 'pr-1', side: 'lending', requesterRequestId: 'REQ-101' });

    expect(screen.queryByText('ui-rs.information.heading.transactionLog')).not.toBeInTheDocument();
    expect(mockOkapi).not.toHaveBeenCalled();
  });

  it('shows the right transaction when the viewed request changes (keyed per record)', async () => {
    mockOkapi.setResponses({
      'broker/ill_transactions': { items: [{ ...transactionFixture, supplierSymbol: 'ISIL:SUP-A' }] },
      'broker/ill_transactions/txn-1/events': { items: [] },
    });
    const Harness = () => {
      const [rid, setRid] = useState('REQ-101');
      return (
        <>
          <button type="button" onClick={() => setRid('REQ-202')}>switch</button>
          <TransactionLog record={{ id: 'pr-1', side: 'borrowing', requesterRequestId: rid }} />
        </>
      );
    };
    renderWithRs(<Harness />);
    openSection();
    expect(await screen.findByText('ISIL:SUP-A')).toBeInTheDocument();

    mockOkapi.setResponses({
      'broker/ill_transactions': { items: [{ ...transactionFixture, supplierSymbol: 'ISIL:SUP-B' }] },
      'broker/ill_transactions/txn-1/events': { items: [] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(await screen.findByText('ISIL:SUP-B')).toBeInTheDocument();
    expect(screen.queryByText('ISIL:SUP-A')).not.toBeInTheDocument();
  });
});
