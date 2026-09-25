import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import { quietQueryLog } from '../test/quietQueryLog';
import CreateRoute from './CreateRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);

jest.mock('@folio/stripes/core', () => require('../test/stripesCore').makeStripesCoreMock(() => mockOkapi));

// CalloutContext is consumed by the route + stripes-reshare hooks; on the happy
// path sendCallout is never called, but provide it so an unexpected error path
// surfaces via a spy rather than crashing on `callout.sendCallout` of null.
const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

// Owned entries include the institution itself, which is not a pickup location.
const institution = { id: 'inst-1', name: 'Our Library', type: 'Institution' };
const westBranch = { id: 'branch-w', name: 'West Branch', type: 'Branch', parent: 'inst-1' };
const eastBranch = { id: 'branch-e', name: 'East Branch', type: 'Branch', parent: 'inst-1' };
const ownedEntries = { items: [institution, westBranch, eastBranch] };

const renderCreate = ({ owned = ownedEntries, ...options } = {}) => {
  mockOkapi.setResponses({ 'directory/entries/owned': owned });
  return renderWithRs(
    <CalloutContext.Provider value={{ sendCallout }}>
      <Route path="/requests/create" component={CreateRoute} />
    </CalloutContext.Provider>,
    { initialEntries: ['/requests/create'], ...options }
  );
};

// Fields are addressed by their Final Form names because the submitted payload
// shape is what this test protects. A single fireEvent.change drives final-form's
// onChange in one act()-wrapped update; userEvent.type fires per-keystroke and
// floods the run with final-form's post-event subscription notifications.
const fieldByName = (name) => Array.from(document.querySelectorAll('[name]'))
  .find(el => el.getAttribute('name') === name);

const setField = (name, value) => fireEvent.change(
  fieldByName(name), { target: { value } }
);

// The route renders nothing until its select options have settled.
const formRendered = () => waitFor(() => expect(fieldByName('bibliographicInfo.title')).toBeTruthy());

const optionLabels = (name) => Array.from(fieldByName(name).querySelectorAll('option'))
  .map(option => option.textContent)
  .filter(label => label.trim());

const chooseServiceType = (value) => fireEvent.click(
  document.querySelector(`input[name="serviceInfo.serviceType"][value="${value}"]`)
);

// Fills every field validation requires, except the pickup location a loan needs
// (serviceType defaults to Loan).
const fillRequiredFields = () => {
  setField('patronInfo.givenName', 'Ada');
  setField('patronInfo.surname', 'Lovelace');
  setField('bibliographicInfo.title', 'Test Title');
  setField('bibliographicInfo.author', 'Some Author');
};

describe('CreateRoute', () => {
  quietQueryLog(/^(Boom|Forbidden)$/); // failure tests reject the POST or the owned lookup on purpose

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transforms the filled form into the broker create payload and POSTs it', async () => {
    const history = createMemoryHistory({ initialEntries: ['/requests/create?foo=bar'] });
    renderCreate({ history });
    await formRendered();

    // Submit is disabled while pristine; fill the required fields plus an ISBN
    // to exercise the identifier transform.
    fillRequiredFields();
    setField('identifiers.ISBN', '9781234567890');
    setField('internalNote', 'Staff only note');
    setField('requesterPickupLocationId', 'branch-e');

    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));
    // On success the route navigates to the new request and preserves the query
    // string; wait for the form to unmount so async post-submit updates settle.
    await waitFor(() => expect(document.querySelector('button[type="submit"]')).toBeNull());
    expect(history.location).toMatchObject({
      pathname: '/requests/new-1',
      search: '?foo=bar',
    });

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

    // So is the pickup location, as the directory entry id.
    expect(opts.json.requesterPickupLocationId).toBe('branch-e');
    expect(illRequest.requesterPickupLocationId).toBeUndefined();

    // No error callout on the happy path.
    expect(sendCallout).not.toHaveBeenCalled();
  });

  it('surfaces an HTTP failure as an error callout and keeps the form mounted', async () => {
    // The POST rejects (e.g. broker validation / 5xx). The rejection must be
    // caught in submit so it becomes a callout rather than an unhandled
    // rejection that unmounts the form into the error boundary.
    mockOkapi.post.mockRejectedValueOnce(new Error('Boom'));

    renderCreate();
    await formRendered();

    fillRequiredFields();
    setField('requesterPickupLocationId', 'branch-e');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));

    // The failure is reported via an error callout...
    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    ));
    // ...and the form stays mounted (close() never ran, boundary not tripped).
    expect(document.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('offers owned branches as pickup locations, by name', async () => {
    renderCreate();
    await formRendered();

    expect(mockOkapi.calledUrls()).toContain('directory/entries/owned?limit=1000');
    expect(optionLabels('requesterPickupLocationId')).toEqual(['East Branch', 'West Branch']);
    expect(fieldByName('requesterPickupLocationId').value).toBe('');
  });

  it('preselects the only pickup location', async () => {
    renderCreate({ owned: { items: [institution, westBranch] } });
    await formRendered();
    expect(fieldByName('requesterPickupLocationId').value).toBe('branch-w');
  });

  it('requires a pickup location for a loan but not a copy, and omits an unchosen one', async () => {
    renderCreate();
    await formRendered();

    fillRequiredFields();
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await waitFor(() => expect(fieldByName('requesterPickupLocationId')).toHaveAttribute('aria-invalid', 'true'));

    chooseServiceType('Copy');
    setField("serviceInfo.copyrightCompliance['#text']", 'AU-GenBus');
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledTimes(1));
    const { json } = mockOkapi.post.mock.calls[0][1];
    expect(json.illRequest.serviceInfo.serviceType).toBe('Copy');
    expect(json).not.toHaveProperty('requesterPickupLocationId');
  });

  it('still renders the form, without pickup locations, when the owned lookup fails', async () => {
    renderCreate({ owned: () => { throw new Error('Forbidden'); } });
    await formRendered();

    expect(optionLabels('requesterPickupLocationId')).toEqual([]);
  });
});
