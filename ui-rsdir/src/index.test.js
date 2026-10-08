import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { act, fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import RSDir from './index';

// Jest allows the hoisted mock factory to reference variables prefixed with `mock`.
const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@folio/stripes/core', () => require('@projectreshare/stripes-reshare/testing/stripesCore').makeStripesCoreMock(() => mockOkapi));

const { CalloutContext } = require('@folio/stripes/core');

const sendCallout = jest.fn();

const entry = {
  id: 'e1',
  name: 'fixture-entry',
  type: 'Institution',
  symbols: [{ authority: 'ISIL', symbol: 'FIX-1' }],
  illConfig: { minimumCost: 1.5 },
  lmsConfig: { address: 'fixture-lms-address' },
  closures: [
    { id: 'c1', entry: 'e1', startDate: '2026-03-02', endDate: '2026-06-01', reason: 'fixture-closure' },
    { id: 'c2', entry: 'e1', startDate: '2026-05-04', endDate: '2026-05-06', reason: 'fixture-later-closure' },
  ],
};

const responses = (overrides = {}) => ({
  'directory/entries': { items: [entry], about: { count: 1 } },
  'directory/entries/by-id/e1': entry,
  'directory/entries/by-id/e1/networks': [],
  'directory/entries/by-id/e1/tiers': [],
  'directory/networks': [],
  'directory/entry-networks': { items: [] },
  'directory/tiers': [],
  ...overrides,
});

// Mount at the module route and expose history for navigation assertions.
const renderDirectory = (initialEntries) => {
  const history = createMemoryHistory({ initialEntries });
  return {
    history,
    ...renderWithRs(
      <CalloutContext.Provider value={{ sendCallout }}>
        <Route path="/directory" component={RSDir} />
      </CalloutContext.Provider>,
      { history }
    ),
  };
};

const sectionLink = (section) => screen.getByRole('link', { name: `ui-rsdir.entry.section.${section}` });
const findSectionLink = (section) => screen.findByRole('link', { name: `ui-rsdir.entry.section.${section}` });
const querySectionLink = (section) => screen.queryByRole('link', { name: `ui-rsdir.entry.section.${section}` });

const closuresList = () => within(document.getElementById('entry-closures-list'));
const columnHeader = (column) => closuresList().getByRole('columnheader', { name: `ui-rsdir.closure.${column}.column` });
const closureOrder = () => closuresList().getAllByRole('row')
  .map(row => ['fixture-closure', 'fixture-later-closure'].find(reason => within(row).queryByText(reason)))
  .filter(Boolean);

const entryRow = () => within(document.getElementById('entries-list')).getByText('fixture-entry').closest('[class*="mclRow"]');
const at = (history) => `${history.location.pathname}${history.location.search}`;

// The Edit button identifies the entry view pane among the list panes.
const findEntryPane = async () => within(
  (await screen.findByRole('button', { name: 'ui-rsdir.edit' })).closest('section')
);

describe('directory entries', () => {
  beforeEach(() => {
    mockOkapi.mockClear();
    mockOkapi.post.mockClear();
    mockOkapi.patch.mockClear();
    mockOkapi.delete.mockClear();
    sendCallout.mockClear();
    mockOkapi.setResponses(responses());
  });

  it('opens an entry from the list beside its sections, keeping the search', async () => {
    const { history } = renderDirectory(['/directory/entries?query=fix']);

    fireEvent.click(await screen.findByText('fixture-entry'));
    expect(at(history)).toBe('/directory/entries/e1?query=fix');

    expect((await findEntryPane()).getByText('ISIL:FIX-1')).toBeInTheDocument();
    expect(sectionLink('entry')).not.toHaveFocus();
    expect(sectionLink('entry')).toHaveAttribute('href', '/directory/entries/e1?query=fix');
    expect(sectionLink('lmsConfig')).toHaveAttribute('href', '/directory/entries/e1/lmsconfig?query=fix');
    expect(sectionLink('networks')).toHaveAttribute('href', '/directory/entries/e1/networks?query=fix');
  });

  it('switches sections and closes the whole entry back to the list', async () => {
    const { history } = renderDirectory(['/directory/entries/e1?query=fix']);

    const lmsLink = await findSectionLink('lmsConfig');
    lmsLink.focus();
    fireEvent.click(lmsLink);
    expect(at(history)).toBe('/directory/entries/e1/lmsconfig?query=fix');
    expect(await screen.findByText('fixture-lms-address')).toBeInTheDocument();
    expect(sectionLink('lmsConfig')).toHaveAttribute('aria-current', 'page');
    expect(sectionLink('entry')).not.toHaveAttribute('aria-current');
    expect(sectionLink('lmsConfig')).toHaveFocus();
    expect(entryRow()).toHaveClass('mclSelected');

    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.closeItem' }));
    expect(at(history)).toBe('/directory/entries?query=fix');
    expect(screen.queryByText('fixture-lms-address')).not.toBeInTheDocument();
    expect(querySectionLink('entry')).not.toBeInTheDocument();
    expect(entryRow()).not.toHaveClass('mclSelected');
  });

  it('opens an entry linked by symbol at its id, keeping the search', async () => {
    mockOkapi.setResponses(responses({ 'directory/entries/by-symbol/ISIL:FIX-1': entry }));
    const { history } = renderDirectory(['/directory/entries/by-symbol/ISIL:FIX-1?query=fix']);

    await waitFor(() => expect(at(history)).toBe('/directory/entries/e1?query=fix'));
    expect((await findEntryPane()).getByText('ISIL:FIX-1')).toBeInTheDocument();
    expect(entryRow()).toHaveClass('mclSelected');
  });

  it('says when no entry has a linked symbol and closes back to the list', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-symbol/ISIL:NONE': () => {
        throw Object.assign(new Error('Entry not found'), { status: 404 });
      },
    }));
    const { history } = renderDirectory(['/directory/entries/by-symbol/ISIL:NONE?query=fix']);

    expect(await screen.findByText('ui-rsdir.entry.symbolNotFound')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.closeItem' }));
    expect(at(history)).toBe('/directory/entries?query=fix');
  });

  it('edits the entry in a pane of its own and cancels or closes back to the view', async () => {
    const { history } = renderDirectory(['/directory/entries/e1?query=fix']);

    fireEvent.click(await screen.findByRole('button', { name: 'ui-rsdir.edit' }));
    expect(at(history)).toBe('/directory/entries/e1/edit?query=fix');
    expect(await screen.findByRole('button', { name: 'ui-rsdir.edit.submit' })).toBeInTheDocument();
    expect(querySectionLink('entry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.cancel' }));
    await waitFor(() => expect(at(history)).toBe('/directory/entries/e1?query=fix'));
    expect((await findEntryPane()).getByText('ISIL:FIX-1')).toBeInTheDocument();
    expect(sectionLink('entry')).toHaveAttribute('aria-current', 'page');

    fireEvent.click(await screen.findByRole('button', { name: 'ui-rsdir.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.closeItem' }));
    await waitFor(() => expect(at(history)).toBe('/directory/entries/e1?query=fix'));
  });

  it('manages tiers for a consortium and picks them for any other entry', async () => {
    const { unmount } = renderDirectory(['/directory/entries/e1/tiers']);
    expect(await screen.findByRole('button', { name: 'ui-rsdir.tiers.add' })).toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toContain('directory/tiers?limit=1000');
    expect(sectionLink('tiers')).toHaveAttribute('aria-current', 'page');
    unmount();

    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, type: 'Consortium' },
    }));
    renderDirectory(['/directory/entries/e1/tiers']);
    expect(await screen.findByRole('button', { name: 'ui-rsdir.add' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ui-rsdir.tiers.add' })).not.toBeInTheDocument();
  });

  it('loads all available networks when picking entry memberships', async () => {
    renderDirectory(['/directory/entries/e1/networks']);

    expect(await screen.findByRole('button', { name: 'ui-rsdir.networks.add' })).toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toContain('directory/networks?limit=1000');
  });

  const priorityFixtures = (overrides = {}) => responses({
    'directory/entries/by-id/e1/networks': { items: [
      { id: 'n1', name: 'Alpha network', priority: 7 },
      { id: 'n2', name: 'Beta network', priority: -8 },
      { id: 'n3', name: 'Gamma network', priority: 0 },
    ] },
    'directory/networks': [{ id: 'n4', name: 'Available network' }],
    'directory/entry-networks': { items: [
      { id: 'm1', entry: 'e1', network: 'n1', priority: 7 },
      { id: 'm2', entry: 'e1', network: 'n2', priority: -8 },
      { id: 'm3', entry: 'e1', network: 'n3', priority: 0 },
    ] },
    ...overrides,
  });
  const networkTable = () => within(document.getElementById('entry-networks-list'));
  const editPriority = async () => {
    const button = await screen.findByRole('button', { name: 'ui-rsdir.network.priority.edit' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    return screen.getByRole('spinbutton', { name: 'ui-rsdir.network.priority.forNetwork' });
  };
  const singlePriorityFixtures = (overrides = {}) => priorityFixtures({
    'directory/entries/by-id/e1/networks': [{ id: 'n1', name: 'Alpha network', priority: 7 }],
    ...overrides,
  });

  it('displays membership priorities and sorts them numerically', async () => {
    mockOkapi.setResponses(priorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);

    await screen.findByText('Alpha network');
    const table = networkTable();
    expect(table.getByText('7')).toBeInTheDocument();
    expect(table.getByText('-8')).toBeInTheDocument();
    expect(table.getByText('0')).toBeInTheDocument();
    const order = () => table.getAllByRole('row').slice(1).map(row => row.cells[0].textContent);
    expect(order()).toEqual(['Alpha network', 'Beta network', 'Gamma network']);
    fireEvent.click(table.getByRole('button', { name: 'ui-rsdir.network.priority' }));
    expect(order()).toEqual(['Beta network', 'Gamma network', 'Alpha network']);
    fireEvent.click(table.getByRole('button', { name: 'ui-rsdir.network.priority' }));
    expect(order()).toEqual(['Alpha network', 'Gamma network', 'Beta network']);
  });

  it.each(['0', '-8', '2147483647', '-2147483648'])('adds a network with priority %s and resets the fields', async value => {
    mockOkapi.setResponses(priorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);

    const input = await screen.findByRole('spinbutton', { name: 'ui-rsdir.network.priority' });
    expect(input).toHaveValue(0);
    fireEvent.change(screen.getByLabelText('ui-rsdir.networks.available'), { target: { value: 'n4' } });
    if (value !== '0') fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.networks.add' }));
    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith(
      'directory/entries/by-id/e1/networks', { json: { id: 'n4', priority: Number(value) } }
    ));
    await waitFor(() => expect(input).toHaveValue(0));
    expect(screen.getByLabelText('ui-rsdir.networks.available')).toHaveValue('');
  });

  it.each(['', '1.5', '2147483648', '-2147483649'])('rejects invalid priority %s when adding and editing', async value => {
    mockOkapi.setResponses(singlePriorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);

    const addInput = await screen.findByRole('spinbutton', { name: 'ui-rsdir.network.priority' });
    fireEvent.change(screen.getByLabelText('ui-rsdir.networks.available'), { target: { value: 'n4' } });
    fireEvent.change(addInput, { target: { value } });
    expect(screen.getByRole('button', { name: 'ui-rsdir.networks.add' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.networks.add' }));
    expect(mockOkapi.post).not.toHaveBeenCalled();

    const input = await editPriority();
    fireEvent.change(input, { target: { value } });
    expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' })).toBeDisabled();
    expect(screen.getAllByText('ui-rsdir.network.priority.invalid')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' }));
    expect(mockOkapi.patch).not.toHaveBeenCalled();
  });

  it.each(['0', '-8', '2147483647', '-2147483648'])('updates priority %s using the membership ID and refreshes the list', async value => {
    mockOkapi.setResponses(singlePriorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);

    const input = await editPriority();
    expect(input).toHaveValue(7);
    expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' })).toBeDisabled();
    fireEvent.change(input, { target: { value } });
    mockOkapi.setResponses(singlePriorityFixtures({
      'directory/entries/by-id/e1/networks': [{ id: 'n1', name: 'Alpha network', priority: Number(value) }],
      'directory/entry-networks': { items: [{ id: 'm1', entry: 'e1', network: 'n1', priority: Number(value) }] },
    }));
    mockOkapi.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' }));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entry-networks/m1', { json: { priority: Number(value) } }
    ));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ui-rsdir.network.priority.save' })).not.toBeInTheDocument());
    expect(networkTable().getByText(value)).toBeInTheDocument();
    expect(mockOkapi.calledUrls()).toContain('directory/entry-networks?q=entry%3De1&limit=1000&offset=0');
    expect(mockOkapi.calledUrls()).toContain('directory/entries/by-id/e1/networks');
    expect(mockOkapi.calledUrls()).toContain('directory/entries/by-id/e1');
    expect(mockOkapi.calledUrls().some(url => url.startsWith('directory/entries?'))).toBe(true);
    expect(sendCallout).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('cancels a priority edit without updating and only permits one edit at a time', async () => {
    mockOkapi.setResponses(priorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);
    await screen.findByText('Alpha network');
    const buttons = screen.getAllByRole('button', { name: 'ui-rsdir.network.priority.edit' });
    await waitFor(() => expect(buttons[0]).toBeEnabled());
    fireEvent.click(buttons[0]);
    expect(buttons[1]).toBeDisabled();
    expect(document.getElementById('clickable-delete-network-n1')).toBeDisabled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'ui-rsdir.network.priority.forNetwork' }), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.cancel' }));
    expect(mockOkapi.patch).not.toHaveBeenCalled();
    expect(networkTable().getByText('7')).toBeInTheDocument();
    expect(buttons[1]).toBeEnabled();
  });

  it.each([true, false])('handles a refreshed network list with edited network removed: %s', async removed => {
    mockOkapi.setResponses(priorityFixtures());
    const { queryClient } = renderDirectory(['/directory/entries/e1/networks']);
    await screen.findByText('Alpha network');
    const edit = document.getElementById('clickable-edit-network-priority-n1');
    await waitFor(() => expect(edit).toBeEnabled());
    fireEvent.click(edit);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'ui-rsdir.network.priority.forNetwork' }), { target: { value: '9' } });

    mockOkapi.setResponses(priorityFixtures({
      'directory/entries/by-id/e1/networks': { items: [
        ...(removed ? [] : [{ id: 'n1', name: 'Alpha network', priority: 7 }]),
        { id: 'n2', name: 'Beta network', priority: -8 },
      ] },
    }));
    await act(async () => {
      await queryClient.invalidateQueries(['directory/entries/by-id/e1/networks']);
    });

    const otherEdit = document.getElementById('clickable-edit-network-priority-n2');
    if (removed) {
      expect(screen.queryByText('Alpha network')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ui-rsdir.network.priority.cancel' })).not.toBeInTheDocument();
      expect(otherEdit).toBeEnabled();
      fireEvent.click(otherEdit);
      expect(screen.getByRole('spinbutton', { name: 'ui-rsdir.network.priority.forNetwork' })).toHaveValue(-8);
    } else {
      expect(screen.getByRole('spinbutton', { name: 'ui-rsdir.network.priority.forNetwork' })).toHaveValue(9);
      expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.cancel' })).toBeInTheDocument();
      expect(otherEdit).toBeDisabled();
    }
    expect(mockOkapi.patch).not.toHaveBeenCalled();
  });

  it('prevents duplicate priority saves while the request is pending', async () => {
    mockOkapi.setResponses(singlePriorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);
    const input = await editPriority();
    fireEvent.change(input, { target: { value: '9' } });
    let finishSave;
    mockOkapi.patch.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
    const save = screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' });
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.cancel' })).toBeDisabled();
    fireEvent.click(save);
    expect(mockOkapi.patch).toHaveBeenCalledTimes(1);
    finishSave({});
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ui-rsdir.network.priority.save' })).not.toBeInTheDocument());
  });

  it('disables editing when a network has no matching membership ID', async () => {
    mockOkapi.setResponses(singlePriorityFixtures({ 'directory/entry-networks': { items: [] } }));
    renderDirectory(['/directory/entries/e1/networks']);
    const button = await screen.findByRole('button', { name: 'ui-rsdir.network.priority.edit' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole('button', { name: 'ui-rsdir.network.priority.save' })).not.toBeInTheDocument();
    expect(mockOkapi.patch).not.toHaveBeenCalled();
  });

  it('retains a failed priority edit for retry', async () => {
    mockOkapi.setResponses(singlePriorityFixtures());
    renderDirectory(['/directory/entries/e1/networks']);
    const input = await editPriority();
    fireEvent.change(input, { target: { value: '-4' } });
    mockOkapi.patch.mockRejectedValueOnce(new Error('Save failed'));
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' }));
    await waitFor(() => expect(sendCallout).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    expect(input).toHaveValue(-4);
    await waitFor(() => expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ui-rsdir.network.priority.save' })).not.toBeInTheDocument());
    expect(mockOkapi.patch).toHaveBeenCalledTimes(2);
  });

  it('keeps networks visible when membership loading fails and disables editing', async () => {
    mockOkapi.setResponses(singlePriorityFixtures({
      'directory/entry-networks': () => { throw new Error('Membership lookup failed'); },
    }));
    renderDirectory(['/directory/entries/e1/networks']);
    expect(await screen.findByText('Alpha network')).toBeInTheDocument();
    expect((await screen.findByText('ui-rsdir.network.priority.load.error')).closest('[role="alert"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ui-rsdir.network.priority.edit' })).toBeDisabled();
    expect(networkTable().getByText('7')).toBeInTheDocument();
  });

  it('loads all membership pages and uses a membership from the second page', async () => {
    mockOkapi.setResponses(singlePriorityFixtures({
      'directory/entry-networks': url => (new URLSearchParams(url.split('?')[1]).get('offset') === '0'
        ? { items: Array.from({ length: 1000 }, (_, i) => ({ id: `other-${i}`, network: `other-${i}`, priority: 0 })) }
        : { items: [{ id: 'm1', entry: 'e1', network: 'n1', priority: 7 }] }),
    }));
    renderDirectory(['/directory/entries/e1/networks']);
    const input = await editPriority();
    expect(mockOkapi.calledUrls()).toContain('directory/entry-networks?q=entry%3De1&limit=1000&offset=1000');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.network.priority.save' }));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entry-networks/m1', { json: { priority: 2 } }
    ));
  });

  it.each(['deficit', 'proportional'])('views and changes the ILL load balancing policy from %s', async policy => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, illConfig: { ...entry.illConfig, loadBalancingPolicy: policy } },
    }));
    renderDirectory(['/directory/entries/e1/illconfig']);

    expect(await screen.findByText(policy)).toBeInTheDocument();
    fireEvent.click(document.getElementById('edit-ill-config-loadBalancingPolicy'));
    const input = screen.getByRole('combobox', { name: 'loadBalancingPolicy' });
    expect(input).toHaveValue(policy);
    expect(within(input).getAllByRole('option').map(option => option.value)).toEqual(['', 'deficit', 'proportional']);

    const nextPolicy = policy === 'deficit' ? 'proportional' : 'deficit';
    fireEvent.change(input, { target: { value: nextPolicy } });
    fireEvent.click(document.getElementById('save-ill-config-loadBalancingPolicy'));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entries/by-id/e1',
      { json: { illConfig: { loadBalancingPolicy: nextPolicy } } }
    ));
    expect(await screen.findByText(nextPolicy)).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();
  });

  it('clears the ILL load balancing policy with null', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, illConfig: { ...entry.illConfig, loadBalancingPolicy: 'deficit' } },
    }));
    renderDirectory(['/directory/entries/e1/illconfig']);

    await screen.findByText('deficit');
    fireEvent.click(document.getElementById('edit-ill-config-loadBalancingPolicy'));
    fireEvent.change(screen.getByRole('combobox', { name: 'loadBalancingPolicy' }), { target: { value: '' } });
    fireEvent.click(document.getElementById('save-ill-config-loadBalancingPolicy'));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entries/by-id/e1',
      { json: { illConfig: { loadBalancingPolicy: null } } }
    ));
    expect(screen.getByText('1.5')).toBeInTheDocument();
  });

  it.each([undefined, null])('leaves an unset ILL load balancing policy unchanged (%s)', async policy => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, illConfig: { ...entry.illConfig, loadBalancingPolicy: policy } },
    }));
    renderDirectory(['/directory/entries/e1/illconfig']);

    await screen.findByText('1.5');
    expect(mockOkapi.patch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('edit-ill-config-loadBalancingPolicy'));
    const input = screen.getByRole('combobox', { name: 'loadBalancingPolicy' });
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'deficit' } });
    fireEvent.click(document.getElementById('cancel-ill-config-loadBalancingPolicy'));
    expect(screen.queryByRole('combobox', { name: 'loadBalancingPolicy' })).not.toBeInTheDocument();
    expect(mockOkapi.patch).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('edit-ill-config-loadBalancingPolicy'));
    expect(screen.getByRole('combobox', { name: 'loadBalancingPolicy' })).toHaveValue('');
  });

  it('edits an optional non-negative minimum cost in the ILL configuration', async () => {
    renderDirectory(['/directory/entries/e1/illconfig']);

    expect(await screen.findByText('1.5')).toBeInTheDocument();
    expect(sectionLink('illConfig')).toHaveAttribute('aria-current', 'page');

    fireEvent.click(document.getElementById('edit-ill-config-minimumCost'));
    const input = screen.getByRole('spinbutton', { name: 'minimumCost' });
    expect(input).toHaveAttribute('min', '0');

    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.click(document.getElementById('save-ill-config-minimumCost'));
    expect(screen.getByText('Enter a value greater than or equal to 0.')).toBeInTheDocument();
    expect(mockOkapi.patch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '2.75' } });
    fireEvent.click(document.getElementById('save-ill-config-minimumCost'));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entries/by-id/e1',
      { json: { illConfig: { minimumCost: 2.75 } } }
    ));
  });

  it.each([
    { label: 'accepts zero', value: '0', expected: 0 },
    { label: 'clears the value', value: '', expected: null },
  ])('$label for the ILL minimum cost', async ({ value, expected }) => {
    renderDirectory(['/directory/entries/e1/illconfig']);

    await screen.findByText('1.5');
    fireEvent.click(document.getElementById('edit-ill-config-minimumCost'));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'minimumCost' }), { target: { value } });
    fireEvent.click(document.getElementById('save-ill-config-minimumCost'));
    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/entries/by-id/e1',
      { json: { illConfig: { minimumCost: expected } } }
    ));
  });

  it('lists reciprocal status instead of network priority for a consortium', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, type: 'Consortium' },
      'directory/entries/by-id/e1/networks': [
        { id: 'n1', name: 'Reciprocal network', reciprocal: true },
        { id: 'n2', name: 'Paid network', reciprocal: false },
        { id: 'n3', name: 'Legacy network' },
      ],
    }));
    renderDirectory(['/directory/entries/e1/networks']);

    await screen.findByText('Reciprocal network');
    const table = within(document.getElementById('entry-owned-networks-list'));
    expect(table.getByRole('columnheader', { name: 'ui-rsdir.network.reciprocal' })).toBeInTheDocument();
    expect(table.queryByRole('columnheader', { name: 'ui-rsdir.network.priority' })).not.toBeInTheDocument();
    expect(table.getByText('stripes-components.boolean.true')).toBeInTheDocument();
    expect(table.getByText('stripes-components.boolean.false')).toBeInTheDocument();
    expect(table.getByText('ui-rsdir.network.reciprocal.unspecified')).toBeInTheDocument();
  });

  it('creates networks with an optional reciprocal value and no priority', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, type: 'Consortium' },
    }));
    renderDirectory(['/directory/entries/e1/networks']);

    await waitFor(() => expect(document.getElementById('clickable-add-entry-owned-network')).toBeInTheDocument());
    fireEvent.click(document.getElementById('clickable-add-entry-owned-network'));
    expect(screen.queryByLabelText('ui-rsdir.network.priority')).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText(/ui-rsdir\.network\.name/), { target: { value: 'New reciprocal network' } });
    fireEvent.change(screen.getByLabelText('ui-rsdir.network.reciprocal'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.create' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith(
      'directory/networks',
      { json: { name: 'New reciprocal network', consortium: 'e1', reciprocal: true } }
    ));

    await waitFor(() => expect(document.getElementById('clickable-add-entry-owned-network')).toBeInTheDocument());
    fireEvent.click(document.getElementById('clickable-add-entry-owned-network'));
    fireEvent.change(await screen.findByLabelText(/ui-rsdir\.network\.name/), { target: { value: 'Unspecified network' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.create' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenLastCalledWith(
      'directory/networks',
      { json: { name: 'Unspecified network', consortium: 'e1' } }
    ));
  });

  it('edits only reciprocal, allows clearing it, and keeps the network name read-only', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, type: 'Consortium' },
      'directory/entries/by-id/e1/networks': [
        { id: 'n1', name: 'Existing network', reciprocal: true },
      ],
    }));
    renderDirectory(['/directory/entries/e1/networks']);

    await screen.findByText('Existing network');
    fireEvent.click(document.getElementById('clickable-edit-network-n1'));
    expect(await screen.findByLabelText(/ui-rsdir\.network\.name/)).toBeDisabled();
    const reciprocal = screen.getByLabelText('ui-rsdir.network.reciprocal');
    expect(reciprocal).toHaveValue('true');
    fireEvent.change(reciprocal, { target: { value: 'false' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.edit.submit' }));

    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/networks/n1',
      { json: { reciprocal: false } }
    ));

    await waitFor(() => expect(document.getElementById('clickable-edit-network-n1')).toBeInTheDocument());
    fireEvent.click(document.getElementById('clickable-edit-network-n1'));
    fireEvent.change(await screen.findByLabelText('ui-rsdir.network.reciprocal'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.edit.submit' }));

    await waitFor(() => expect(mockOkapi.patch).toHaveBeenLastCalledWith(
      'directory/networks/n1',
      { json: { reciprocal: null } }
    ));
  });

  it('lists, adds and removes the closures of an entry', async () => {
    renderDirectory(['/directory/entries/e1/closures']);

    expect(await screen.findByText('fixture-closure')).toBeInTheDocument();
    expect(sectionLink('closures')).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.add' }));
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.closure\.reason/), { target: { value: 'fixture-new-closure' } });
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.closure\.startDate/), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.closure\.endDate/), { target: { value: '2026-04-03' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.create' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith(
      'directory/closures',
      { json: { entry: 'e1', startDate: '2026-04-01', endDate: '2026-04-03', reason: 'fixture-new-closure' } }
    ));

    fireEvent.click(document.getElementById('clickable-delete-closure-c1'));
    await waitFor(() => expect(mockOkapi.delete).toHaveBeenCalledWith('directory/closures/c1'));
  });

  it('sorts closures by either date, newest first by default', async () => {
    renderDirectory(['/directory/entries/e1/closures']);
    expect(await screen.findByText('fixture-closure')).toBeInTheDocument();

    expect(closureOrder()).toEqual(['fixture-later-closure', 'fixture-closure']);
    expect(columnHeader('startDate')).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.closure.endDate.column' }));
    expect(closureOrder()).toEqual(['fixture-closure', 'fixture-later-closure']);
    expect(columnHeader('endDate')).toHaveAttribute('aria-sort', 'descending');
    expect(columnHeader('startDate')).toHaveAttribute('aria-sort', 'none');

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.closure.startDate.column' }));
    expect(closureOrder()).toEqual(['fixture-later-closure', 'fixture-closure']);
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.closure.startDate.column' }));
    expect(closureOrder()).toEqual(['fixture-closure', 'fixture-later-closure']);
    expect(columnHeader('startDate')).toHaveAttribute('aria-sort', 'ascending');

    expect(screen.queryByRole('button', { name: 'ui-rsdir.closure.reason' })).not.toBeInTheDocument();
  });

  it('opens a closure for editing from its row button', async () => {
    renderDirectory(['/directory/entries/e1/closures']);
    expect(await screen.findByText('fixture-closure')).toBeInTheDocument();

    fireEvent.click(document.getElementById('clickable-edit-closure-c1'));
    expect(screen.getByLabelText(/ui-rsdir\.closure\.reason/)).toHaveValue('fixture-closure');

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.cancel' }));
    expect(screen.queryByLabelText(/ui-rsdir\.closure\.reason/)).not.toBeInTheDocument();
  });

  it('patches only the fields an edit changed and closes the modal', async () => {
    renderDirectory(['/directory/entries/e1/closures']);
    expect(await screen.findByText('fixture-closure')).toBeInTheDocument();

    fireEvent.click(document.getElementById('clickable-edit-closure-c1'));
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.closure\.endDate/), { target: { value: '2026-06-08' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.edit.submit' }));

    await waitFor(() => expect(mockOkapi.patch).toHaveBeenCalledWith(
      'directory/closures/c1',
      { json: { endDate: '2026-06-08' } }
    ));
    await waitFor(() => expect(screen.queryByLabelText(/ui-rsdir\.closure\.reason/)).not.toBeInTheDocument());
  });

  it('refuses an edit that ends a closure before it starts', async () => {
    renderDirectory(['/directory/entries/e1/closures']);
    expect(await screen.findByText('fixture-closure')).toBeInTheDocument();

    fireEvent.click(document.getElementById('clickable-edit-closure-c1'));
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.closure\.endDate/), { target: { value: '2026-03-01' } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'ui-rsdir.edit.submit' })).toBeDisabled());
    expect(mockOkapi.patch).not.toHaveBeenCalled();
  });

  it('creates an entry without a sections pane and opens the new entry', async () => {
    mockOkapi.setResponses(responses({
      'directory/entries/by-id/new-1': { id: 'new-1', name: 'fixture-new', type: 'Institution' },
    }));
    const { history } = renderDirectory(['/directory/entries?query=fix']);

    fireEvent.click(await screen.findByRole('button', { name: 'ui-rsdir.new' }));
    expect(at(history)).toBe('/directory/entries/create?query=fix');
    expect(await screen.findByRole('heading', { name: 'ui-rsdir.createEntry' })).toBeInTheDocument();
    expect(querySectionLink('entry')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ui-rsdir\.entry\.name/), { target: { value: 'fixture-new' } });
    fireEvent.change(screen.getByLabelText(/ui-rsdir\.entry\.type/), { target: { value: 'Institution' } });
    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.create' }));

    await waitFor(() => expect(mockOkapi.post).toHaveBeenCalledWith(
      'directory/entries',
      { json: expect.objectContaining({ name: 'fixture-new', type: 'Institution' }) }
    ));
    await waitFor(() => expect(at(history)).toBe('/directory/entries/new-1?query=fix'));
    expect(await findSectionLink('entry')).toHaveAttribute('href', '/directory/entries/new-1?query=fix');
  });
});
