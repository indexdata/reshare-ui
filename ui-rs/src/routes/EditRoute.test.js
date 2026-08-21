import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { quietQueryLog } from '../test/quietQueryLog';
import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import EditRoute from './EditRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);

jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

// An editable request in the broker response shape.
const editableRequest = (overrides = {}) => ({
  id: 'req-1',
  state: 'NEEDS_REVIEW',
  stateModel: 'default',
  internalNote: 'Staff only note',
  illRequest: {
    patronInfo: { patronId: 'p1', givenName: 'Ada', surname: 'Lovelace' },
    serviceInfo: { serviceType: 'Loan' },
    bibliographicInfo: {
      title: 'Original Title',
      author: 'Some Author',
      bibliographicItemId: [
        { bibliographicItemIdentifier: '9781234567890', bibliographicItemIdentifierCode: { '#text': 'ISBN' } },
        { bibliographicItemIdentifier: 'M-2306-7118-7', bibliographicItemIdentifierCode: { '#text': 'ISMN' } },
      ],
      bibliographicRecordId: [
        { bibliographicRecordIdentifier: 'oclc-1', bibliographicRecordIdentifierCode: { '#text': 'OCLC' } },
        { bibliographicRecordIdentifier: 'lccn-9', bibliographicRecordIdentifierCode: { '#text': 'LCCN' } },
      ],
      supplierUniqueRecordId: 'sys-42',
    },
  },
  ...overrides,
});

const itemIdFor = (json, code) => json.illRequest.bibliographicInfo.bibliographicItemId
  ?.find(i => i.bibliographicItemIdentifierCode?.['#text'] === code)?.bibliographicItemIdentifier;
const recordIdFor = (json, code) => json.illRequest.bibliographicInfo.bibliographicRecordId
  ?.find(i => i.bibliographicRecordIdentifierCode?.['#text'] === code)?.bibliographicRecordIdentifier;

const defaultModel = {
  states: [
    { side: 'REQUESTER', name: 'NEEDS_REVIEW', editable: true },
    { side: 'REQUESTER', name: 'SENT' },
  ],
};

const renderEdit = ({ request = editableRequest(), history } = {}) => {
  mockOkapi.setResponses({
    'broker/patron_requests/req-1': request,
    'broker/state_model/models/default': defaultModel,
  });
  return renderWithRs(
    <CalloutContext.Provider value={{ sendCallout }}>
      <Route path="/requests/:id/edit" component={EditRoute} />
    </CalloutContext.Provider>,
    { history: history ?? createMemoryHistory({ initialEntries: ['/requests/req-1/edit?foo=bar'] }) }
  );
};

const fieldByName = (name) => Array.from(document.querySelectorAll('[name]'))
  .find(el => el.getAttribute('name') === name);

const setField = (name, value) => fireEvent.change(fieldByName(name), { target: { value } });

describe('EditRoute', () => {
  quietQueryLog(/^Boom$/); // the failure test rejects the PUT on purpose

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefills from the existing request and PUTs the edited record', async () => {
    const history = createMemoryHistory({ initialEntries: ['/requests/req-1/edit?foo=bar'] });
    renderEdit({ history });

    await waitFor(() => expect(fieldByName('bibliographicInfo.title')?.value).toBe('Original Title'));
    expect(fieldByName('identifiers.ISBN').value).toBe('9781234567890');
    expect(fieldByName('systemInstanceIdentifier').value).toBe('sys-42');

    setField('bibliographicInfo.title', 'Edited Title');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalledTimes(1));

    const [path, opts] = mockOkapi.put.mock.calls[0];
    expect(path).toBe('broker/patron_requests/req-1');
    expect(opts.json.illRequest.bibliographicInfo.title).toBe('Edited Title');
    expect(itemIdFor(opts.json, 'ISBN')).toBe('9781234567890');
    expect(itemIdFor(opts.json, 'ISMN')).toBe('M-2306-7118-7');
    expect(recordIdFor(opts.json, 'OCLC')).toBe('oclc-1');
    expect(recordIdFor(opts.json, 'LCCN')).toBe('lccn-9');
    expect(opts.json.internalNote).toBe('Staff only note');

    await waitFor(() => expect(history.location).toMatchObject({
      pathname: '/requests/req-1',
      search: '?foo=bar',
    }));
    expect(sendCallout).not.toHaveBeenCalled();
  });

  it('clearing a form identifier drops only that code, keeping the rest', async () => {
    renderEdit();
    await waitFor(() => expect(fieldByName('identifiers.ISBN')?.value).toBe('9781234567890'));

    setField('identifiers.ISBN', '');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalledTimes(1));
    const [, opts] = mockOkapi.put.mock.calls[0];
    expect(itemIdFor(opts.json, 'ISBN')).toBeUndefined();
    expect(itemIdFor(opts.json, 'ISMN')).toBe('M-2306-7118-7');
  });

  it('clears the internal note with an explicit empty string when emptied', async () => {
    renderEdit();
    await waitFor(() => expect(fieldByName('internalNote')?.value).toBe('Staff only note'));

    setField('internalNote', '');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalledTimes(1));
    expect(mockOkapi.put.mock.calls[0][1].json.internalNote).toBe('');
  });

  it('redirects away without a PUT when the request is not editable', async () => {
    const history = createMemoryHistory({ initialEntries: ['/requests/req-1/edit?foo=bar'] });
    renderEdit({ request: editableRequest({ state: 'SENT' }), history });

    await waitFor(() => expect(history.location.pathname).toBe('/requests/req-1'));
    expect(document.querySelector('button[type="submit"]')).toBeNull();
    expect(mockOkapi.put).not.toHaveBeenCalled();
  });

  it('surfaces a failed PUT as an error callout and keeps the form mounted', async () => {
    mockOkapi.put.mockRejectedValueOnce(new Error('Boom'));
    renderEdit();

    await waitFor(() => expect(fieldByName('bibliographicInfo.title')?.value).toBe('Original Title'));
    setField('bibliographicInfo.title', 'Edited Title');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.put).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    ));
    expect(document.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
