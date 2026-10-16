import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import useEntryChildren from './useEntryChildren';

const mockKy = jest.fn();

jest.mock('@folio/stripes/core', () => ({
  useOkapiKy: () => mockKy,
}));

const Probe = ({ entry, childType }) => {
  const query = useEntryChildren(entry, childType);
  return <div>{query.isSuccess ? JSON.stringify(query.data) : 'pending'}</div>;
};

const renderChildren = (entry, childType) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <Probe entry={entry} childType={childType} />
    </QueryClientProvider>
  );
};

beforeEach(() => mockKy.mockReset());

it.each([
  ['Consortium', 'Institution'],
  ['Institution', 'Branch'],
])('fetches every child beyond 1000 for %s (%s)', async (type, childType) => {
  const children = Array.from({ length: 1002 }, (_, i) => ({ id: String(i), type: childType }));
  mockKy.mockImplementation((_path, { searchParams: { offset, limit } }) => ({
    json: async () => {
      const items = children.slice(offset, offset + limit);
      return { items, about: { count: children.length } };
    },
  }));

  renderChildren({ id: 'parent', type }, childType);
  await screen.findByText(JSON.stringify(children));
  expect(mockKy.mock.calls.map(([, options]) => options.searchParams.offset))
    .toEqual([0, 1000]);
  expect(mockKy).toHaveBeenCalledWith('directory/entries', {
    signal: expect.anything(),
    searchParams: { cql: `type=${childType} and parent=parent`, limit: 1000, offset: 1000 },
  });
});

it('follows server-capped pages without a total until an empty page', async () => {
  const children = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  mockKy.mockImplementation((_path, { searchParams: { offset } }) => ({
    json: async () => ({ items: children.slice(offset, offset + 2) }),
  }));
  renderChildren({ id: 'parent', type: 'Institution' }, 'Branch');
  await screen.findByText(JSON.stringify(children));
  expect(mockKy.mock.calls.map(([, options]) => options.searchParams.offset)).toEqual([0, 2, 3]);
});

it('stops at a reported total of exactly 1000', async () => {
  const count = 1000;
  const children = Array.from({ length: count }, (_, i) => ({ id: String(i) }));
  mockKy.mockReturnValue({ json: async () => ({ items: children, about: { count } }) });
  renderChildren({ id: 'parent', type: 'Consortium' }, 'Institution');
  await screen.findByText(JSON.stringify(children));
  expect(mockKy).toHaveBeenCalledTimes(1);
});

it('does not request children for a Branch entry', async () => {
  renderChildren({ id: 'branch', type: 'Branch' }, 'Branch');
  await waitFor(() => expect(screen.getByText('pending')).toBeTruthy());
  expect(mockKy).not.toHaveBeenCalled();
});
