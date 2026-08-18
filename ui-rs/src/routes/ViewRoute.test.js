import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import ViewRoute from './ViewRoute';
import AppNameContext from '../AppNameContext';

// `mock` prefix lets the hoisted jest.mock factory below reference this.
const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);

// react-syntax-highlighter ships ESM jest can't parse and only renders event
// payloads (EventLogDetails), which an empty-history fixture never reaches.
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

// A fully populated borrowing request, so one render can cover the whole details
// composition. Absence cases use `sparseFixture` below.
const requestFixture = {
  id: 'pr-1',
  state: 'VALIDATED',
  stateModel: 'returnables',
  side: 'borrowing',
  createdAt: '2026-01-05T12:00:00Z',
  updatedAt: '2026-01-05T13:00:00Z',
  requesterRequestId: 'REQ-101',
  requesterSymbol: 'ISIL:REQ',
  supplierSymbol: 'ISIL:SUP',
  illRequest: {
    bibliographicInfo: {
      title: 'fixture-title',
      author: 'fixture-author',
      edition: 'fixture-edition',
      titleOfComponent: 'fixture-article-title',
      authorOfComponent: 'fixture-article-author',
      volume: 'vol-7',
      issue: 'iss-3',
      pagesRequested: '11-22',
      bibliographicItemId: [
        { bibliographicItemIdentifier: 'fixture-isbn', bibliographicItemIdentifierCode: { '#text': 'ISBN' } },
        { bibliographicItemIdentifier: 'fixture-issn', bibliographicItemIdentifierCode: { '#text': 'ISSN' } },
      ],
      bibliographicRecordId: [
        { bibliographicRecordIdentifier: 'fixture-oclc', bibliographicRecordIdentifierCode: { '#text': 'OCLC' } },
      ],
    },
    publicationInfo: { publisher: 'fixture-publisher', publicationDate: '1998' },
    serviceInfo: { note: 'fixture-patron-note', needBeforeDate: '2026-02-01T00:00:00Z' },
    patronInfo: {
      patronId: 'patron-9',
      surname: 'fixture-surname',
      givenName: 'fixture-given',
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
};

// Only the fields the broker always returns, for asserting that sections with
// nothing to show stay out of the pane.
const sparseFixture = {
  ...requestFixture,
  illRequest: { bibliographicInfo: { title: 'fixture-title' }, serviceInfo: {} },
};

const responses = {
  'broker/patron_requests/pr-1': requestFixture,
  'broker/patron_requests/pr-1/actions': { actions: [] },
  'broker/patron_requests/pr-1/notifications': { items: [] },
  'broker/patron_requests/pr-1/events': { items: [] },
  // VALIDATED is intentionally not editable.
  'broker/state_model/models/returnables': {
    states: [
      { side: 'REQUESTER', name: 'NEEDS_REVIEW', editable: true },
      { side: 'REQUESTER', name: 'VALIDATED' },
    ],
  },
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

  it('renders the details composition from a fully populated request', async () => {
    renderViewRoute();

    // Route renders null until the request query resolves.
    expect(await screen.findByText('Request REQ-101')).toBeInTheDocument();
    expect(screen.getByText('fixture-title · ISIL:REQ → ISIL:SUP')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.flow.flow')).toBeInTheDocument();
    expect(screen.getByText('ui-rs.flow.details')).toBeInTheDocument();

    // Request info. The full id appears in both the card header and the fullId
    // field, so allow more than one match.
    expect(screen.getAllByText('pr-1').length).toBeGreaterThan(0);
    expect(screen.getByText('fixture-patron-note')).toBeInTheDocument();
    // Need-by comes from serviceInfo.needBeforeDate, not the old flat neededBy.
    expect(screen.getByText('2/1/2026')).toBeInTheDocument();

    // Requesting user, with the id linked through patronURL.
    expect(screen.getByText('fixture-surname')).toBeInTheDocument();
    expect(screen.getByText('fixture-given')).toBeInTheDocument();
    expect(screen.getByText('patron@example.org')).toBeInTheDocument();
    expect(screen.getByText('patron-9').closest('a'))
      .toHaveAttribute('href', expect.stringContaining('patron-9'));

    // Citation metadata, headed by the synthesized citation string.
    expect(screen.getByText('fixture-author (1998): fixture-title')).toBeInTheDocument();
    [
      'fixture-title', 'fixture-author', 'fixture-edition', 'fixture-article-title',
      'fixture-article-author', 'fixture-publisher', 'vol-7', 'iss-3', '11-22', '1998',
      // Identifiers come out of their coded arrays, not from flat fields.
      'fixture-isbn', 'fixture-issn', 'fixture-oclc',
    ].forEach(value => expect(screen.getByText(value)).toBeInTheDocument());

    expect(screen.getByText('ui-rs.eventHistory.empty')).toBeInTheDocument();
  });

  it('omits sections the request has no data for', async () => {
    mockOkapi.setResponses({ ...responses, 'broker/patron_requests/pr-1': sparseFixture });
    renderViewRoute();
    await screen.findByText('Request REQ-101');

    expect(screen.queryByText('ui-rs.information.heading.requester')).toBeNull();
  });

  it('hides the requesting user on the lending side', async () => {
    mockOkapi.setResponses({
      ...responses,
      'broker/patron_requests/pr-1': { ...requestFixture, side: 'lending' },
    });
    renderViewRoute();
    await screen.findByText('Request REQ-101');

    expect(screen.queryByText('fixture-surname')).toBeNull();
    expect(screen.queryByText('patron-9')).toBeNull();
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

  it('terminates the request and closes the modal when manual close is confirmed', async () => {
    mockOkapi.post.mockResolvedValueOnce({});
    renderWithRs(
      <CalloutContext.Provider value={{ sendCallout }}>
        <Route path="/requests/:id" component={ViewRoute} />
      </CalloutContext.Provider>,
      { initialEntries: ['/requests/pr-1/details?sort=-dateCreated'], messages: messagesWithActions }
    );
    await screen.findByText('Request REQ-101');

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.manualClose' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'ui-rs.manualClose.confirm.confirmLabel' }));

    // Confirmation hits the terminate endpoint and the modal closes on success.
    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith('broker/patron_requests/pr-1/terminate'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  const renderInRequestApp = (request) => {
    mockOkapi.setResponses({ ...responses, 'broker/patron_requests/pr-1': request });
    return renderWithRs(
      <AppNameContext.Provider value="request">
        <Route path="/requests/:id" component={ViewRoute} />
      </AppNameContext.Provider>,
      { initialEntries: ['/requests/pr-1/details?sort=-dateCreated'], messages: messagesWithActions }
    );
  };

  it('offers an Edit action linking to the edit route when the state is editable', async () => {
    renderInRequestApp({ ...requestFixture, state: 'NEEDS_REVIEW', stateModel: 'returnables' });
    await screen.findByText('Request REQ-101');

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    const editItem = screen.getByRole('button', { name: 'ui-rs.editPatronRequest' });
    expect(editItem).toBeInTheDocument();
    expect(editItem.closest('a')).toHaveAttribute('href', expect.stringContaining('/requests/pr-1/edit'));
  });

  it('hides the Edit action when the state is not editable', async () => {
    renderInRequestApp({ ...requestFixture, state: 'VALIDATED', stateModel: 'returnables' });
    await screen.findByText('Request REQ-101');

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.queryByRole('button', { name: 'ui-rs.editPatronRequest' })).not.toBeInTheDocument();
  });
});
