/**
 * One broker event-stream connection for the whole app, and a hook to listen in.
 *
 * The stream is narrowed server-side to a side and a symbol, and the symbol comes
 * from the tenant, so the connection has no per-screen inputs: one per session,
 * surviving navigation. Consumers get parsed payloads and decide what to do with
 * them; nothing here knows about patron requests. See `useRequestEvents`.
 *
 * Inert unless the `reshare.liveUpdates` app-shell flag is set.
 */

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { useStripes } from '@folio/stripes/core';
import useOkapiKy from './useOkapiKy';

// Null when no provider is mounted, which is supported: consumers hear nothing.
const BrokerEventsContext = createContext(null);

// Three missed heartbeats. Keep it a multiple of the broker's own interval,
// `sseHeartbeatInterval` in broker/api/sse_broker.go.
const STALL_TIMEOUT_MS = 45 * 1000;

const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 30 * 1000;

// Half the delay fixed, half jittered, so reconnecting clients spread out.
const backoffMs = (failures) => {
  const ceiling = Math.min(BACKOFF_MIN_MS * (2 ** (failures - 1)), BACKOFF_MAX_MS);
  return ceiling / 2 + Math.random() * (ceiling / 2);
};

// A missing permission or bad tenant is a standing answer, not a blip.
const isPermanent = (status) => status >= 400 && status < 500 &&
  ![401, 408, 429].includes(status);

// The broker puts the event name in the JSON body, not in the SSE framing.
const parseFrame = (frame) => {
  const data = frame
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trimStart())
    .join('\n');
  if (!data) return undefined;
  try {
    return JSON.parse(data);
  } catch (e) {
    return undefined;
  }
};

const BrokerEventsProvider = ({ side, children }) => {
  const stripes = useStripes();
  const ky = useOkapiKy();

  // Each ky instance pins the token of the render that built it, so the latest
  // is read through a ref: token rotation reaches the next reconnect, without
  // the current connection restarting on every render.
  const kyRef = useRef(ky);
  kyRef.current = ky;

  const listeners = useRef(new Set());
  // Stable identity, so a re-render here does not re-run every consumer's effect.
  const subscribe = useRef((listener) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }).current;

  const enabled = Boolean(stripes.config?.reshare?.liveUpdates && side);
  // Tenant is bound into the request headers, so a change of affiliation
  // has to reopen the stream.
  const tenant = stripes.okapi?.tenant;

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let controller = null;
    // Distinguishes a watchdog teardown from the request itself failing.
    let stalled = false;
    // Sets the backoff; delivery clears it.
    let failures = 0;
    // Set when a connection ends. The broker sends no ids and supports no
    // replay, so anything raised before the next one establishes is simply
    // gone, however brief the interruption.
    let missedEvents = false;

    // One listener throwing must not break delivery to the others, nor look
    // like the connection failed.
    const emit = (method, arg) => listeners.current.forEach((listener) => {
      try {
        listener[method](arg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Broker event listener failed: ${err?.message ?? String(err)}`);
      }
    });
    const emitEvent = (payload) => emit('event', payload);
    const emitGap = () => emit('gap');

    // Bytes arriving are the only proof the path works, so the backoff is
    // forgiven here and any hole before it is reported.
    const noteDelivery = () => {
      if (missedEvents) {
        missedEvents = false;
        emitGap();
      }
      failures = 0;
    };

    const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

    // One connection, open to close.
    const streamOnce = async () => {
      controller = new AbortController();
      stalled = false;
      let watchdog;
      // Armed before the request, so a response that never arrives at all —
      // an intermediary buffering the body — times out the same way.
      const arm = () => {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          stalled = true;
          controller.abort();
        }, STALL_TIMEOUT_MS);
      };
      arm();
      let serverClosed = false;
      try {
        const res = await kyRef.current.get('broker/sse/events', {
          searchParams: { side },
          // The watchdog, not ky, is what bounds this request.
          timeout: false,
          signal: controller.signal,
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          // eslint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read();
          if (done) {
            serverClosed = true;
            break;
          }
          // Heartbeats count as delivery but yield no events.
          arm();
          noteDelivery();
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop();
          frames.forEach((frame) => {
            const payload = parseFrame(frame);
            if (payload) emitEvent(payload);
          });
        }
      } finally {
        clearTimeout(watchdog);
      }
      return serverClosed;
    };

    const connectLoop = async () => {
      while (!stopped) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const serverClosed = await streamOnce();
          if (stopped) return;
          // A body that closes immediately would otherwise loop tightly.
          if (serverClosed) {
            failures += 1;
            // eslint-disable-next-line no-await-in-loop
            await delay(backoffMs(failures));
          }
        } catch (e) {
          if (stopped) return;
          if (isPermanent(e.status)) {
            // eslint-disable-next-line no-console
            console.warn(`Broker event stream refused (${e.status}), giving up: ${e.message}`);
            return;
          }
          // Watchdog aborts are faults and keep their backoff; the only other
          // abort is teardown on unmount, which returned above.
          failures += 1;
          if (failures === 1) {
            // eslint-disable-next-line no-console
            console.warn(stalled
              ? `Broker event stream delivered nothing for ${STALL_TIMEOUT_MS}ms, reconnecting`
              : `Broker event stream failed, retrying: ${e.message}`);
          }
          // eslint-disable-next-line no-await-in-loop
          await delay(backoffMs(failures));
        }

        if (stopped) return;
        // Reported by the next delivery rather than here, so listeners are told
        // when the stream is working again and a recheck can succeed.
        missedEvents = true;
      }
    };

    connectLoop();

    return () => {
      stopped = true;
      if (controller) controller.abort();
    };
  }, [enabled, side, tenant]);

  return (
    <BrokerEventsContext.Provider value={subscribe}>
      {children}
    </BrokerEventsContext.Provider>
  );
};

/**
 * Listen to the app's broker event stream.
 *
 * `onEvent` receives each parsed payload. `onGap` means the stream has not been
 * carrying everything, so whatever the caller derives from it must be rechecked.
 *
 * Both are read at call time and need not be stable; mounting without a provider
 * above delivers nothing. They are called synchronously, so a returned promise is
 * not awaited and a rejection escapes the isolation between listeners.
 */
const useBrokerEvents = ({ onEvent, onGap } = {}) => {
  const stripes = useStripes();
  const subscribe = useContext(BrokerEventsContext);

  const handlers = useRef({ onEvent, onGap });
  // Committed renders only — a ref written during render can carry callbacks from
  // an attempt React went on to throw away — but synchronously after commit, so a
  // frame arriving before passive effects flush is not matched against the
  // component's previous props.
  useLayoutEffect(() => { handlers.current = { onEvent, onGap }; });

  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe({
      event: (payload) => handlers.current.onEvent?.(payload),
      gap: () => handlers.current.onGap?.(),
    });
  }, [subscribe]);

  useEffect(() => {
    // Live updates on but no provider above is a wiring mistake, and it looks
    // exactly like the feature being switched off.
    if (!subscribe && stripes.config?.reshare?.liveUpdates) {
      // eslint-disable-next-line no-console
      console.warn('useBrokerEvents: no BrokerEventsProvider above this component, so no events will arrive.');
    }
  }, [subscribe, stripes.config?.reshare?.liveUpdates]);
};

export { BrokerEventsProvider, useBrokerEvents };
