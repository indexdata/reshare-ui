import React from 'react';
import {
  fireEvent,
  screen,
  within,
} from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { useNotificationList } from '../components/chat/useNotifications';
import FlowRoute from './FlowRoute';

const mockPerformAction = jest.fn(() => Promise.resolve());

jest.mock('../components/chat/useNotifications', () => ({
  useNotificationList: jest.fn(),
}));

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  usePerformAction: () => mockPerformAction,
  useIsActionPending: () => false,
}));

// FlowRoute receives request/actions as props, so it never queries; only
// useStripes (reshare flags) and CalloutContext are touched here.
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => ({})));

const conditionNotifications = [
  {
    id: 'accepted-row',
    kind: 'condition',
    fromSymbol: 'ISIL:SUP',
    condition: 'libraryuseonly',
    receipt: 'ACCEPTED',
    note: 'accepted-row-note',
    createdAt: '2026-01-04T12:00:00Z',
  },
  {
    id: 'rejected-row',
    kind: 'condition',
    fromSymbol: 'ISIL:SUP',
    cost: 12.5,
    currency: 'USD',
    receipt: 'REJECTED',
    note: 'rejected-row-note',
    createdAt: '2026-01-03T12:00:00Z',
  },
  {
    id: 'pending-row',
    kind: 'condition',
    fromSymbol: 'ISIL:SUP',
    condition: 'noreproduction',
    cost: 4,
    currency: 'EUR',
    receipt: 'SEEN',
    note: 'pending-row-note',
    createdAt: '2026-01-02T12:00:00Z',
  },
  {
    id: 'prefixed-note-row',
    kind: 'condition',
    fromSymbol: 'ISIL:SUP',
    condition: 'libraryuseonly',
    receipt: 'ACCEPTED',
    note: '#ReShareAddLoanCondition# stripped-text',
    createdAt: '2026-01-01T12:00:00Z',
  },
  {
    id: 'other-supplier-row',
    kind: 'condition',
    fromSymbol: 'ISIL:OTHER',
    condition: 'libraryuseonly',
    receipt: 'ACCEPTED',
    note: 'other-supplier-row-note',
    createdAt: '2026-01-06T12:00:00Z',
  },
  {
    id: 'non-condition',
    kind: 'note',
    note: 'general-chat-note',
    createdAt: '2026-01-05T12:00:00Z',
  },
];

const requestFixture = {
  id: 'pr-1',
  state: 'REQ_VALIDATED',
  timestamp: '2026-01-05T12:00:00Z',
  requesterRequestId: 'rrid-1',
  requesterSymbol: 'ISIL:REQ',
  supplierSymbol: 'ISIL:SUP',
  illRequest: {
    bibliographicInfo: {
      title: 'Test Title',
      supplierUniqueRecordId: 'instance-1',
    },
    serviceInfo: {
      note: 'patron-service-note',
    },
  },
};

const actionsFixture = [
  { name: 'someAction', primary: false, parameters: [] },
];

const messages = {
  'stripes-reshare.actions.someAction.success': 'stripes-reshare.actions.someAction.success',
  'stripes-reshare.actions.someAction.error': 'stripes-reshare.actions.someAction.error',
};

const renderFlowRoute = (request = requestFixture) => renderWithRs(
  <FlowRoute request={request} actions={actionsFixture} />,
  { initialEntries: [`/requests/${request.id}/flow`], messages }
);

const rowContaining = (text) => {
  const row = screen.getByText(text).closest('[role="row"], tr');
  expect(row).not.toBeNull();
  return within(row);
};

describe('FlowRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationList.mockReturnValue({ data: { items: conditionNotifications } });
  });

  it('renders flow sections with title, shared-index link, and condition data', () => {
    renderFlowRoute();

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('ISIL:REQ')).toBeInTheDocument();
    expect(screen.getByText('ISIL:SUP')).toBeInTheDocument();

    const siLink = screen.getByText('ui-rs.flow.info.viewInSharedIndex').closest('a');
    expect(siLink).toHaveAttribute('href', 'https://shared-index.example/inventory/view/instance-1');

    expect(screen.getByText('ui-rs.flow.loanConditions.status')).toBeInTheDocument();

    const acceptedRow = rowContaining('accepted-row-note');
    expect(acceptedRow.getByText('ui-rs.flow.loanConditions.status.accepted')).toBeInTheDocument();

    const rejectedRow = rowContaining('rejected-row-note');
    expect(rejectedRow.getByText('ui-rs.flow.loanConditions.status.rejected')).toBeInTheDocument();
    expect(rejectedRow.getByText('12.5 USD')).toBeInTheDocument();

    const pendingRow = rowContaining('pending-row-note');
    expect(pendingRow.getByText('ui-rs.flow.loanConditions.status.pending')).toBeInTheDocument();
    expect(pendingRow.getByText('4 EUR')).toBeInTheDocument();

    const prefixRow = rowContaining('stripped-text');
    expect(prefixRow.queryByText(/#ReShareAddLoanCondition#/)).toBeNull();

    expect(screen.queryByText('general-chat-note')).toBeNull();
    expect(screen.queryByText('other-supplier-row-note')).toBeNull();
  });

  it('links to the previous and next request when the request is a revision', () => {
    renderFlowRoute({
      ...requestFixture,
      prevReqId: 'pr-prev',
      nextReqId: 'pr-next',
    });

    const prevLink = screen.getByText('ui-rs.flow.info.precededByLink').closest('a');
    expect(prevLink).toHaveAttribute('href', '/requests/pr-prev/flow');

    const nextLink = screen.getByText('ui-rs.flow.info.succeededByLink').closest('a');
    expect(nextLink).toHaveAttribute('href', '/requests/pr-next/flow');
  });

  it('shows no revision links when prevReqId/nextReqId are absent', () => {
    renderFlowRoute();

    expect(screen.queryByText('ui-rs.flow.info.precededByLink')).toBeNull();
    expect(screen.queryByText('ui-rs.flow.info.succeededByLink')).toBeNull();
  });

  it('invokes performAction when the generic action button is clicked', () => {
    renderFlowRoute();

    const button = screen.getByText('stripes-reshare.actions.someAction').closest('button');
    expect(button).not.toBeNull();

    fireEvent.click(button);

    expect(mockPerformAction).toHaveBeenCalledTimes(1);
    expect(mockPerformAction).toHaveBeenCalledWith(
      'someAction',
      {},
      {
        success: 'stripes-reshare.actions.someAction.success',
        error: 'stripes-reshare.actions.someAction.error',
      }
    );
  });
});
