/**
 * Keeps cached patron requests in step with the broker event stream.
 *
 * An event marks what it touched out of date and cancels any fetch in flight for
 * it, neither of which costs a request. Only watched queries refetch, once the
 * request stops moving; the rest stay marked until next opened. Marking is what
 * withdraws the actions (see useIsActionPending).
 *
 * The list is marked, never refetched in place: that needs events the broker does
 * not raise, for arrivals and for changes from our own side.
 *
 * Mount once inside a `BrokerEventsProvider`, above the routes.
 */

import { useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { debounce } from 'lodash';
import { useBrokerEvents } from './BrokerEvents';
import {
  LIST_KEY,
  isNotificationsKey,
  isRequestKey,
  keyPath,
  requestIdsForEvent,
  requestKeys,
} from './requestQueries';

// Transitions arrive in bursts. The cap bounds a request that never quietens,
// and a refetch it starts mid-burst is superseded by the next event.
const SETTLE_MS = 2 * 1000;
const SETTLE_MAX_MS = 10 * 1000;

const isWatchable = (query) => isRequestKey(query.queryKey) && query.state.isInvalidated;

// The queries these ids would refetch. Chat never waits for the timer.
const belongsTo = (ids) => (query) => {
  const path = keyPath(query.queryKey);
  return ids.some((id) => {
    const { record, actions, events } = requestKeys(id);
    return path === record || path === actions || path === events;
  });
};

const RequestCacheSync = () => {
  const queryClient = useQueryClient();

  const settle = useMemo(() => debounce(
    () => queryClient.refetchQueries({ active: true, predicate: isWatchable }),
    SETTLE_MS,
    { maxWait: SETTLE_MAX_MS }
  ), [queryClient]);

  useEffect(() => () => settle.cancel(), [settle]);

  const markStale = (key) => queryClient.invalidateQueries(key, { refetchActive: false });

  // A fetch that left before the event clears the mark when it lands. Cancel the
  // ones nobody is watching; a watched fetch is someone's own search, so it is
  // left to finish.
  const markList = () => {
    queryClient.cancelQueries(LIST_KEY, { active: false });
    markStale(LIST_KEY);
  };

  // Only what this event touched restarts the timer, so a request nobody has open
  // cannot delay one on screen. The refetch itself is cache-wide.
  const settleIfWatched = (predicate) => {
    if (queryClient.getQueryCache().findAll({ active: true, predicate }).length) settle();
  };

  const changed = (ids) => {
    ids.forEach((id) => {
      const { record, actions, events, notifications } = requestKeys(id);
      [record, actions, events].forEach((key) => {
        // Stops a pre-event fetch from clearing the mark set on the next line.
        queryClient.cancelQueries(key);
        markStale(key);
      });
      // Chat does not wait for the request to settle. Cancelled first, or a fetch
      // already running absorbs the invalidation and returns the conversation
      // without this message.
      queryClient.cancelQueries(notifications);
      queryClient.invalidateQueries(notifications);
    });
    settleIfWatched(belongsTo(ids));
  };

  useBrokerEvents({
    onEvent: (payload) => {
      // The stream is narrowed to this side and symbol, so any event makes the
      // list out of date, including one naming a request never fetched here.
      markList();
      const ids = requestIdsForEvent(payload, queryClient);
      if (ids.length) changed(ids);
    },
    // A gap may have lost updates, so everything held is suspect, including
    // sub-resources whose record has been evicted.
    onGap: () => {
      markList();
      queryClient.getQueryCache().findAll().forEach(({ queryKey }) => {
        if (!isRequestKey(queryKey)) return;
        if (isNotificationsKey(queryKey)) {
          queryClient.cancelQueries(queryKey);
          queryClient.invalidateQueries(queryKey);
          return;
        }
        queryClient.cancelQueries(queryKey);
        markStale(queryKey);
      });
      settleIfWatched(isWatchable);
    },
  });

  return null;
};

export default RequestCacheSync;
