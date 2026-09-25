import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';

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
