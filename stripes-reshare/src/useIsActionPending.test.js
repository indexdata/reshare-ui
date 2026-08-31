import React from 'react';
import { renderHook, act } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger, useMutation } from 'react-query';
import useIsActionPending from './useIsActionPending';
import { requestKeys } from './requestQueries';

let queryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const renderIsActionPending = (reqId) => renderHook(() => useIsActionPending(reqId), { wrapper });

const cacheKeys = (id) => {
  const paths = requestKeys(id);
  return {
    record: [paths.record, { notifyOnChangeProps: 'tracked' }],
    actions: [paths.actions],
    notifications: [paths.notifications, { limit: 1000 }],
  };
};

const seed = (id) => {
  const keys = cacheKeys(id);
  queryClient.setQueryData(keys.record, { id });
  queryClient.setQueryData(keys.actions, { actions: [] });
  queryClient.setQueryData(keys.notifications, { items: [] });
};

const markStale = (key) => queryClient.invalidateQueries(key, { refetchActive: false });

describe('useIsActionPending', () => {
  beforeAll(() => {
    setLogger({ error: jest.fn(), log: jest.fn(), warn: jest.fn() });
  });

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  // The seam RequestCacheSync relies on: marking a request has to reach every
  // component watching it.
  it.each([['the request', 'record'], ['its action list', 'actions']])(
    'reports pending while %s is marked out of date', async (_, key) => {
      seed('pr-1');
      const { result } = renderIsActionPending('pr-1');
      expect(result.current).toBe(false);

      await act(async () => { markStale(requestKeys('pr-1')[key]); });

      expect(result.current).toBe(true);
    }
  );

  it('stops reporting pending once fresh data lands', async () => {
    seed('pr-1');
    const { result } = renderIsActionPending('pr-1');

    await act(async () => { markStale(requestKeys('pr-1').record); });
    await act(async () => {
      queryClient.setQueryData(cacheKeys('pr-1').record, { id: 'pr-1' });
    });

    expect(result.current).toBe(false);
  });

  // Chat going stale says nothing about whether the actions are still the right
  // ones, and neither does another request moving.
  it.each([
    ['another request on the same queue', () => requestKeys('pr-2').record],
    ['this request\'s chat', () => requestKeys('pr-1').notifications],
  ])('is unmoved by %s', async (_, key) => {
    seed('pr-1');
    seed('pr-2');
    const { result } = renderIsActionPending('pr-1');

    await act(async () => { markStale(key()); });

    expect(result.current).toBe(false);
  });

  // Nothing is coming to clear the mark, so holding the actions would hold them
  // for good.
  it('releases the actions when the refetch of a marked request fails', async () => {
    seed('pr-1');
    const { result } = renderIsActionPending('pr-1');

    await act(async () => {
      markStale(requestKeys('pr-1').record);
      await queryClient.fetchQuery(cacheKeys('pr-1').record, () => Promise.reject(new Error('nope')))
        .catch(() => {});
    });

    expect(result.current).toBe(false);
  });

  // The other half of the hook: a post this caller has in flight.
  it('reports pending while an action post for the request is in flight', async () => {
    seed('pr-1');
    let resolvePost;
    const { result } = renderHook(() => {
      const post = useMutation(
        () => new Promise((resolve) => { resolvePost = resolve; }),
        { mutationKey: ['@reshare/stripes-reshare', 'performAction'] }
      );
      return { pending: useIsActionPending('pr-1'), post };
    }, { wrapper });

    await act(async () => { result.current.post.mutate({ id: 'pr-1' }); });
    expect(result.current.pending).toBe(true);

    await act(async () => { resolvePost({}); });
    expect(result.current.pending).toBe(false);
  });

  // Callers pass `request?.id`, so this is the window before the request loads.
  it('reports nothing without a request id', async () => {
    seed('pr-1');
    const { result } = renderIsActionPending(undefined);

    await act(async () => { markStale(requestKeys('pr-1').record); });

    expect(result.current).toBe(false);
  });
});
