import React from 'react';
import { act, render } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger, useQuery } from 'react-query';
import RequestCacheSync from './RequestCacheSync';
import { requestKeys } from './requestQueries';

// The transport is covered by BrokerEvents.test.js and the id matching by
// requestQueries.test.js; here we only need to reach the handlers this
// registers, so stand in for the subscription and call them directly.
let handlers;
jest.mock('./BrokerEvents', () => ({
  useBrokerEvents: (h) => { handlers = h; },
}));

const SETTLE_MS = 2 * 1000;
const LIST_QUERY = ['broker/patron_requests', { cql: 'x' }];

const request = { id: 'pr-1', requesterRequestId: 'pr-1' };
const other = { id: 'pr-2', requesterRequestId: 'pr-2' };

const event = (requestingAgencyRequestId) => ({
  event: 'message-requester',
  data: { supplyingAgencyMessage: { header: { requestingAgencyRequestId } } },
});

let queryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Cached detail queries with nothing watching them.
const seedRequest = (record) => {
  const keys = requestKeys(record.id);
  queryClient.setQueryData(keys.record, record);
  queryClient.setQueryData(keys.actions, { actions: [] });
  queryClient.setQueryData(keys.events, []);
};

const isStale = (key) => Boolean((queryClient.getQueryState(key) ?? {}).isInvalidated);

const Watcher = ({ queryKey, queryFn }) => {
  useQuery(queryKey, queryFn, { staleTime: Infinity });
  return null;
};

const renderSync = (children = null) => render(
  <>
    <RequestCacheSync />
    {children}
  </>,
  { wrapper }
);

describe('RequestCacheSync', () => {
  beforeAll(() => {
    setLogger({ error: jest.fn(), log: jest.fn(), warn: jest.fn() });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    handlers = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks a cached request out of date when a peer message names it', () => {
    seedRequest(request);
    renderSync();

    handlers.onEvent(event('pr-1'));

    const keys = requestKeys('pr-1');
    expect(isStale(keys.record)).toBe(true);
    expect(isStale(keys.actions)).toBe(true);
    expect(isStale(keys.events)).toBe(true);
  });

  // An event naming a request never fetched here is what an arrival looks like.
  it('marks the list out of date on any event, resolvable or not', () => {
    queryClient.setQueryData(LIST_QUERY, { items: [] });
    renderSync();

    handlers.onEvent(event('never-seen'));

    expect(isStale(LIST_QUERY)).toBe(true);
  });

  it('leaves the detail queries of unresolvable events alone', () => {
    seedRequest(request);
    renderSync();

    handlers.onEvent(event('someone-else'));
    handlers.onEvent({ event: 'message-requester', data: {} });

    expect(isStale(requestKeys('pr-1').record)).toBe(false);
  });

  it('refetches what is being watched once the request stops moving', async () => {
    seedRequest(request);
    const keys = requestKeys('pr-1');
    const queryFn = jest.fn().mockResolvedValue(request);
    renderSync(<Watcher queryKey={keys.record} queryFn={queryFn} />);

    // Outlasts the settle window, so a timer that never reset would fire early.
    for (let i = 0; i < 3; i += 1) {
      handlers.onEvent(event('pr-1'));
      act(() => { jest.advanceTimersByTime(900); });
    }
    // Still moving: marked, but nothing fetched yet.
    expect(queryFn).not.toHaveBeenCalled();
    expect(isStale(keys.record)).toBe(true);

    await act(async () => { jest.advanceTimersByTime(SETTLE_MS); });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(isStale(keys.record)).toBe(false);
  });

  it('does not refetch a request once nobody is watching it', async () => {
    const keys = requestKeys('pr-1');
    const queryFn = jest.fn().mockResolvedValue(request);
    const { rerender } = renderSync(<Watcher queryKey={keys.record} queryFn={queryFn} />);
    await act(async () => {});
    queryFn.mockClear();

    // Navigating away leaves the entry cached but unwatched.
    rerender(<><RequestCacheSync /></>);

    handlers.onEvent(event('pr-1'));
    await act(async () => { jest.advanceTimersByTime(SETTLE_MS); });

    expect(queryFn).not.toHaveBeenCalled();
    // Still marked, so opening it again refetches.
    expect(isStale(keys.record)).toBe(true);
  });

  // A request nobody has open must not push back the refetch of one on screen.
  it('does not delay a watched request for events about other requests', async () => {
    seedRequest(request);
    seedRequest(other);
    const keys = requestKeys('pr-1');
    const queryFn = jest.fn().mockResolvedValue(request);
    renderSync(<Watcher queryKey={keys.record} queryFn={queryFn} />);
    await act(async () => {});
    queryFn.mockClear();

    handlers.onEvent(event('pr-1'));
    act(() => { jest.advanceTimersByTime(1500); });
    // pr-2 is cached but unwatched, so it has no refetch to schedule.
    handlers.onEvent(event('pr-2'));

    await act(async () => { jest.advanceTimersByTime(600); });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('refreshes chat at once rather than waiting for the request to settle', async () => {
    seedRequest(request);
    const keys = requestKeys('pr-1');
    const chat = jest.fn().mockResolvedValue([]);
    renderSync(<Watcher queryKey={keys.notifications} queryFn={chat} />);
    await act(async () => {});
    chat.mockClear();

    await act(async () => { handlers.onEvent(event('pr-1')); });

    // No timer has run: chat does not wait for the request to stop moving.
    expect(chat).toHaveBeenCalledTimes(1);
  });

  // A fetch that left before the newest event must not come back and pass for
  // the current state.
  it('keeps a request marked when an event lands during its refetch', async () => {
    seedRequest(request);
    const keys = requestKeys('pr-1');
    let finishFetch;
    const queryFn = jest.fn(() => new Promise((resolve) => { finishFetch = resolve; }));
    renderSync(<Watcher queryKey={keys.record} queryFn={queryFn} />);

    handlers.onEvent(event('pr-1'));
    await act(async () => { jest.advanceTimersByTime(SETTLE_MS); });
    expect(queryFn).toHaveBeenCalledTimes(1);

    handlers.onEvent(event('pr-1'));
    await act(async () => { finishFetch(request); });

    expect(isStale(keys.record)).toBe(true);
    await act(async () => { jest.advanceTimersByTime(SETTLE_MS); });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('treats everything held as suspect after a gap in the stream', () => {
    queryClient.setQueryData(LIST_QUERY, { items: [] });
    seedRequest(request);
    // A sub-resource whose request has since been evicted.
    queryClient.setQueryData(requestKeys('gone').actions, { actions: [] });
    renderSync();

    handlers.onGap();

    expect(isStale(LIST_QUERY)).toBe(true);
    expect(isStale(requestKeys('pr-1').record)).toBe(true);
    expect(isStale(requestKeys('gone').actions)).toBe(true);
  });
});
