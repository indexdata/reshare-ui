import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import CreateRoute from './CreateRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);

// Tiers not ported yet
jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(
  () => mockOkapi,
  { config: { ...require('../test/stripesCore').reshareConfigStub, useTiers: false } },
));

// CalloutContext is consumed by the route + stripes-reshare hooks; on the happy
// path sendCallout is never called, but provide it so an unexpected error path
// surfaces via a spy rather than crashing on `callout.sendCallout` of null.
const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

const renderCreate = () => renderWithRs(
  <CalloutContext.Provider value={{ sendCallout }}>
    <Route path="/requests/create" component={CreateRoute} />
  </CalloutContext.Provider>,
  { initialEntries: ['/requests/create'] }
);

// Fields are addressed by their Final Form names because the submitted payload
// shape is what this test protects. A single fireEvent.change drives final-form's
// onChange in one act()-wrapped update; userEvent.type fires per-keystroke and
// floods the run with final-form's post-event subscription notifications.
const fieldByName = (name) => Array.from(document.querySelectorAll('[name]'))
  .find(el => el.getAttribute('name') === name);

const setField = (name, value) => fireEvent.change(
  fieldByName(name), { target: { value } }
);

describe('CreateRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transforms the filled form into the broker create payload and POSTs it', async () => {
    renderCreate();

    // Submit is disabled while pristine; fill the required fields (serviceType
    // defaults to Loan) plus an ISBN to exercise the identifier transform.
    setField('patronInfo.givenName', 'Ada');
    setField('patronInfo.surname', 'Lovelace');
    setField('bibliographicInfo.title', 'Test Title');
    setField('bibliographicInfo.author', 'Some Author');
    setField('identifiers.ISBN', '9781234567890');
    setField("serviceInfo.serviceLevel['#text']", 'Standard');
    setField('internalNote', 'Staff only note');

    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));
    // On success the route navigates away (close()); wait for the form to unmount
    // so the async post-submit state updates settle inside act().
    await waitFor(() => expect(document.querySelector('button[type="submit"]')).toBeNull());

    const [path, opts] = mockOkapi.post.mock.calls[0];
    expect(path).toBe('broker/patron_requests');

    const { illRequest } = opts.json;
    // Typed title flows through verbatim; serviceType keeps its Loan default.
    expect(illRequest.bibliographicInfo.title).toBe('Test Title');
    expect(illRequest.serviceInfo.serviceType).toBe('Loan');
    // The flat ISBN field maps into the ISO-18626 identifier array (our transform).
    expect(illRequest.bibliographicInfo.bibliographicItemId[0].bibliographicItemIdentifier)
      .toBe('9781234567890');
    expect(illRequest.bibliographicInfo.bibliographicItemId[0].bibliographicItemIdentifierCode)
      .toEqual({ '#text': 'ISBN' });

    // internalNote is hoisted to the top level, not buried in illRequest.
    expect(opts.json.internalNote).toBe('Staff only note');
    expect(illRequest.internalNote).toBeUndefined();

    // No error callout on the happy path.
    expect(sendCallout).not.toHaveBeenCalled();
  });

  it('surfaces an HTTP failure as an error callout and keeps the form mounted', async () => {
    // The POST rejects (e.g. broker validation / 5xx). The rejection must be
    // caught in submit so it becomes a callout rather than an unhandled
    // rejection that unmounts the form into the error boundary.
    mockOkapi.post.mockRejectedValueOnce(new Error('Boom'));

    renderCreate();

    setField('patronInfo.givenName', 'Ada');
    setField('patronInfo.surname', 'Lovelace');
    setField('bibliographicInfo.title', 'Test Title');
    setField('bibliographicInfo.author', 'Some Author');
    setField("serviceInfo.serviceLevel['#text']", 'Standard');

    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));

    // The failure is reported via an error callout...
    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    ));
    // ...and the form stays mounted (close() never ran, boundary not tripped).
    expect(document.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
