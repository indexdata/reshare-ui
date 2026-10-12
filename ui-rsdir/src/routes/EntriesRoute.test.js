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

it('submits a contains search for Name and retains the selected index', async () => {
  const { history } = renderList();
  await screen.findByText('University Central Library');
  submitSearch('Central', 'name');

  await waitFor(() => expect(lastParams().get('cql')).toBe('name="*Central*"'));
  expect(new URLSearchParams(history.location.search).get('qindex')).toBe('name');
  expect(indexInput().value).toBe('name');
  expect(queryInput().value).toBe('Central');
});

it('submits All fields through the form and searches name and description', async () => {
  renderList();
  await screen.findByText('University Central Library');
  fireEvent.change(queryInput(), { target: { name: 'query', value: 'Central' } });
  // Enter in the search input invokes the same native form submission.
  fireEvent.submit(queryInput().closest('form'));

  await waitFor(() => expect(lastParams().get('cql'))
    .toBe('(name="*Central*" or description="*Central*")'));
  expect(indexInput().value).toBe('');
});

it('restores the index on direct navigation and browser back/forward', async () => {
  const { history } = renderList('?qindex=name&query=Central');
  await screen.findByText('University Central Library');
  expect(indexInput().value).toBe('name');
  expect(queryInput().value).toBe('Central');
  submitSearch('Library');
  await waitFor(() => expect(lastParams().get('cql'))
    .toBe('(name="*Library*" or description="*Library*")'));
  expect(indexInput().value).toBe('');

  act(() => history.goBack());
  await waitFor(() => expect(indexInput().value).toBe('name'));
  expect(queryInput().value).toBe('Central');
  act(() => history.goForward());
  await waitFor(() => expect(indexInput().value).toBe(''));
  expect(queryInput().value).toBe('Library');
});

it.each(['clear', 'reset'])('%s removes the applied query and index', async action => {
  const { history } = renderList('?qindex=name&query=Central');
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

it('escapes quotes and backslashes in contains searches', async () => {
  renderList();
  await screen.findByText('University Central Library');
  submitSearch('A"B\\C', 'name');
  await waitFor(() => expect(lastParams().get('cql')).toBe('name="*A\\"B\\\\C*"'));
});

it('returns to page one when submitting a new search from a later page', async () => {
  renderList();
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
  const { history, queryClient } = renderList('?qindex=name&query=Central');
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
  const { history, queryClient } = renderList('?qindex=name&query=Central');
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
