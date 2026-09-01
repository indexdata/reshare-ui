/**
 * Whether actions for a patron request should currently be disabled.
 *
 * Returns true while an action mutation for this request is in flight, or while
 * its cached record or action list has been invalidated and is awaiting refresh.
 * Returns false until the caller has a request id.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useIsMutating, useQueryClient } from 'react-query';
import { keyPath, requestKeys } from './requestQueries';

const MUTATION_KEY = ['@reshare/stripes-reshare', 'performAction'];

/**
 * Whether the request or its actions are marked out of date.
 *
 * The flag is react-query's: set by any invalidation, cleared by a fetch that
 * succeeds, so the answer survives navigation. An errored query is skipped,
 * since nothing is coming to clear it. `useIsFetching` cannot serve this: it
 * forces `fetching: true` into its filters, missing a query marked but idle.
 */
const useIsRequestRefreshPending = (reqId) => {
  const cache = useQueryClient().getQueryCache();

  // QueryClient cache reads are imperative: reading query.state does not make
  // React re-render when invalidation or fetching changes it. Expose the cache
  // as an external store, and keep the subscription stable between renders.
  const subscribe = useCallback(
    (onChange) => cache.subscribe(onChange),
    [cache]
  );

  const getSnapshot = useCallback(() => {
    if (!reqId) return false;
    const { record, actions } = requestKeys(reqId);

    // useOkapiQuery may append options to a key, so match its path rather than
    // looking up one exact key. A boolean is a stable, cheaply compared snapshot.
    return cache.findAll().some(query => [record, actions].includes(keyPath(query.queryKey)) &&
      query.state.isInvalidated &&
      !query.state.error);
  }, [cache, reqId]);

  return useSyncExternalStore(subscribe, getSnapshot);
};

const useIsActionPending = (reqId) => {
  const pendingPosts = useIsMutating({
    mutationKey: MUTATION_KEY,
    predicate: m => m?.options?.variables?.id === reqId,
  });

  const refreshPending = useIsRequestRefreshPending(reqId);

  return Boolean(reqId) && (pendingPosts > 0 || refreshPending);
};

export default useIsActionPending;
