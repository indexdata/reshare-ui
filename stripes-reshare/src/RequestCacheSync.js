/**
 * Keeps cached patron-request queries synchronized with broker events.
 *
 * Each event invalidates the affected queries and cancels older in-flight
 * requests that could overwrite that invalidation. Active queries refetch after
 * their debounce; inactive queries remain invalidated until observed again.
 * Invalidated record and action queries also disable request actions.
 *
 * The request list uses a separate, longer debounce to coalesce queue-wide
 * activity. The stream does not report arrivals or same-side changes, so focus
 * and remount refetches remain necessary for complete list freshness.
 *
 * Mount once inside BrokerEventsProvider, above the routes.
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

// Request transitions often emit several events. Debounce until quiet, with
// maxWait bounding how long active queries can remain invalidated.
const SETTLE_MS = 2 * 1000;
const SETTLE_MAX_MS = 10 * 1000;

// A transition can emit several events, including one carrying a note. Use a
// short debounce to coalesce the burst without noticeably delaying chat.
const CHAT_SETTLE_MS = 500;
const CHAT_SETTLE_MAX_MS = 1000;

// The list waits longer. It is the expensive query, a whole queue's worth of
// events feed it rather than one request's, and a row appearing a few seconds
// late costs nothing. The cap is what a busy queue settles to: one refetch a
// minute.
const LIST_SETTLE_MS = 10 * 1000;
const LIST_SETTLE_MAX_MS = 60 * 1000;

const isWatchable = (query) => isRequestKey(query.queryKey) && query.state.isInvalidated;
const isWatchableChat = (query) => isNotificationsKey(query.queryKey) && query.state.isInvalidated;

const belongsTo = (ids) => (query) => {
  const path = keyPath(query.queryKey);
  return ids.some((id) => {
    const { record, actions, events } = requestKeys(id);
    return path === record || path === actions || path === events;
  });
};

const RequestCacheSync = () => {
  const queryClient = useQueryClient();

  const { settle, settleChat, settleList } = useMemo(() => ({
    settle: debounce(
      () => queryClient.refetchQueries({ active: true, predicate: isWatchable }),
      SETTLE_MS,
      { maxWait: SETTLE_MAX_MS }
    ),
    settleChat: debounce(
      () => queryClient.refetchQueries({ active: true, predicate: isWatchableChat }),
      CHAT_SETTLE_MS,
      { maxWait: CHAT_SETTLE_MAX_MS }
    ),
    settleList: debounce(
      () => queryClient.refetchQueries(LIST_KEY, { active: true }),
      LIST_SETTLE_MS,
      { maxWait: LIST_SETTLE_MAX_MS }
    ),
  }), [queryClient]);

  useEffect(() => () => {
    settle.cancel();
    settleChat.cancel();
    settleList.cancel();
  }, [settle, settleChat, settleList]);

  const markStale = (key) => queryClient.invalidateQueries(key, { refetchActive: false });

  // A response started before the event would clear the invalidation. Cancel
  // inactive list fetches; active searches finish and refresh after the debounce.
  const markList = () => {
    queryClient.cancelQueries(LIST_KEY, { active: false });
    markStale(LIST_KEY);
    settleList();
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
        queryClient.cancelQueries(key);
        markStale(key);
      });
      // Cancel first so a pre-event response cannot clear the invalidation.
      queryClient.cancelQueries(notifications);
      markStale(notifications);
    });
    settleChat();
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
        queryClient.cancelQueries(queryKey);
        markStale(queryKey);
      });
      settleChat();
      settleIfWatched(isWatchable);
    },
  });

  return null;
};

export default RequestCacheSync;
