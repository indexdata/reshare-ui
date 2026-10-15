import React from 'react';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { act, fireEvent, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';
import { renderWithRs } from '@projectreshare/stripes-reshare/testing/renderWithRs';
import { makeOkapiKyMock } from '@projectreshare/stripes-reshare/testing/okapiKyMock';
import EntriesRoute from './EntriesRoute';

const mockOkapi = makeOkapiKyMock();

jest.mock('@folio/stripes/core', () => require('@projectreshare/stripes-reshare/testing/stripesCore')
  .makeStripesCoreMock(() => mockOkapi));
jest.mock('@folio/stripes-components/lib/Icon', () => require('@projectreshare/stripes-reshare/testing/iconMock').default);
jest.mock('@projectreshare/stripes-reshare', () => ({
  DirectLink: ({ children }) => <span>{children}</span>,
}));
// Keep search controls and SearchAndSortQuery real. Replace the virtualized list
// with a paging control so tests can drive Entries' offset without layout timing.
jest.mock('@folio/stripes/components', () => ({
  ...jest.requireActual('@folio/stripes/components'),
  MultiColumnList: ({ contentData, onNeedMoreData, pageAmount }) => {
    const offset = Math.max(0, contentData.findIndex(Boolean));
    return (
      <div>
        {contentData.map(entry => <div key={entry.id}>{entry.name}</div>)}
        <button type="button" onClick={() => onNeedMoreData(pageAmount, offset + pageAmount)}>Next page</button>
        <button disabled={offset === 0} type="button" onClick={() => onNeedMoreData(pageAmount, offset - pageAmount)}>
          Previous page
        </button>
      </div>
    );
  },
}));

const queryInput = () => document.querySelector('input[name="query"]');
const indexInput = () => document.querySelector('select[name="qindex"]');
const pickupCheckbox = () => screen.getByRole('checkbox', { name: 'ui-rsdir.filter.pickupLocation' });
const typeInput = () => screen.getByRole('combobox', { name: 'ui-rsdir.entry.type' });
const lastParams = () => new URLSearchParams(mockOkapi.calledUrls().at(-1).split('?')[1]);

const renderList = (search = '') => {
  const history = createMemoryHistory({ initialEntries: [`/directory/entries${search}`] });
  return {
    history,
    ...renderWithRs(<Route path="/directory/entries"><EntriesRoute /></Route>, { history }),
  };
};

const submitSearch = (query, index = '') => {
  fireEvent.change(indexInput(), { target: { name: 'qindex', value: index } });
  fireEvent.change(queryInput(), { target: { name: 'query', value: query } });
  fireEvent.click(document.querySelector('button[type="submit"]'));
};

beforeEach(() => {
  mockOkapi.mockClear();
  mockOkapi.setResponses({
    'directory/entries': url => {
      const params = new URLSearchParams(url.split('?')[1]);
      const offset = Number(params.get('offset'));
      return {
        items: [{ id: `entry-${offset}`, name: offset ? 'Second page entry' : 'University Central Library' }],
        about: { count: 101 },
      };
    },
  });
});

it('defaults to Institution before the first request without adding a history entry', async () => {
  const { history } = renderList();
  await screen.findByText('University Central Library');
  expect(typeInput().value).toBe('Institution');
  expect(new URLSearchParams(history.location.search).get('filters')).toBe('type.Institution');
  expect(history.length).toBe(1);
  expect(mockOkapi.calledUrls()).toHaveLength(1);
  expect(lastParams().get('cql')).toBe('type=="Institution"');
});

it('preserves URL parameters and combines the default type with searches', async () => {
  const { history } = renderList('?qindex=name&query=Central&extra=kept');
  await screen.findByText('University Central Library');
  expect(lastParams().get('cql')).toBe('(name="*Central*") and type=="Institution"');
  expect(new URLSearchParams(history.location.search).get('extra')).toBe('kept');
  expect(indexInput().value).toBe('name');
  expect(queryInput().value).toBe('Central');
  submitSearch('Library', 'name');
  await waitFor(() => expect(lastParams().get('cql')).toBe('(name="*Library*") and type=="Institution"'));
});

it.each(['clear', 'reset'])('%s removes the default type and browser navigation keeps it cleared', async action => {
  const { history } = renderList();
  await screen.findByText('University Central Library');
  if (action === 'clear') {
    fireEvent.change(typeInput(), { target: { value: '' } });
  } else {
    fireEvent.click(document.getElementById('clickable-reset-all'));
  }
  await waitFor(() => expect(lastParams().has('cql')).toBe(false));
  expect(typeInput().value).toBe('');
  expect(new URLSearchParams(history.location.search).has('filters')).toBe(false);
  expect(document.getElementById('clickable-reset-all')).toBeDisabled();

  act(() => history.goBack());
  await waitFor(() => expect(typeInput().value).toBe('Institution'));
  act(() => history.goForward());
  await waitFor(() => expect(typeInput().value).toBe(''));
  expect(document.getElementById('clickable-reset-all')).toBeDisabled();
});

it('respects an explicitly empty filter parameter on entry', async () => {
  renderList('?filters=');
  await screen.findByText('University Central Library');
  expect(typeInput().value).toBe('');
  expect(lastParams().has('cql')).toBe(false);
});

it('submits a contains search for Name and retains the selected index', async () => {
  const { history } = renderList('?filters=');
  await screen.findByText('University Central Library');
  submitSearch('Central', 'name');

  await waitFor(() => expect(lastParams().get('cql')).toBe('name="*Central*"'));
  expect(new URLSearchParams(history.location.search).get('qindex')).toBe('name');
  expect(indexInput().value).toBe('name');
  expect(queryInput().value).toBe('Central');
});

it('submits All fields through the form using serverChoice without added wildcards', async () => {
  renderList('?filters=');
  await screen.findByText('University Central Library');
  fireEvent.change(queryInput(), { target: { name: 'query', value: 'Central Library' } });
  // Enter in the search input invokes the same native form submission.
  fireEvent.submit(queryInput().closest('form'));

  await waitFor(() => expect(lastParams().get('cql'))
    .toBe('cql.serverChoice="Central Library"'));
  expect(indexInput().value).toBe('');
});

it.each([
  ['description', 'Central Library', 'description="*Central Library*"'],
  ['symbol', 'ABC', 'symbol="ABC"'],
  ['symbol', 'ISIL:ABC', 'symbol="ISIL:ABC"'],
])('submits %s search for %s and retains the selected index', async (index, query, cql) => {
  const { history } = renderList('?filters=');
  await screen.findByText('University Central Library');
  submitSearch(query, index);

  await waitFor(() => expect(lastParams().get('cql')).toBe(cql));
  expect(new URLSearchParams(history.location.search).get('qindex')).toBe(index);
  expect(indexInput().value).toBe(index);
  expect(queryInput().value).toBe(query);
});

it('preserves a user-entered prefix wildcard in All fields', async () => {
  renderList('?filters=');
  await screen.findByText('University Central Library');
  submitSearch('Centr*');
  await waitFor(() => expect(lastParams().get('cql')).toBe('cql.serverChoice="Centr*"'));
});

it.each(['Consortium', 'Institution', 'Branch'])('immediately filters by %s without text and clears the type filter', async type => {
  const { history } = renderList('?filters=');
  await screen.findByText('University Central Library');
  expect(Array.from(typeInput().options, option => option.value)).toEqual(['', 'Consortium', 'Institution', 'Branch']);
  expect(typeInput().value).toBe('');
  fireEvent.change(typeInput(), { target: { value: type } });
  await waitFor(() => expect(lastParams().get('cql')).toBe(`type=="${type}"`));
  expect(new URLSearchParams(history.location.search).get('filters')).toBe(`type.${type}`);
  expect(document.getElementById('clickable-reset-all')).toBeEnabled();

  fireEvent.change(typeInput(), { target: { value: '' } });
  await waitFor(() => expect(new URLSearchParams(history.location.search).has('filters')).toBe(false));
  expect(typeInput().value).toBe('');
  expect(screen.getByText('University Central Library')).toBeInTheDocument();
});

it('combines type with text and pickup, and clears only the type restriction', async () => {
  const { history, queryClient } = renderList('?qindex=name&query=Central&filters=isPickupLocation.true');
  await screen.findByText('University Central Library');
  fireEvent.change(typeInput(), { target: { value: 'Branch' } });
  await waitFor(() => expect(lastParams().get('cql')).toBe('(name="*Central*") and isPickupLocation=true and type=="Branch"'));
  queryClient.removeQueries(['directory/entries', '(name="*Central*") and isPickupLocation=true']);
  fireEvent.change(typeInput(), { target: { value: '' } });
  await waitFor(() => expect(lastParams().get('cql')).toBe('(name="*Central*") and isPickupLocation=true'));
  expect(new URLSearchParams(history.location.search).get('filters')).toBe('isPickupLocation.true');
  expect(pickupCheckbox()).toBeChecked();
  expect(queryInput().value).toBe('Central');
});

it.each([
  'type.Branch', 'isPickupLocation.true', 'type.Branch,isPickupLocation.true',
])('enables Reset all when browser Back restores %s, and clears the restored filters', async filters => {
  const { history } = renderList(`?filters=${filters}`);
  await screen.findByText('University Central Library');
  fireEvent.click(document.getElementById('clickable-reset-all'));
  await waitFor(() => expect(new URLSearchParams(history.location.search).has('filters')).toBe(false));
  expect(document.getElementById('clickable-reset-all')).toBeDisabled();

  act(() => history.goBack());
  await waitFor(() => expect(new URLSearchParams(history.location.search).get('filters')).toBe(filters));
  expect(document.getElementById('clickable-reset-all')).toBeEnabled();
  expect(typeInput().value).toBe(filters.includes('type.Branch') ? 'Branch' : '');
  expect(pickupCheckbox().checked).toBe(filters.includes('isPickupLocation.true'));

  act(() => history.goForward());
  await waitFor(() => expect(document.getElementById('clickable-reset-all')).toBeDisabled());
  act(() => history.goBack());
  await waitFor(() => expect(document.getElementById('clickable-reset-all')).toBeEnabled());
  fireEvent.click(document.getElementById('clickable-reset-all'));
  await waitFor(() => expect(new URLSearchParams(history.location.search).has('filters')).toBe(false));
  expect(typeInput().value).toBe('');
  expect(pickupCheckbox()).not.toBeChecked();
  expect(document.getElementById('clickable-reset-all')).toBeDisabled();
});

it('enables Reset all when browser Back restores a text search', async () => {
  const { history } = renderList('?qindex=name&query=Central&filters=');
  await screen.findByText('University Central Library');
  fireEvent.click(document.getElementById('clickable-reset-all'));
  await waitFor(() => expect(new URLSearchParams(history.location.search).has('query')).toBe(false));
  act(() => history.goBack());
  await waitFor(() => expect(queryInput().value).toBe('Central'));
  expect(document.getElementById('clickable-reset-all')).toBeEnabled();
});

it('restores type on direct navigation and browser back/forward', async () => {
  const { history } = renderList('?filters=type.Institution');
  await screen.findByText('University Central Library');
  expect(lastParams().get('cql')).toBe('type=="Institution"');
  expect(typeInput().value).toBe('Institution');
  fireEvent.change(typeInput(), { target: { value: 'Consortium' } });
  await waitFor(() => expect(lastParams().get('cql')).toBe('type=="Consortium"'));
  act(() => history.goBack());
  await waitFor(() => expect(typeInput().value).toBe('Institution'));
  act(() => history.goForward());
  await waitFor(() => expect(typeInput().value).toBe('Consortium'));
});

it('preserves type when changing pickup or submitting and clearing text, then resets both filters', async () => {
  const { history } = renderList('?qindex=name&query=Central&filters=type.Branch');
  await screen.findByText('University Central Library');
  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(lastParams().get('cql')).toBe('(name="*Central*") and type=="Branch" and isPickupLocation=true'));
  submitSearch('Library', 'name');
  await waitFor(() => expect(lastParams().get('cql')).toBe('(name="*Library*") and type=="Branch" and isPickupLocation=true'));
  fireEvent.click(screen.getByRole('button', { name: 'stripes-components.clearThisField' }));
  await waitFor(() => expect(lastParams().get('cql')).toBe('type=="Branch" and isPickupLocation=true'));
  expect(typeInput().value).toBe('Branch');
  expect(pickupCheckbox()).toBeChecked();
  fireEvent.click(document.getElementById('clickable-reset-all'));
  await waitFor(() => expect(lastParams().has('cql')).toBe(false));
  expect(typeInput().value).toBe('');
  expect(pickupCheckbox()).not.toBeChecked();
  expect(new URLSearchParams(history.location.search).has('filters')).toBe(false);
});

it('returns to page one when changing type, including cached results', async () => {
  const { queryClient } = renderList('?filters=type.Institution');
  await screen.findByText('University Central Library');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  fireEvent.change(typeInput(), { target: { value: 'Branch' } });
  await waitFor(() => expect(lastParams().get('cql')).toBe('type=="Branch"'));
  await screen.findByText('University Central Library');
  expect(lastParams().get('offset')).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  const requestsBeforeChange = mockOkapi.calledUrls().length;
  fireEvent.change(typeInput(), { target: { value: 'Institution' } });
  await screen.findByText('University Central Library');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  fireEvent.change(typeInput(), { target: { value: 'Branch' } });
  await waitFor(() => expect(typeInput().value).toBe('Branch'));
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  expect(mockOkapi.calledUrls()).toHaveLength(requestsBeforeChange);
  queryClient.clear();
});

it('immediately applies and removes the pickup filter without a text query', async () => {
  const { history } = renderList('?filters=');
  await screen.findByText('University Central Library');
  expect(pickupCheckbox()).not.toBeChecked();
  expect(document.getElementById('clickable-reset-all')).toBeDisabled();

  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(lastParams().get('cql')).toBe('isPickupLocation=true'));
  expect(new URLSearchParams(history.location.search).get('filters')).toBe('isPickupLocation.true');
  expect(document.getElementById('clickable-reset-all')).toBeEnabled();

  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(new URLSearchParams(history.location.search).has('filters')).toBe(false));
  expect(pickupCheckbox()).not.toBeChecked();
  expect(document.querySelector('button[type="submit"]')).toBeDisabled();
  expect(screen.getByText('University Central Library')).toBeInTheDocument();
});

it.each([
  ['', 'cql.serverChoice="Central"'],
  ['name', 'name="*Central*"'],
  ['description', 'description="*Central*"'],
  ['symbol', 'symbol="Central"'],
])('combines the pickup filter with the %s index and preserves it on submission', async (index, cql) => {
  renderList(`?qindex=${index}&query=Central&filters=`);
  await screen.findByText('University Central Library');
  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(lastParams().get('cql')).toBe(`(${cql}) and isPickupLocation=true`));

  submitSearch('Library', index);
  await waitFor(() => expect(lastParams().get('cql')).toBe(`(${cql.replace('Central', 'Library')}) and isPickupLocation=true`));
  expect(pickupCheckbox()).toBeChecked();
});

it('restores the pickup filter on direct navigation and browser back/forward', async () => {
  const { history } = renderList('?filters=isPickupLocation.true');
  await screen.findByText('University Central Library');
  expect(lastParams().get('cql')).toBe('isPickupLocation=true');
  expect(pickupCheckbox()).toBeChecked();
  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(lastParams().has('cql')).toBe(false));

  act(() => history.goBack());
  await waitFor(() => expect(pickupCheckbox()).toBeChecked());
  expect(new URLSearchParams(history.location.search).get('filters')).toBe('isPickupLocation.true');
  act(() => history.goForward());
  await waitFor(() => expect(pickupCheckbox()).not.toBeChecked());
});

it('Reset all clears a pickup-only filter', async () => {
  const { history } = renderList('?filters=isPickupLocation.true');
  await screen.findByText('University Central Library');
  fireEvent.click(document.getElementById('clickable-reset-all'));
  await waitFor(() => expect(lastParams().has('cql')).toBe(false));
  expect(pickupCheckbox()).not.toBeChecked();
  expect(new URLSearchParams(history.location.search).has('filters')).toBe(false);
});

it.each(['clear', 'reset'])('%s handles a combined text search and pickup filter', async action => {
  const { history } = renderList('?qindex=name&query=Central&filters=isPickupLocation.true');
  await screen.findByText('University Central Library');
  if (action === 'clear') {
    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.clearThisField' }));
    await waitFor(() => expect(lastParams().get('cql')).toBe('isPickupLocation=true'));
    expect(pickupCheckbox()).toBeChecked();
  } else {
    fireEvent.click(document.getElementById('clickable-reset-all'));
    await waitFor(() => expect(lastParams().has('cql')).toBe(false));
    expect(pickupCheckbox()).not.toBeChecked();
    expect(new URLSearchParams(history.location.search).has('filters')).toBe(false);
  }
  expect(queryInput().value).toBe('');
  expect(indexInput().value).toBe('');
  expect(new URLSearchParams(history.location.search).has('query')).toBe(false);
});

it('returns to page one when toggling the pickup filter, including cached results', async () => {
  const { queryClient } = renderList('?filters=');
  await screen.findByText('University Central Library');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(lastParams().get('cql')).toBe('isPickupLocation=true'));
  await screen.findByText('University Central Library');
  expect(lastParams().get('offset')).toBe('0');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  const requestsBeforeToggle = mockOkapi.calledUrls().length;
  fireEvent.click(pickupCheckbox());
  await screen.findByText('University Central Library');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  expect(mockOkapi.calledUrls()).toHaveLength(requestsBeforeToggle);
  fireEvent.click(pickupCheckbox());
  await waitFor(() => expect(pickupCheckbox()).toBeChecked());
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  expect(mockOkapi.calledUrls()).toHaveLength(requestsBeforeToggle);
  queryClient.clear();
});

it.each(['name', 'description', 'symbol'])('restores %s on direct navigation and browser back/forward', async index => {
  const { history } = renderList(`?qindex=${index}&query=Central&filters=`);
  await screen.findByText('University Central Library');
  expect(indexInput().value).toBe(index);
  expect(queryInput().value).toBe('Central');
  submitSearch('Library');
  await waitFor(() => expect(lastParams().get('cql'))
    .toBe('cql.serverChoice="Library"'));
  expect(indexInput().value).toBe('');

  act(() => history.goBack());
  await waitFor(() => expect(indexInput().value).toBe(index));
  expect(queryInput().value).toBe('Central');
  act(() => history.goForward());
  await waitFor(() => expect(indexInput().value).toBe(''));
  expect(queryInput().value).toBe('Library');
});

it.each([
  ['clear', 'name'], ['reset', 'name'],
  ['clear', 'description'], ['reset', 'description'],
  ['clear', 'symbol'], ['reset', 'symbol'],
])('%s removes the applied query and %s index', async (action, index) => {
  const { history } = renderList(`?qindex=${index}&query=Central&filters=`);
  await screen.findByText('University Central Library');
  if (action === 'clear') {
    fireEvent.click(screen.getByRole('button', { name: 'stripes-components.clearThisField' }));
  } else {
    fireEvent.click(document.getElementById('clickable-reset-all'));
  }

  await waitFor(() => expect(lastParams().has('cql')).toBe(false));
  expect(new URLSearchParams(history.location.search).has('query')).toBe(false);
  expect(new URLSearchParams(history.location.search).has('qindex')).toBe(false);
  expect(queryInput().value).toBe('');
  expect(indexInput().value).toBe('');
});

it.each([
  ['name', 'name="*A\\"B\\\\C*"'],
  ['description', 'description="*A\\"B\\\\C*"'],
  ['symbol', 'symbol="A\\"B\\\\C"'],
  ['', 'cql.serverChoice="A\\"B\\\\C"'],
])('escapes quotes and backslashes for the %s index', async (index, cql) => {
  renderList('?filters=');
  await screen.findByText('University Central Library');
  submitSearch('A"B\\C', index);
  await waitFor(() => expect(lastParams().get('cql')).toBe(cql));
});

it('returns to page one when submitting a new search from a later page', async () => {
  renderList('?filters=');
  await screen.findByText('University Central Library');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  submitSearch('Central', 'name');
  await waitFor(() => expect(lastParams().get('cql')).toBe('name="*Central*"'));
  await screen.findByText('University Central Library');
  expect(lastParams().get('offset')).toBe('0');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
});

it('returns to page one when switching to an already cached search', async () => {
  const { history, queryClient } = renderList('?qindex=name&query=Central&filters=');
  await screen.findByText('University Central Library');
  submitSearch('Library', 'name');
  await waitFor(() => expect(lastParams().get('cql')).toBe('name="*Library*"'));
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Second page entry');
  expect(lastParams().get('offset')).toBe('100');

  act(() => history.goBack());
  await screen.findByText('University Central Library');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  act(() => history.goForward());
  await screen.findByText('University Central Library');
  expect(screen.queryByText('Second page entry')).not.toBeInTheDocument();
  queryClient.clear();
});

it('reuses cached pages after revisiting a search and correctly loads subsequent pages', async () => {
  mockOkapi.setResponses({
    'directory/entries': url => {
      const offset = Number(new URLSearchParams(url.split('?')[1]).get('offset'));
      return { items: [{ id: `entry-${offset}`, name: `Page ${offset}` }], about: { count: 301 } };
    },
  });
  const { history, queryClient } = renderList('?qindex=name&query=Central&filters=');
  await screen.findByText('Page 0');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Page 100');
  submitSearch('Library', 'name');
  await screen.findByText('Page 0');
  act(() => history.goBack());
  await screen.findByText('Page 0');
  const requestsBeforePaging = mockOkapi.calledUrls().length;

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Page 100');
  expect(mockOkapi.calledUrls()).toHaveLength(requestsBeforePaging);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Page 200');
  expect(lastParams().get('offset')).toBe('200');
  const requestsAfterNewPage = mockOkapi.calledUrls().length;

  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  await screen.findByText('Page 100');
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  await screen.findByText('Page 0');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Page 100');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Page 200');
  expect(mockOkapi.calledUrls()).toHaveLength(requestsAfterNewPage);
  const cached = queryClient.getQueryData(['directory/entries', 'name="*Central*"', '@projectreshare/rsdir']);
  expect(cached.pageParams.map(offset => offset ?? 0)).toEqual([0, 100, 200]);
  expect(cached.pages).toHaveLength(3);
  queryClient.clear();
});
