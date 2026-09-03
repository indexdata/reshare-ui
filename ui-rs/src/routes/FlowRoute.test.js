import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { useNotificationList } from '../components/chat/useNotifications';
import FlowRoute from './FlowRoute';

const mockPerformAction = jest.fn(() => Promise.resolve());

jest.mock('../components/chat/useNotifications', () => ({
  useNotificationList: jest.fn(),
}));

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);

jest.mock('@projectreshare/stripes-reshare', () => ({
  ...jest.requireActual('@projectreshare/stripes-reshare'),
  usePerformAction: () => mockPerformAction,
  useIsActionPending: () => false,
}));

// FlowRoute receives request/actions as props, so it never queries; only
// useStripes (reshare flags) and CalloutContext are touched here.
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => ({})));

const { CalloutContext } = require('@folio/stripes/core');

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
    id: 'accepted-cost-row',
    kind: 'condition',
    fromSymbol: 'ISIL:SUP',
    cost: 9,
    currency: 'USD',
    receipt: 'ACCEPTED',
    note: 'accepted-cost-note',
    createdAt: '2026-01-07T12:00:00Z',
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
  side: 'borrowing',
  updatedAt: '2026-01-05T12:00:00Z',
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
      serviceType: 'Loan',
      serviceLevel: { '#text': 'Express' },
    },
    billingInfo: {
      maximumCosts: { monetaryValue: '25.00', currencyCode: { '#text': 'USD' } },
    },
    patronInfo: {
      patronId: 'patron-9',
      surname: 'flow-surname',
      givenName: 'flow-given',
      address: [
        {
          electronicAddress: {
            electronicAddressType: { '#text': 'Email' },
            electronicAddressData: 'patron@example.org',
          },
        },
      ],
    },
  },
  illResponse: {
    statusInfo: { status: 'Loaned', dueDate: '2026-03-01T00:00:00Z' },
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

    expect(screen.getByText('Loan')).toBeInTheDocument();
    expect(screen.getByText('Express')).toBeInTheDocument();
    expect(screen.getByText('25.00 USD')).toBeInTheDocument();

    // Agreed cost is the accepted priced condition; the table also holds a
    // rejected 12.5 USD and a pending 4 EUR, so this proves the receipt filter.
    expect(screen.getByText('ui-rs.information.cost').parentElement.textContent).toContain('9 USD');

    // Requesting user, with the id linked through patronURL.
    expect(screen.getByText('flow-surname')).toBeInTheDocument();
    expect(screen.getByText('patron@example.org')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.flow.info.patronLink').closest('a'))
      .toHaveAttribute('href', expect.stringContaining('patron-9'));
    expect(screen.getByText('ui-rs.flow.info.patronQuery').closest('a'))
      .toHaveAttribute('href', expect.stringContaining('qindex=patron'));

    // Due date comes from the supplier's last ISO 18626 response.
    expect(screen.getByText('3/1/2026')).toBeInTheDocument();
  });

  it('hides the requesting user on the lending side', () => {
    renderFlowRoute({ ...requestFixture, side: 'lending' });

    expect(screen.queryByText('flow-surname')).toBeNull();
    expect(screen.queryByText('ui-rs.flow.sections.requestingUser')).toBeNull();
  });

  const copyRequestFixture = {
    ...requestFixture,
    illRequest: {
      ...requestFixture.illRequest,
      serviceInfo: { ...requestFixture.illRequest.serviceInfo, serviceType: 'Copy' },
      bibliographicInfo: {
        ...requestFixture.illRequest.bibliographicInfo,
        titleOfComponent: 'article-title',
        authorOfComponent: 'article-author',
        volume: 'vol-7',
        issue: 'iss-3',
        pagesRequested: '11-22',
      },
      publicationInfo: { publicationDate: '1998' },
    },
  };

  it('shows the copy citation section for a copy request', () => {
    renderFlowRoute(copyRequestFixture);

    expect(screen.getByText('ui-rs.flow.sections.citation')).toBeInTheDocument();
    ['article-title', 'article-author', 'iss-3', '11-22', '1998']
      .forEach(value => expect(screen.getByText(value)).toBeInTheDocument());
  });

  it('hides the copy citation section for a loan request', () => {
    renderFlowRoute({
      ...copyRequestFixture,
      illRequest: {
        ...copyRequestFixture.illRequest,
        serviceInfo: { serviceType: 'Loan' },
      },
    });

    expect(screen.queryByText('ui-rs.flow.sections.citation')).toBeNull();
    expect(screen.queryByText('article-title')).toBeNull();
  });

  // The broker sends a delivered copy as sentVia=URL with the URL in itemId; ISO 18626
  // has no element of its own for it.
  const deliveredFixture = (itemId) => ({
    ...copyRequestFixture,
    illResponse: {
      statusInfo: { status: 'CopyCompleted' },
      deliveryInfo: { itemId, sentVia: { '#text': 'URL' } },
    },
  });

  // jsdom has no clipboard; the stub is a global, so it must not outlive the test.
  afterEach(() => { delete window.navigator.clipboard; });

  it('links the delivered copy and copies its URL to the clipboard', async () => {
    const url = 'https://documents.example.org/copy/2';
    const writeText = jest.fn(() => Promise.resolve());
    const sendCallout = jest.fn();
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const request = deliveredFixture(url);
    renderWithRs(
      <CalloutContext.Provider value={{ sendCallout }}>
        <FlowRoute request={request} actions={actionsFixture} />
      </CalloutContext.Provider>,
      { initialEntries: [`/requests/${request.id}/flow`], messages }
    );

    const link = screen.getByText(url);
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');

    fireEvent.click(screen.getByLabelText('ui-rs.flow.info.copyDeliveryUrl'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
  });

  it('does not link a delivered URL with an unsafe scheme', () => {
    renderFlowRoute(deliveredFixture('data:text/html,<h1>not a document</h1>'));

    expect(screen.queryByText('ui-rs.flow.sections.deliveryInfo')).toBeNull();
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
