/**
 * Keeps one patron request fresh by refetching it when a peer message concerning
 * it arrives. The stream carries every message for the queue, so matching happens
 * here; events are never merged into the cache, only used to trigger a refetch.
 *
 * A request transitioning automatically emits several messages in a row, so the
 * refetch waits for it to settle. The actions on screen meanwhile belong to the
 * state before the message, so the request is marked unsettled the moment an
 * event lands, which disables them (see useIsActionPending). Chat does not wait.
 *
 * Needs a `BrokerEventsProvider` above it; without one it is inert, as it is when
 * the `reshare.liveUpdates` flag is off.
 */

import { useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { debounce } from 'lodash';
import { useBrokerEvents } from './BrokerEvents';
import { settlingKey } from './useIsActionPending';

// How long a request has to stay quiet before the UI is brought up to date. The
// cap stops one that never quietens from never being refreshed.
const SETTLE_MS = 2 * 1000;
const SETTLE_MAX_MS = 10 * 1000;

// `requestingAgencyRequestId` carries the requester's id on both sides, which is
// what `requesterRequestId` holds whichever side we are on; borrowing also has it
// as its own `id`. Checking both header ids against both is robust to whichever
// peer originated the message.
const eventMatches = (payload, ids) => {
  const message = payload?.data;
  const header = message?.supplyingAgencyMessage?.header ?? message?.requestingAgencyMessage?.header;
  if (!header) return false;
  return ids.has(header.requestingAgencyRequestId) || ids.has(header.supplyingAgencyRequestId);
};

const useRequestEvents = (request) => {
  const queryClient = useQueryClient();
  const id = request?.id;

  const { markUnsettled, refetchChat, settle } = useMemo(() => {
    const setSettling = (value) => queryClient.setQueryData(settlingKey(id), value);

    const settleNow = async () => {
      try {
        // The list is marked stale too: it is not mounted while this route is,
        // and would otherwise show the old state on the way back. Awaited, since
        // actions are trustworthy only once the new state is in hand. A failed
        // refetch still resolves, so this cannot hang on an error.
        await Promise.all([
          queryClient.invalidateQueries(`broker/patron_requests/${id}`),
          queryClient.invalidateQueries(`broker/patron_requests/${id}/actions`),
          queryClient.invalidateQueries(`broker/patron_requests/${id}/events`),
          queryClient.invalidateQueries('broker/patron_requests'),
        ]);
      } finally {
        setSettling(false);
      }
    };

    return {
      markUnsettled: () => setSettling(true),
      // Chat is conversational, so it does not wait for the request to settle.
      refetchChat: () => queryClient.invalidateQueries(`broker/patron_requests/${id}/notifications`),
      settle: debounce(settleNow, SETTLE_MS, { maxWait: SETTLE_MAX_MS }),
    };
  }, [queryClient, id]);

  useEffect(() => () => {
    // Flushed, not dropped: the list it marks stale is what gets navigated
    // back to.
    settle.flush();
    // For the case where there was nothing pending to flush.
    if (id) queryClient.setQueryData(settlingKey(id), false);
  }, [queryClient, id, refetchChat, settle]);

  const changed = () => {
    if (!id) return;
    markUnsettled();
    refetchChat();
    settle();
  };

  useBrokerEvents({
    onEvent: (payload) => {
      const ids = new Set([request?.id, request?.requesterRequestId].filter(Boolean));
      if (ids.size && eventMatches(payload, ids)) changed();
    },
    // A gap may have lost updates, with no event to match on.
    onGap: changed,
  });
};

export default useRequestEvents;
