/**
 * Whether a request's actions should be disabled: either the caller has an
 * action post in flight, or a peer message has changed the request and the UI
 * has not caught up with it yet. Without a request id, reports on any request.
 */
import { useIsMutating, useQuery } from 'react-query';

const MUTATION_KEY = ['@reshare/stripes-reshare', 'performAction'];

// A cache entry rather than a store of its own: react-query already gives every
// watching component a subscription. Written by useRequestEvents.
const settlingKey = (reqId) => ['@reshare/stripes-reshare', 'settling', reqId];

const useIsActionPending = (reqId) => {
  const pendingPosts = useIsMutating(reqId
    ? { mutationKey: MUTATION_KEY, predicate: m => m?.options?.variables?.id === reqId }
    : { mutationKey: MUTATION_KEY });

  // Never fetches: the query is here to subscribe to the entry above.
  const { data: settling } = useQuery(settlingKey(reqId), () => false, {
    enabled: false,
    initialData: false,
  });

  return pendingPosts > 0 || Boolean(settling);
};

export default useIsActionPending;
export { settlingKey };
