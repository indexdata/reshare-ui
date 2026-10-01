import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { act, fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '#/test/quietQueryLog';
import RerequestRoute from './RerequestRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('#/test/textAreaMock').default);

jest.mock('@folio/stripes/core', () => require('#/test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

// A cancelled Retry successor: carries all the protocol identity a revision drops.
const cancelledRequest = (overrides = {}) => ({
  id: 'req-1',
  state: 'CANCELLED',
  side: 'borrowing',
  stateModel: 'default',
  prevReqId: 'req-0',
  internalNote: 'Staff only note',
  requesterPickupLocationId: 'branch-e',
  illRequest: {
    header: {
      requestingAgencyRequestId: 'req-1',
      supplyingAgencyRequestId: 'sup-9',
      timestamp: '2026-09-01T00:00:00Z',
    },
    patronInfo: { patronId: 'p1', givenName: 'Ada', surname: 'Lovelace' },
    serviceInfo: {
      serviceType: 'Loan',
      serviceLevel: { '#text': 'Express' },
      requestType: 'Retry',
      requestingAgencyPreviousRequestId: 'req-0',
    },
    bibliographicInfo: {
      title: 'Original Title',
      author: 'Some Author',
      bibliographicItemId: [
        { bibliographicItemIdentifier: '9781234567890', bibliographicItemIdentifierCode: { '#text': 'ISBN' } },
        { bibliographicItemIdentifier: 'M-2306-7118-7', bibliographicItemIdentifierCode: { '#text': 'ISMN' } },
      ],
      bibliographicRecordId: [
        { bibliographicRecordIdentifier: 'lccn-9', bibliographicRecordIdentifierCode: { '#text': 'LCCN' } },
      ],
      supplierUniqueRecordId: 'sys-42',
    },
    publicationInfo: { publisher: 'Pub Co' },
  },
  ...overrides,
});

const rerequestable = { actions: [{ name: 'rerequest', parameters: ['noop'] }] };
const noActions = { actions: [] };

// Reassigned mid-test to model a refresh or another session's change.
let broker;

const branches = [
  { id: 'branch-e', name: 'East Branch', type: 'Branch', illConfig: { isPickupLocation: true } },
  { id: 'branch-w', name: 'West Branch', type: 'Branch', illConfig: { isPickupLocation: true } },
];
const tiers = [
  { id: 't-exp-loan', name: 'Express loan', type: 'loan', level: 'express', cost: 0 },
  { id: 't-std-loan', name: 'Standard loan', type: 'loan', level: 'standard', cost: 15 },
];
const tieredEntries = { items: [{ id: 'inst-1', name: 'Our Library', type: 'Institution', tiers }, ...branches] };

const renderRerequest = ({ history, owned = { items: branches } } = {}) => {
  mockOkapi.setResponses({
    'broker/patron_requests/req-1': () => broker.request,
    'broker/patron_requests/req-1/actions': () => broker.actions,
    'directory/entries/owned': owned,
  });
  const memoryHistory = history ?? createMemoryHistory({ initialEntries: ['/requests/req-1/rerequest?foo=bar'] });
  const rendered = renderWithRs(
    <CalloutContext.Provider value={{ sendCallout }}>
      <Route path="/requests/:id/rerequest" component={RerequestRoute} />
    </CalloutContext.Provider>,
    { history: memoryHistory }
  );
  return { ...rendered, history: memoryHistory };
};

const respond = (body) => ({ json: async () => body });

const deferred = () => {
  let resolve;
  let done = false;
  const promise = new Promise(r => { resolve = r; }).finally(() => { done = true; });
  return { promise, resolve, settled: () => done };
};

const brokerPosts = ({ action = { outcome: 'success' }, created = { id: 'req-2' } } = {}) => {
  mockOkapi.post.mockImplementation(async (path) => respond(path.endsWith('/action') ? action : created));
};

const postPaths = () => mockOkapi.post.mock.calls.map(([path]) => path);
const createdPayload = () => mockOkapi.post.mock.calls.find(([path]) => path === 'broker/patron_requests')[1].json;

const fieldByName = (name) => Array.from(document.querySelectorAll('[name]'))
  .find(el => el.getAttribute('name') === name);
const setField = (name, value) => fireEvent.change(fieldByName(name), { target: { value } });
const submitButton = () => document.querySelector('button[type="submit"]');
const cancelButton = () => document.querySelector('#clickable-cancel-request-form');
const loaded = () => waitFor(() => expect(fieldByName('bibliographicInfo.title')?.value).toBe('Original Title'));

const itemIdFor = (json, code) => json.illRequest.bibliographicInfo.bibliographicItemId
  ?.find(i => i.bibliographicItemIdentifierCode?.['#text'] === code)?.bibliographicItemIdentifier;
const recordIdFor = (json, code) => json.illRequest.bibliographicInfo.bibliographicRecordId
  ?.find(i => i.bibliographicRecordIdentifierCode?.['#text'] === code)?.bibliographicRecordIdentifier;

describe('RerequestRoute', () => {
  quietQueryLog(/^(Boom|Duplicate|Offline)$/); // failure tests reject requests on purpose

  beforeEach(() => {
    jest.clearAllMocks();
    broker = { request: cancelledRequest(), actions: rerequestable };
    brokerPosts();
  });

  it('prefills from the original and submits it unchanged as a new, linked request', async () => {
    const { history, queryClient } = renderRerequest();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await loaded();

    expect(screen.getAllByText('ui-rs.rerequestPatronRequest').length).toBeGreaterThan(0);
    expect(fieldByName('patronInfo.patronId').value).toBe('p1');
    expect(fieldByName('identifiers.ISBN').value).toBe('9781234567890');
    expect(fieldByName('systemInstanceIdentifier').value).toBe('sys-42');
    expect(fieldByName('requesterPickupLocationId').value).toBe('branch-e');
    expect(fieldByName('internalNote').value).toBe('Staff only note');
    expect(fieldByName('publicationInfo.publisher').value).toBe('Pub Co');
    expect(submitButton()).toBeEnabled();

    fireEvent.click(submitButton());

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    expect(history.location.search).toBe('?foo=bar');

    expect(postPaths()).toEqual(['broker/patron_requests/req-1/action', 'broker/patron_requests']);
    expect(mockOkapi.post.mock.calls[0][1].json).toEqual({ action: 'rerequest', actionParams: { noop: true } });

    const json = createdPayload();
    expect(json.prevReqId).toBe('req-1');
    expect(json.patron).toBe('p1');
    expect(json.internalNote).toBe('Staff only note');
    expect(json.requesterPickupLocationId).toBe('branch-e');
    expect(json.illRequest).not.toHaveProperty('header');
    expect(json.illRequest.serviceInfo).toEqual({
      serviceType: 'Loan',
      serviceLevel: { '#text': 'Express' },
      requestType: 'New',
    });
    expect(json.illRequest.bibliographicInfo.title).toBe('Original Title');
    expect(json.illRequest.bibliographicInfo.supplierUniqueRecordId).toBe('sys-42');
    expect(itemIdFor(json, 'ISBN')).toBe('9781234567890');
    expect(itemIdFor(json, 'ISMN')).toBe('M-2306-7118-7');
    expect(recordIdFor(json, 'LCCN')).toBe('lccn-9');
    expect(json.illRequest.publicationInfo).toEqual({ publisher: 'Pub Co' });
    ['id', 'nextReqId', 'state', 'side', 'stateModel', 'supplierSymbol', 'items'].forEach(key => {
      expect(json).not.toHaveProperty(key);
    });

    expect(invalidate.mock.calls.map(([key]) => key)).toEqual(expect.arrayContaining([
      'broker/patron_requests/req-1',
      'broker/patron_requests/req-1/actions',
      'broker/patron_requests/req-1/events',
      'broker/patron_requests',
    ]));
    expect(sendCallout).not.toHaveBeenCalled();
  });

  it('sends edits and omits a cleared internal note, without inventing a service level', async () => {
    broker.request = cancelledRequest();
    delete broker.request.illRequest.serviceInfo.serviceLevel;
    const { history } = renderRerequest();
    await loaded();

    setField('bibliographicInfo.title', 'Corrected Title');
    setField('identifiers.ISBN', '');
    setField('internalNote', '');
    fireEvent.click(submitButton());

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    const json = createdPayload();
    expect(json.illRequest.bibliographicInfo.title).toBe('Corrected Title');
    expect(itemIdFor(json, 'ISBN')).toBeUndefined();
    expect(itemIdFor(json, 'ISMN')).toBe('M-2306-7118-7');
    expect(json).not.toHaveProperty('internalNote');
    expect(json.illRequest.serviceInfo).not.toHaveProperty('serviceLevel');
  });

  it('preselects the tier the original was made under', async () => {
    const { history } = renderRerequest({ owned: tieredEntries });
    await loaded();
    expect(fieldByName('tier').value).toBe('t-exp-loan');

    fireEvent.click(submitButton());

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    const json = createdPayload();
    expect(json.illRequest.serviceInfo.serviceLevel).toEqual({ '#text': 'Express' });
    expect(json.illRequest).not.toHaveProperty('billingInfo');
  });

  it('requires a tier when the original was made without one', async () => {
    broker.request = cancelledRequest();
    delete broker.request.illRequest.serviceInfo.serviceLevel;
    const { history } = renderRerequest({ owned: tieredEntries });
    await loaded();
    expect(fieldByName('tier').value).toBe('');

    fireEvent.click(submitButton());
    await waitFor(() => expect(fieldByName('tier')).toHaveAttribute('aria-invalid', 'true'));
    expect(mockOkapi.post).not.toHaveBeenCalled();

    setField('tier', 't-std-loan');
    fireEvent.click(submitButton());

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    expect(postPaths()).toEqual(['broker/patron_requests/req-1/action', 'broker/patron_requests']);
    const json = createdPayload();
    expect(json.illRequest.serviceInfo).toEqual({
      serviceType: 'Loan',
      serviceLevel: { '#text': 'Standard' },
      requestType: 'New',
    });
    expect(json.illRequest.billingInfo.maximumCosts.monetaryValue).toBe('15.00');
  });

  it('returns to the original without any mutation when rerequest is not offered', async () => {
    broker.actions = noActions;
    const { history } = renderRerequest();

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-1'));
    expect(history.location.search).toBe('?foo=bar');
    expect(submitButton()).toBeNull();
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('cancels back to the original request without any mutation', async () => {
    const { history } = renderRerequest();
    await loaded();

    fireEvent.click(document.querySelector('#clickable-cancel-request-form'));

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-1'));
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('creates nothing when the action does not succeed, and keeps the draft guarded', async () => {
    brokerPosts({ action: { outcome: 'failure', message: 'Not allowed' } });
    const confirm = jest.fn((message, callback) => callback(false));
    const history = createMemoryHistory({
      initialEntries: ['/requests/req-1/rerequest?foo=bar'],
      getUserConfirmation: confirm,
    });
    renderRerequest({ history });
    await loaded();

    setField('bibliographicInfo.title', 'Corrected Title');
    fireEvent.click(submitButton());

    await waitFor(() => expect(sendCallout).toHaveBeenCalledTimes(1));
    expect(postPaths()).toEqual(['broker/patron_requests/req-1/action']);
    expect(fieldByName('bibliographicInfo.title').value).toBe('Corrected Title');

    fireEvent.click(document.querySelector('#clickable-cancel-request-form'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(history.location.pathname).toBe('/requests/req-1/rerequest');
  });

  it('reports a failed creation and allows a retry', async () => {
    mockOkapi.post
      .mockImplementationOnce(async () => respond({ outcome: 'success' }))
      .mockImplementationOnce(async () => { throw new Error('Boom'); });
    const { history } = renderRerequest();
    await loaded();

    setField('bibliographicInfo.title', 'Corrected Title');
    fireEvent.click(submitButton());

    await waitFor(() => expect(sendCallout).toHaveBeenCalledTimes(1));
    const { message } = sendCallout.mock.calls[0][0];
    expect(message.props.label.props.id).toBe('ui-rs.rerequest.createError');
    expect(message.props.value).toBe('Boom');
    expect(fieldByName('bibliographicInfo.title').value).toBe('Corrected Title');
    await waitFor(() => expect(submitButton()).toBeEnabled());

    fireEvent.click(submitButton());

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    expect(postPaths()).toEqual([
      'broker/patron_requests/req-1/action',
      'broker/patron_requests',
      'broker/patron_requests/req-1/action',
      'broker/patron_requests',
    ]);
  });

  it('links to a successor created elsewhere and blocks resubmission', async () => {
    mockOkapi.post
      .mockImplementationOnce(async () => respond({ outcome: 'success' }))
      .mockImplementationOnce(async () => {
        broker = { request: cancelledRequest({ nextReqId: 'req-3' }), actions: noActions };
        throw new Error('Duplicate');
      });
    renderRerequest();
    await loaded();
    setField('bibliographicInfo.title', 'Corrected Title');

    fireEvent.click(submitButton());

    const link = (await screen.findByText('ui-rs.flow.info.succeededByLink')).closest('a');
    expect(link).toHaveAttribute('href', '/requests/req-3?foo=bar');
    expect(screen.getByText('ui-rs.rerequest.unavailable')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(sendCallout).toHaveBeenCalledTimes(1);
    expect(fieldByName('bibliographicInfo.title').value).toBe('Corrected Title');
  });

  it('locks the form while submitting and refreshes only once the request is created', async () => {
    const noop = deferred();
    let invalidatedBeforeCreate;
    const { history, queryClient } = renderRerequest();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    mockOkapi.post
      .mockImplementationOnce(() => noop.promise)
      .mockImplementationOnce(async () => {
        invalidatedBeforeCreate = invalidate.mock.calls.length;
        return respond({ id: 'req-2' });
      });
    await loaded();

    fireEvent.click(submitButton());
    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(cancelButton()).toBeDisabled();
    fireEvent.click(submitButton());
    fireEvent.submit(document.querySelector('form'));
    expect(mockOkapi.post).toHaveBeenCalledTimes(1);

    noop.resolve(respond({ outcome: 'success' }));
    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-2'));
    expect(postPaths()).toEqual(['broker/patron_requests/req-1/action', 'broker/patron_requests']);
    expect(invalidatedBeforeCreate).toBe(0);
  });

  it('does not redirect a page staff moved to while the creation was in flight', async () => {
    const create = deferred();
    mockOkapi.post
      .mockImplementationOnce(async () => respond({ outcome: 'success' }))
      .mockImplementationOnce(() => create.promise);
    const { history } = renderRerequest();
    await loaded();

    fireEvent.click(submitButton());
    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(2));
    act(() => history.push('/elsewhere'));

    create.resolve(respond({ id: 'req-2' }));
    await waitFor(() => expect(create.settled()).toBe(true));
    expect(history.location.pathname).toBe('/elsewhere');
  });

  it('keeps the draft when refreshing the original fails', async () => {
    mockOkapi.post
      .mockImplementationOnce(async () => respond({ outcome: 'success' }))
      .mockImplementationOnce(async () => {
        broker = {
          get request() { throw new Error('Offline'); },
          get actions() { throw new Error('Offline'); },
        };
        throw new Error('Boom');
      });
    renderRerequest();
    await loaded();
    setField('bibliographicInfo.title', 'Corrected Title');

    fireEvent.click(submitButton());

    await waitFor(() => expect(sendCallout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(fieldByName('bibliographicInfo.title').value).toBe('Corrected Title');
  });
});
