import React from 'react';
import { TextDecoder, TextEncoder } from 'util';
import { act, render, renderHook, waitFor } from '@folio/jest-config-stripes/testing-library/react';
import { BrokerEventsProvider, useBrokerEvents } from './BrokerEvents';

// jsdom exposes neither, and reading the stream needs both.
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

const encoder = new TextEncoder();

let mockLiveUpdates = true;
const mockGet = jest.fn();

jest.mock('./useOkapiKy', () => () => ({ get: mockGet }));

jest.mock('@folio/stripes/core', () => ({
  useStripes: () => ({ config: { reshare: { liveUpdates: mockLiveUpdates } } }),
}));

const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

// One server-side connection the test drives: `send` writes raw stream text,
// `end` closes it cleanly, and aborting the provider's signal rejects the
// pending read the way a torn-down fetch body does.
const makeConnection = (signal) => {
  const queued = [];
  let waiting = null;
  let ended = false;

  const conn = {
    aborted: false,
    send: (text) => {
      const value = encoder.encode(text);
      if (waiting) {
        const { resolve } = waiting;
        waiting = null;
        resolve({ done: false, value });
      } else {
        queued.push(value);
      }
    },
    end: () => {
      ended = true;
      if (waiting) {
        const { resolve } = waiting;
        waiting = null;
        resolve({ done: true, value: undefined });
      }
    },
    reader: {
      read: () => new Promise((resolve, reject) => {
        if (conn.aborted) reject(abortError());
        else if (queued.length) resolve({ done: false, value: queued.shift() });
        else if (ended) resolve({ done: true, value: undefined });
        else waiting = { resolve, reject };
      }),
    },
  };

  if (signal) {
    signal.addEventListener('abort', () => {
      conn.aborted = true;
      if (waiting) {
        const { reject } = waiting;
        waiting = null;
        reject(abortError());
      }
    });
  }

  return conn;
};

const connections = [];

// The first backoff is jittered within half its ceiling.
const BACKOFF_CEILING_MS = 1000;

// Mirrors of the module's own windows and the server's heartbeat interval.
const STALL_MS = 45 * 1000;
const HEARTBEAT_MS = 15 * 1000;

const frame = (id) => `data: ${JSON.stringify({
  event: 'message-requester',
  data: { supplyingAgencyMessage: { header: { requestingAgencyRequestId: id } } },
})}\n\n`;

const wrapper = ({ children }) => (
  <BrokerEventsProvider side="borrowing">{children}</BrokerEventsProvider>
);

const firstConnection = async () => {
  await waitFor(() => expect(connections.length).toBeGreaterThan(0));
  return connections[0];
};

const flush = () => act(async () => { await Promise.resolve(); });

describe('BrokerEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connections.length = 0;
    mockLiveUpdates = true;
    mockGet.mockImplementation(async (path, opts) => {
      const conn = makeConnection(opts?.signal);
      connections.push(conn);
      return { body: { getReader: () => conn.reader } };
    });
  });

  it('opens one stream for the side, leaving the symbol to the tenant', async () => {
    render(<BrokerEventsProvider side="lending" />);
    await firstConnection();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      'broker/sse/events',
      expect.objectContaining({ searchParams: { side: 'lending' }, timeout: false })
    );
  });

  it('does not connect when live updates are off', async () => {
    mockLiveUpdates = false;
    render(<BrokerEventsProvider side="borrowing" />);
    await flush();

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not connect without a side', async () => {
    render(<BrokerEventsProvider />);
    await flush();

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('delivers parsed payloads to every listener', async () => {
    const one = jest.fn();
    const two = jest.fn();
    renderHook(() => {
      useBrokerEvents({ onEvent: one });
      useBrokerEvents({ onEvent: two });
    }, { wrapper });
    const conn = await firstConnection();

    await act(async () => { conn.send(frame('pr-1')); });

    const expected = {
      event: 'message-requester',
      data: { supplyingAgencyMessage: { header: { requestingAgencyRequestId: 'pr-1' } } },
    };
    expect(one).toHaveBeenCalledWith(expected);
    expect(two).toHaveBeenCalledWith(expected);
  });

  it('stops delivering once a listener unmounts', async () => {
    const onEvent = jest.fn();
    const { unmount } = renderHook(() => useBrokerEvents({ onEvent }), { wrapper });
    const conn = await firstConnection();

    unmount();
    await act(async () => { conn.send(frame('pr-1')); });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('warns rather than failing silently when mounted without a provider', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const onEvent = jest.fn();
    renderHook(() => useBrokerEvents({ onEvent }));
    await flush();

    expect(mockGet).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no BrokerEventsProvider'));
    warn.mockRestore();
  });

  it('keeps delivering to the other listeners when one throws', async () => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
    const bad = jest.fn(() => { throw new Error('listener blew up'); });
    const good = jest.fn();
    renderHook(() => {
      useBrokerEvents({ onEvent: bad });
      useBrokerEvents({ onEvent: good });
    }, { wrapper });
    const conn = await firstConnection();

    await act(async () => { conn.send(frame('pr-1')); });

    expect(good).toHaveBeenCalledTimes(1);
    // A listener throwing must not read as the connection failing.
    expect(connections).toHaveLength(1);
    warn.mockRestore();
  });

  it('gives up instead of retrying when the subscription is refused', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
    try {
      mockGet.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
      render(<BrokerEventsProvider side="borrowing" />);
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

      await act(async () => { jest.advanceTimersByTime(5 * 60 * 1000); });

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('refused (403)'));
    } finally {
      jest.useRealTimers();
      warn.mockRestore();
    }
  });

  it('skips everything that is not an event, and keeps reading', async () => {
    const onEvent = jest.fn();
    renderHook(() => useBrokerEvents({ onEvent }), { wrapper });
    const conn = await firstConnection();

    // The framing the server opens with and pads between events, then a body
    // that is not JSON. None is an event; none may disturb what follows.
    await act(async () => { conn.send('retry: 3000\n\n: ping\n\ndata: not json\n\n'); });
    expect(onEvent).not.toHaveBeenCalled();

    await act(async () => { conn.send(frame('pr-1')); });
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('reassembles an event split across chunks', async () => {
    const onEvent = jest.fn();
    renderHook(() => useBrokerEvents({ onEvent }), { wrapper });
    const conn = await firstConnection();
    const whole = frame('pr-1');

    await act(async () => { conn.send(whole.slice(0, 20)); });
    expect(onEvent).not.toHaveBeenCalled();

    await act(async () => { conn.send(whole.slice(20)); });
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('aborts the connection on unmount', async () => {
    const { unmount } = render(<BrokerEventsProvider side="borrowing" />);
    const conn = await firstConnection();

    unmount();
    await flush();

    expect(conn.aborted).toBe(true);
    expect(connections).toHaveLength(1);
  });

  it('holds one connection open for as long as heartbeats keep arriving', async () => {
    jest.useFakeTimers();
    try {
      const onGap = jest.fn();
      renderHook(() => useBrokerEvents({ onGap }), { wrapper });
      const conn = await firstConnection();

      // Well past the stall window in total, but never that long between
      // frames, which is the only thing being watched.
      for (let i = 0; i < 9; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => { jest.advanceTimersByTime(HEARTBEAT_MS); });
        // eslint-disable-next-line no-await-in-loop
        await act(async () => { conn.send(': ping\n\n'); });
      }

      expect(connections).toHaveLength(1);
      expect(conn.aborted).toBe(false);
      expect(onGap).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('reopens the stream, after a backoff, when nothing arrives for a stall window', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
    try {
      render(<BrokerEventsProvider side="borrowing" />);
      const conn = await firstConnection();

      await act(async () => { jest.advanceTimersByTime(STALL_MS); });
      expect(conn.aborted).toBe(true);

      // A stall is a fault, not a teardown of convenience, so it keeps its
      // backoff — otherwise a blackholed path reconnects in a tight loop.
      expect(connections).toHaveLength(1);
      await act(async () => { jest.advanceTimersByTime(BACKOFF_CEILING_MS); });
      await waitFor(() => expect(connections).toHaveLength(2));

      // Delivery forgives the backoff, so this advances by the first window
      // only: a second failure's delay would not fit inside it.
      await act(async () => { connections[1].send(': ping\n\n'); });
      await act(async () => { jest.advanceTimersByTime(STALL_MS); });
      await act(async () => { jest.advanceTimersByTime(BACKOFF_CEILING_MS); });
      expect(connections).toHaveLength(3);
    } finally {
      jest.useRealTimers();
      warn.mockRestore();
    }
  });

  it('retries a response that never arrives at all', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
    try {
      // An intermediary buffering the body: accepted, then nothing comes back,
      // so the fetch never settles and only the stall window ends it.
      mockGet.mockImplementationOnce((path, opts) => new Promise((resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(abortError()));
      }));
      render(<BrokerEventsProvider side="borrowing" />);
      await flush();
      expect(connections).toHaveLength(0);

      await act(async () => { jest.advanceTimersByTime(STALL_MS); });
      await act(async () => { jest.advanceTimersByTime(BACKOFF_CEILING_MS); });
      await waitFor(() => expect(connections).toHaveLength(1));
    } finally {
      jest.useRealTimers();
      warn.mockRestore();
    }
  });

  it('reports a gap once a reconnected stream is delivering again', async () => {
    jest.useFakeTimers();
    try {
      const onGap = jest.fn();
      renderHook(() => useBrokerEvents({ onGap }), { wrapper });
      const conn = await firstConnection();
      await act(async () => { conn.send(': ping\n\n'); });
      expect(onGap).not.toHaveBeenCalled();

      await act(async () => { conn.end(); });
      await act(async () => { jest.advanceTimersByTime(BACKOFF_CEILING_MS); });
      await waitFor(() => expect(connections).toHaveLength(2));

      // Not on reconnecting, but on delivering again: a listener told to
      // recheck while the path is still down would only fail.
      expect(onGap).not.toHaveBeenCalled();
      await act(async () => { connections[1].send(': ping\n\n'); });
      expect(onGap).toHaveBeenCalledTimes(1);

      // One hole, one gap, however much arrives afterwards.
      await act(async () => { connections[1].send(frame('pr-1')); });
      expect(onGap).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('backs off rather than reconnecting straight away when the stream ends by itself', async () => {
    jest.useFakeTimers();
    try {
      render(<BrokerEventsProvider side="borrowing" />);
      await waitFor(() => expect(connections.length).toBeGreaterThan(0));

      await act(async () => { connections[0].end(); });
      // Otherwise this reconnects in a tight loop.
      expect(connections).toHaveLength(1);

      await act(async () => { jest.advanceTimersByTime(BACKOFF_CEILING_MS); });
      await waitFor(() => expect(connections).toHaveLength(2));
    } finally {
      jest.useRealTimers();
    }
  });
});
