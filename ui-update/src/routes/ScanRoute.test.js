import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import ScanRoot from '../index';
import { getScanState, reset } from '../scanStore';
import ScanRoute from './ScanRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes/core', () => ({
  ...require('@projectreshare/stripes-reshare/testing/stripesCore').makeStripesCoreMock(
    () => mockOkapi,
    () => ({ sharedIndex: { item: 'https://shared-index.example/item/{itemid}' } })
  ),
  coreEvents: { LOGIN: 'LOGIN' },
}));

const messages = {
  'stripes-reshare.actions.generic.success': 'Success: {action}',
  'stripes-reshare.actions.generic.error': 'Error: {action}. {errMsg}',
  'ui-update.itemPrompt.lookupFailed': 'Lookup failed. {errMsg}',
};

const request = {
  id: 'pr-1',
  side: 'lending',
  requesterRequestId: 'REQ-1',
  requesterSymbol: 'ISIL:REQ',
  supplierSymbol: 'ISIL:SUP',
  supplierName: 'Supplier Library',
  internalNote: 'Fragile',
  state: 'SEARCHING',
  illRequest: { bibliographicInfo: { title: 'A Title', author: 'An Author', supplierUniqueRecordId: 'inst-1' } },
};

const actionOk = () => ({ json: async () => ({ outcome: 'success' }) });

const renderScan = () => renderWithRs(<ScanRoute />, { messages });

const scan = (barcode) => {
  const input = screen.getByRole('textbox', { name: 'ui-update.scanPlaceholder' });
  fireEvent.change(input, { target: { value: barcode } });
  fireEvent.submit(input);
};

const chooseAction = (action) => fireEvent.change(
  screen.getByRole('combobox', { name: 'ui-update.action' }),
  { target: { value: action } }
);

describe('ScanRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
    mockOkapi.setResponses({
      'broker/patron_requests': { items: [request] },
      'broker/patron_requests/pr-1': request,
    });
    mockOkapi.post.mockImplementation(async () => actionOk());
  });

  it('looks the request up on the action\'s side and performs the action', async () => {
    renderScan();
    chooseAction('ship');
    scan('REQ-1');

    expect(await screen.findByText('Success: stripes-reshare.actions.ship')).toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toContain('broker/patron_requests?side=lending&requester_req_id=REQ-1');
    expect(mockOkapi.post).toHaveBeenCalledWith(
      'broker/patron_requests/pr-1/action',
      { json: { action: 'ship', actionParams: {} } }
    );
    expect(screen.getByText('stripes-reshare.hasLocalNote')).toBeInTheDocument();
    expect(screen.queryByText('stripes-reshare.hasPatronNote')).toBeNull();
  });

  it('shows the requester and supplier, linked to the directory, and the item', async () => {
    renderScan();
    chooseAction('ship');
    scan('REQ-1');

    await screen.findByText('Supplier Library');
    const requester = within(document.getElementById('requester-card'));
    const supplier = within(document.getElementById('supplier-card'));
    expect(requester.getByText('ISIL:REQ')).toBeInTheDocument();
    expect(supplier.getByText('Supplier Library')).toBeInTheDocument();
    expect(supplier.getByText('ISIL:SUP')).toBeInTheDocument();
    expect(requester.getByRole('link', { name: 'ui-update.viewInDirectory' }))
      .toHaveAttribute('href', '/directory/entries/by-symbol/ISIL:REQ');
    expect(supplier.getByRole('link', { name: 'ui-update.viewInDirectory' }))
      .toHaveAttribute('href', '/directory/entries/by-symbol/ISIL:SUP');
    const item = within(document.getElementById('item-card'));
    expect(item.getByText('A Title')).toBeInTheDocument();
    expect(item.getByText('An Author')).toBeInTheDocument();
    expect(item.getByRole('link', { name: 'stripes-reshare.viewInSharedIndex' }))
      .toHaveAttribute('href', 'https://shared-index.example/item/inst-1');
  });

  it('shows an earlier scan when its row is selected', async () => {
    const second = { ...request, id: 'pr-2', requesterRequestId: 'REQ-2', illRequest: { bibliographicInfo: { title: 'Another Title' } } };
    mockOkapi.setResponses({
      'broker/patron_requests': url => ({ items: [url.includes('REQ-2') ? second : request] }),
      'broker/patron_requests/pr-1': request,
      'broker/patron_requests/pr-2': second,
    });
    renderScan();
    chooseAction('ship');
    scan('REQ-1');
    await screen.findByText('Success: stripes-reshare.actions.ship');
    scan('REQ-2');
    const itemCard = () => within(document.getElementById('item-card'));
    await waitFor(() => expect(itemCard().getByText('Another Title')).toBeInTheDocument());
    expect(within(screen.getByRole('grid')).getAllByText(/^REQ-\d$/).map(c => c.textContent)).toEqual(['REQ-2', 'REQ-1']);

    fireEvent.click(screen.getByText('REQ-1'));

    expect(await screen.findByRole('region', { name: /REQ-1/ })).toBeInTheDocument();
    expect(itemCard().getByText('A Title')).toBeInTheDocument();
    expect(screen.getByText('Success: stripes-reshare.actions.ship')).toBeInTheDocument();
  });

  it('keeps scans across a remount, including one that finished while unmounted', async () => {
    let finish;
    mockOkapi.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { unmount } = renderScan();
    chooseAction('receive');
    scan('REQ-1');
    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalled());

    unmount();
    await act(async () => finish(actionOk()));
    renderScan();

    expect(await screen.findByText('Success: stripes-reshare.actions.receive')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'ui-update.action' })).toHaveValue('receive');
  });

  it('asks for the item barcode when adding an item', async () => {
    renderScan();
    scan('REQ-1');

    const dialog = within(await screen.findByRole('dialog'));
    const item = dialog.getByRole('textbox', { name: 'ui-update.itemBarcode' });
    fireEvent.change(item, { target: { value: 'ITEM-1' } });
    fireEvent.submit(item);

    expect(await screen.findByText('Success: stripes-reshare.actions.add-item')).toBeInTheDocument();
    expect(mockOkapi.post).toHaveBeenCalledWith(
      'broker/patron_requests/pr-1/action',
      { json: { action: 'add-item', actionParams: { barcode: 'ITEM-1' } } }
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fails the scan when the item prompt is dismissed', async () => {
    renderScan();
    scan('REQ-1');
    await screen.findByRole('dialog');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(await screen.findByText('Error: stripes-reshare.actions.add-item. ui-update.error.dismissed')).toBeInTheDocument();
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('shows a failed lookup in the item prompt and drops the item scan', async () => {
    mockOkapi.setResponses({ 'broker/patron_requests': { items: null } });
    renderScan();
    scan('NOPE');

    const dialog = within(await screen.findByRole('dialog'));
    expect(await dialog.findByText('Lookup failed. ui-update.error.noRequest')).toBeInTheDocument();
    const item = dialog.getByRole('textbox', { name: 'ui-update.itemBarcode' });
    expect(item).toHaveAttribute('placeholder', 'ui-update.itemPrompt.lookupFailedPlaceholder');
    fireEvent.change(item, { target: { value: 'ITEM-1' } });
    fireEvent.submit(item);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(getScanState().scans).toHaveLength(1);
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('reports a barcode that matches no request', async () => {
    // The broker encodes an empty result as null.
    mockOkapi.setResponses({ 'broker/patron_requests': { items: null } });
    renderScan();
    chooseAction('ship');
    scan('NOPE');

    expect(await screen.findByText('Error: stripes-reshare.actions.ship. ui-update.error.noRequest')).toBeInTheDocument();
    expect(mockOkapi.post).not.toHaveBeenCalled();
  });

  it('reports an action the broker rejects', async () => {
    // A rejected action is still an HTTP 200.
    mockOkapi.post.mockImplementation(async () => ({
      json: async () => ({ outcome: 'failure', result: 'ERROR', message: 'Not allowed in this state', fromState: 'NEW' }),
    }));
    renderScan();
    chooseAction('ship');
    scan('REQ-1');

    expect(await screen.findByText('Error: stripes-reshare.actions.ship. Not allowed in this state')).toBeInTheDocument();
  });

  it('drops a scan whose lookup returns after the action changed', async () => {
    let found;
    mockOkapi.setResponses({
      'broker/patron_requests': () => new Promise(resolve => { found = resolve; }),
    });
    renderScan();
    chooseAction('ship');
    scan('REQ-1');
    await waitFor(() => expect(found).toBeDefined());

    chooseAction('receive');
    await act(async () => found({ items: [request] }));

    expect(mockOkapi.post).not.toHaveBeenCalled();
    expect(getScanState().scans).toEqual([]);
  });

  it('starts over on login', async () => {
    renderScan();
    chooseAction('ship');
    scan('REQ-1');
    await screen.findByText('Success: stripes-reshare.actions.ship');

    act(() => { ScanRoot.eventHandler('LOGIN'); });

    expect(getScanState().scans).toEqual([]);
    expect(await screen.findByText('ui-update.placeholder')).toBeInTheDocument();
  });
});
