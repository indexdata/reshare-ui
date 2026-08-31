import React from 'react';
import { act, renderHook } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import useRequestEvents from './useRequestEvents';
import { settlingKey } from './useIsActionPending';

// The transport is covered by BrokerEvents.test.js; here we only need to reach
// the handlers the hook registers, so stand in for the subscription and call
// them directly.
let handlers;
jest.mock('./BrokerEvents', () => ({
  useBrokerEvents: (h) => { handlers = h; },
}));

const request = {
  id: 'pr-1',
  side: 'borrowing',
  requesterRequestId: 'pr-1',
};

const event = (header) => ({
  event: 'message-requester',
  data: { supplyingAgencyMessage: { header } },
});

let queryClient;
let invalidateQueriesSpy;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const renderUseRequestEvents = (req) => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
  return renderHook(() => useRequestEvents(req), { wrapper });
};

const SETTLE_MS = 2 * 1000;

// Everything that waits for the request to stop moving.
const expectInvalidatedFor = (id) => {
  expect(invalidateQueriesSpy).toHaveBeenCalledWith(`broker/patron_requests/${id}`);
  expect(invalidateQueriesSpy).toHaveBeenCalledWith(`broker/patron_requests/${id}/actions`);
  expect(invalidateQueriesSpy).toHaveBeenCalledWith(`broker/patron_requests/${id}/events`);
  // The list is unmounted behind this route; marking it stale keeps the way
  // back from showing the old state.
  expect(invalidateQueriesSpy).toHaveBeenCalledWith('broker/patron_requests');
};

const chatCalls = (id) => invalidateQueriesSpy.mock.calls
  .filter(([key]) => key === `broker/patron_requests/${id}/notifications`).length;

const requestCalls = (id) => invalidateQueriesSpy.mock.calls
  .filter(([key]) => key === `broker/patron_requests/${id}`).length;

const isSettling = (id) => Boolean(queryClient.getQueryData(settlingKey(id)));

// Settling awaits the refetches, so the microtasks have to drain too.
const letItSettle = () => act(async () => { jest.advanceTimersByTime(SETTLE_MS); });

describe('useRequestEvents', () => {
  beforeAll(() => {
    setLogger({ error: jest.fn(), log: jest.fn(), warn: jest.fn() });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    handlers = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refetches the request on an event naming it', async () => {
    renderUseRequestEvents(request);

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));

    await letItSettle();
    expectInvalidatedFor('pr-1');
  });

  it('matches on requesterRequestId when it differs from the record id', async () => {
    renderUseRequestEvents({ ...request, id: 'lending-1', requesterRequestId: 'their-1' });

    handlers.onEvent(event({ requestingAgencyRequestId: 'their-1' }));

    await letItSettle();
    expectInvalidatedFor('lending-1');
  });

  it('matches a requesting-agency message on the supplying id', async () => {
    renderUseRequestEvents(request);

    handlers.onEvent({
      event: 'message-supplier',
      data: { requestingAgencyMessage: { header: { supplyingAgencyRequestId: 'pr-1' } } },
    });

    await letItSettle();
    expectInvalidatedFor('pr-1');
  });

  it('ignores events for other requests on the same queue', () => {
    renderUseRequestEvents(request);

    handlers.onEvent(event({ requestingAgencyRequestId: 'someone-else' }));

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('ignores a payload carrying no ISO 18626 header', () => {
    renderUseRequestEvents(request);

    handlers.onEvent({ event: 'message-requester', data: {} });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('refetches after a gap in the stream, with no event to match on', async () => {
    renderUseRequestEvents(request);

    handlers.onGap();

    await letItSettle();
    expectInvalidatedFor('pr-1');
  });

  it('refetches chat straight away, without waiting for the request to settle', () => {
    renderUseRequestEvents(request);

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));

    // Chat is conversational; making it wait gives up most of the benefit.
    expect(chatCalls('pr-1')).toBe(1);
    expect(requestCalls('pr-1')).toBe(0);
  });

  it('holds the request unsettled from the event until the refetch', async () => {
    renderUseRequestEvents(request);

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));

    // The actions on screen predate the message, so they are withdrawn.
    expect(isSettling('pr-1')).toBe(true);

    await letItSettle();
    expect(isSettling('pr-1')).toBe(false);
  });

  it('coalesces a burst of transitions into one refetch', async () => {
    renderUseRequestEvents(request);

    for (let i = 0; i < 5; i += 1) {
      handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));
      act(() => { jest.advanceTimersByTime(400); });
    }
    // Still moving, so nothing has been refetched and the actions stay away.
    expect(requestCalls('pr-1')).toBe(0);
    expect(isSettling('pr-1')).toBe(true);

    await letItSettle();
    expect(requestCalls('pr-1')).toBe(1);
  });

  it('stays unsettled when an event lands while the refetch is in flight', async () => {
    renderUseRequestEvents(request);

    let finishRefetch;
    const inFlight = new Promise((resolve) => { finishRefetch = resolve; });
    invalidateQueriesSpy.mockImplementation((key) => (
      key === 'broker/patron_requests/pr-1' ? inFlight : Promise.resolve()
    ));

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));
    act(() => { jest.advanceTimersByTime(SETTLE_MS); });

    // The refetch cannot answer for a message that arrived after it started, so
    // the actions have to wait for the one this queues behind it.
    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));
    await act(async () => { finishRefetch(); });
    expect(isSettling('pr-1')).toBe(true);

    await letItSettle();
    expect(isSettling('pr-1')).toBe(false);
  });

  it('still refreshes, and releases the actions, when the hook goes away mid-change', () => {
    const { unmount } = renderUseRequestEvents(request);

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));
    expect(isSettling('pr-1')).toBe(true);
    expect(requestCalls('pr-1')).toBe(0);

    // Navigating away inside the settle window must not discard the refresh,
    // and must not leave the next viewer with dead actions.
    unmount();
    expect(requestCalls('pr-1')).toBe(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith('broker/patron_requests');
    expect(isSettling('pr-1')).toBe(false);
  });

  it('does nothing before the request has loaded', () => {
    renderUseRequestEvents(undefined);

    handlers.onEvent(event({ requestingAgencyRequestId: 'pr-1' }));
    handlers.onGap();

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
