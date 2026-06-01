import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import ViewRoute from './ViewRoute';

// `mock` prefix lets the hoisted jest.mock factory below reference this.
const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);

// react-syntax-highlighter ships ESM jest can't parse and only renders event
// payloads (EventHistoryDetails), which an empty-history fixture never reaches.
// Stub both entry points at the leaf to remove the externality without losing
// coverage this route test cares about.
jest.mock('react-syntax-highlighter', () => ({
  LightAsync: ({ children }) => require('react').createElement('pre', null, children),
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/hljs', () => ({ github: { hljs: {} } }));

// Pass a getter, not mockOkapi itself: this factory is hoisted above the
// `const mockOkapi = ...` line, so the value is only available at render time.
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

// @projectreshare/stripes-reshare is intentionally left real so useOkapiQuery,
// useCloseDirect, useRequestAside, and DirectLink are exercised genuinely.

const requestFixture = {
  id: 'pr-1',
  state: 'REQ_VALIDATED',
  timestamp: '2026-01-05T12:00:00Z',
  requesterRequestId: 'REQ-101',
  requesterSymbol: 'ISIL:REQ',
  supplierSymbol: 'ISIL:SUP',
  illRequest: {
    bibliographicInfo: { title: 'fixture-title' },
    serviceInfo: { note: 'fixture-patron-note' },
    deliveryInfo: { pickupLocation: 'fixture-pickup' },
    requestIdentifiers: [
      { identifierType: 'fixture-id-type', identifier: 'fixture-id-value' },
    ],
  },
};

const responses = {
  'broker/patron_requests/pr-1': requestFixture,
  'broker/patron_requests/pr-1/actions': { actions: [] },
  'broker/patron_requests/pr-1/notifications': { items: [] },
  'broker/patron_requests/pr-1/events': { items: [] },
};

// One targeted message so the pane title's {id} interpolation is assertable;
// every other key falls back to its id.
const messages = { 'ui-rs.view.title': 'Request {id}' };
const messagesWithActions = {
  ...messages,
  'stripes-components.paneMenuActionsToggleLabel': 'Actions',
};

const renderViewRoute = () => renderWithRs(
  <Route path="/requests/:id" component={ViewRoute} />,
  { initialEntries: ['/requests/pr-1/details?sort=-dateCreated'], messages }
);

describe('ViewRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOkapi.setResponses(responses);
  });

  it('loads the request and renders the details route composition', async () => {
    renderViewRoute();

    // Route renders null until the request query resolves.
    expect(await screen.findByText('Request REQ-101')).toBeInTheDocument();

    // Subheading composed from title, requester, and supplier.
    expect(screen.getByText('fixture-title · ISIL:REQ → ISIL:SUP')).toBeInTheDocument();

    // Both tabs of the flow/details switch are present.
    expect(screen.getByText('ui-rs.flow.flow')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.flow.details')).toBeInTheDocument();

    // RequestInfo detail values render from the fixture. The full id appears in
    // both the card header and the fullId field, so allow more than one match.
    expect(screen.getAllByText('pr-1').length).toBeGreaterThan(0);
    expect(screen.getByText('fixture-pickup')).toBeInTheDocument();
    expect(screen.getByText('fixture-patron-note')).toBeInTheDocument();
    expect(screen.getByText('fixture-id-type: fixture-id-value')).toBeInTheDocument();

    // Event history with no events shows the empty state.
    expect(screen.getByText('ui-rs.eventHistory.empty')).toBeInTheDocument();
  });

  it('opens the edit internal note modal and PUTs the updated note', async () => {
    mockOkapi.setResponses({
      ...responses,
      'broker/patron_requests/pr-1': { ...requestFixture, internalNote: 'existing note' },
    });
    renderWithRs(
      <CalloutContext.Provider value={{ sendCallout }}>
        <Route path="/requests/:id" component={ViewRoute} />
      </CalloutContext.Provider>,
      { initialEntries: ['/requests/pr-1/details?sort=-dateCreated'], messages: messagesWithActions }
    );
    await screen.findByText('Request REQ-101');

    // Open the pane action menu and click the internal note item
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.information.internalNote' }));

    // Modal pre-populates with the existing note
    await waitFor(() => expect(document.getElementById('edit-internal-note')).not.toBeNull());
    expect(document.getElementById('edit-internal-note')).toHaveValue('existing note');

    // Change the note and save
    fireEvent.change(document.getElementById('edit-internal-note'), { target: { value: 'updated note' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.save' }));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalledTimes(1));
    const [path, opts] = mockOkapi.put.mock.calls[0];
    expect(path).toBe('broker/patron_requests/pr-1/internal_note');
    expect(opts.json).toEqual({ internalNote: 'updated note' });
  });

  it('fetches request, actions, notifications, and events — and nothing else', async () => {
    renderViewRoute();
    await screen.findByText('Request REQ-101');

    const requestedPaths = new Set(mockOkapi.mock.calls.map(([path]) => path));
    expect(requestedPaths).toEqual(new Set(Object.keys(responses)));
  });
});
