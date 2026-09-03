import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, screen, waitFor, within } from '@folio/jest-config-stripes/testing-library/react';

import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import RSDir from './index';

// `mock` prefix lets the hoisted jest.mock factory below reference this.
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
};

const responses = (overrides = {}) => ({
  'directory/entries': { items: [entry], about: { count: 1 } },
  'directory/entries/by-id/e1': entry,
  'directory/entries/by-id/e1/tiers': [],
  'directory/tiers': [],
  ...overrides,
});

// The whole app route map, mounted the way stripes mounts it: at the module's
// route, with an explicit history so tests can assert where it navigates.
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

const at = (history) => `${history.location.pathname}${history.location.search}`;

// The entry's own pane, found by the one control only it carries.
const findEntryPane = async () => within(
  (await screen.findByRole('button', { name: 'ui-rsdir.edit' })).closest('section')
);

describe('directory entries', () => {
  beforeEach(() => {
    mockOkapi.mockClear();
    mockOkapi.post.mockClear();
    mockOkapi.setResponses(responses());
  });

  it('opens an entry from the list beside its sections, keeping the search', async () => {
    const { history } = renderDirectory(['/directory/entries?query=fix']);

    fireEvent.click(await screen.findByText('fixture-entry'));
    expect(at(history)).toBe('/directory/entries/e1?query=fix');

    expect((await findEntryPane()).getByText('ISIL:FIX-1')).toBeInTheDocument();
    expect(sectionLink('entry')).toHaveAttribute('href', '/directory/entries/e1?query=fix');
    expect(sectionLink('lmsConfig')).toHaveAttribute('href', '/directory/entries/e1/lmsconfig?query=fix');
    expect(sectionLink('networks')).toHaveAttribute('href', '/directory/entries/e1/networks?query=fix');
  });

  it('switches sections and closes the whole entry back to the list', async () => {
    const { history } = renderDirectory(['/directory/entries/e1?query=fix']);

    fireEvent.click(await findSectionLink('lmsConfig'));
    expect(at(history)).toBe('/directory/entries/e1/lmsconfig?query=fix');
    expect(await screen.findByText('fixture-lms-address')).toBeInTheDocument();
    expect(sectionLink('lmsConfig')).toHaveClass('isActive');
    expect(sectionLink('entry')).not.toHaveClass('isActive');

    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.closeItem' }));
    expect(at(history)).toBe('/directory/entries?query=fix');
    expect(screen.queryByText('fixture-lms-address')).not.toBeInTheDocument();
    expect(querySectionLink('entry')).not.toBeInTheDocument();
  });

  it('edits the entry beside its sections, cancels back to it, and can still close the entry', async () => {
    const { history } = renderDirectory(['/directory/entries/e1?query=fix']);

    fireEvent.click(await screen.findByRole('button', { name: 'ui-rsdir.edit' }));
    expect(at(history)).toBe('/directory/entries/e1/edit?query=fix');
    expect(await screen.findByRole('button', { name: 'ui-rsdir.edit.submit' })).toBeInTheDocument();
    expect(sectionLink('entry')).toHaveClass('isActive');

    fireEvent.click(screen.getByRole('button', { name: 'ui-rsdir.cancel' }));
    await waitFor(() => expect(at(history)).toBe('/directory/entries/e1?query=fix'));
    expect((await findEntryPane()).getByText('ISIL:FIX-1')).toBeInTheDocument();

    // Closing the entry from the form leaves it, rather than stepping back to the view.
    fireEvent.click(await screen.findByRole('button', { name: 'ui-rsdir.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.closeItem' }));
    expect(at(history)).toBe('/directory/entries?query=fix');
  });

  it('manages tiers for a consortium and picks them for any other entry', async () => {
    const { unmount } = renderDirectory(['/directory/entries/e1/tiers']);
    expect(await screen.findByRole('button', { name: 'ui-rsdir.tiers.add' })).toBeInTheDocument();
    expect(sectionLink('tiers')).toHaveClass('isActive');
    unmount();

    mockOkapi.setResponses(responses({
      'directory/entries/by-id/e1': { ...entry, type: 'Consortium' },
    }));
    renderDirectory(['/directory/entries/e1/tiers']);
    expect(await screen.findByRole('button', { name: 'ui-rsdir.add' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ui-rsdir.tiers.add' })).not.toBeInTheDocument();
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
