import React from 'react';
import { renderHook, act } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import useIsActionPending, { settlingKey } from './useIsActionPending';

let queryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const renderIsActionPending = (reqId) => renderHook(() => useIsActionPending(reqId), { wrapper });

describe('useIsActionPending', () => {
  beforeAll(() => {
    setLogger({ error: jest.fn(), log: jest.fn(), warn: jest.fn() });
  });

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('reports nothing pending for a request that is sitting still', () => {
    const { result } = renderIsActionPending('pr-1');

    expect(result.current).toBe(false);
  });

  // The seam useRequestEvents relies on: it writes the entry, and watching
  // components have to hear about it.
  it('reports pending while the request is settling, and stops when it is done', async () => {
    const { result } = renderIsActionPending('pr-1');

    await act(async () => { queryClient.setQueryData(settlingKey('pr-1'), true); });
    expect(result.current).toBe(true);

    await act(async () => { queryClient.setQueryData(settlingKey('pr-1'), false); });
    expect(result.current).toBe(false);
  });

  // Callers pass `request?.id`, so this is the window before the request loads.
  it('reports nothing without a request id, whatever else is going on', async () => {
    const { result } = renderIsActionPending(undefined);

    await act(async () => { queryClient.setQueryData(settlingKey('pr-1'), true); });
    await act(async () => { queryClient.setQueryData(settlingKey(undefined), true); });

    expect(result.current).toBe(false);
  });

  it('is unmoved by another request on the same queue settling', async () => {
    const { result } = renderIsActionPending('pr-1');

    await act(async () => { queryClient.setQueryData(settlingKey('pr-2'), true); });

    expect(result.current).toBe(false);
  });
});
