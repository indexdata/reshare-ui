import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '../test/renderWithRs';
import { makeOkapiKyMock } from '../test/okapiKyMock';
import CreateEditRoute from './CreateEditRoute';

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
    <Route path="/requests/create" component={CreateEditRoute} />
  </CalloutContext.Provider>,
  { initialEntries: ['/requests/create'] }
);

// Fields are addressed by their stable Field ids rather than label text (required
// labels carry an asterisk and several share a translation-key prefix). A single
// fireEvent.change drives final-form's onChange in one act()-wrapped update —
// userEvent.type fires per-keystroke and floods the run with final-form's
// post-event subscription notifications as act() warnings, with no added signal
// for a payload-transform assertion.
const setField = (id, value) => fireEvent.change(
  document.getElementById(id), { target: { value } }
);

describe('CreateEditRoute (create)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transforms the filled form into the broker create payload and POSTs it', async () => {
    renderCreate();

    // Submit is disabled while pristine; fill the required fields (serviceType
    // defaults to Loan) plus an ISBN to exercise the identifier transform.
    setField('edit-request-metadata-patronGivenName', 'Ada');
    setField('edit-request-metadata-patronSurname', 'Lovelace');
    setField('edit-patron-request-title', 'Test Title');
    setField('edit-patron-request-author', 'Some Author');
    setField('edit-patron-request-isbn', '9781234567890');
    setField('edit-request-metadata-serviceLevel', 'Standard');
    setField('edit-request-metadata-internalNote', 'Staff only note');

    fireEvent.click(document.getElementById('clickable-create-rs-entry'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));
    // On success the route navigates away (close()); wait for the form to unmount
    // so the async post-submit state updates settle inside act().
    await waitFor(() => expect(document.getElementById('clickable-create-rs-entry')).toBeNull());

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
});
