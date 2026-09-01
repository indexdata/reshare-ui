import { useQuery } from 'react-query';
import { omit } from 'lodash';
import useOkapiKy from './useOkapiKy';

// I confirmed with a react-query maintainer what the docs imply: you can share
// the same key between queries that use different values for staleTime and
// cacheTime. The longest cacheTime will be used and refetching will happen
// based on what's currently active.
//
// per TkDodo "if you re-fetch stale queries, we look at all observers. if one
// says the query is stale, the other says it's not stale, we still refetch.
// exceptions are if one observer is disabled, then it gets bypassed.  also, if
// e.g. one of them has refetchOnWindowFocus: false , and you focus the window,
// we only look at the stale times of observers where this flag is true. "
// Entries outlive their freshness: a surviving one is redisplayed at once and
// refreshed behind, where an evicted one is an empty pane. Costs memory.
const CACHE_BEYOND_STALE = 30 * 60 * 1000;

const sharableQueryOptions = ['cacheTime', 'enabled', 'initialData', 'initialDataUpdatedAt', 'staleTime'];
const useOkapiQueryConfig = (path, { kyOpt = {}, searchParams = {}, ns = false, ...opt } = {}, keys = []) => {
  const okapiKy = useOkapiKy().extend(kyOpt);

  const extraOpt = {};
  if (opt.staleTime && !opt.cacheTime) {
    extraOpt.cacheTime = opt.staleTime + CACHE_BEYOND_STALE;
  }

  const extraKeys = [];
  if (Object.keys(searchParams).length > 0) extraKeys.push(searchParams);
  const unshareable = omit(opt, sharableQueryOptions);
  if (Object.keys(unshareable).length > 0) extraKeys.push(unshareable);

  return {
    queryKey: [path, ...extraKeys, ...keys],
    // okapiKy rejects with a normalized error (see useOkapiKy), so consumers get
    // a readable error.message/.status without any async parsing here. The signal
    // is react-query's, so a superseded fetch drops its request.
    queryFn: ({ signal }) => okapiKy(path, { searchParams, signal }).json(),
    // reinstating default currently disabled by stripes-core
    refetchOnWindowFocus: true,
    useErrorBoundary: true,
    ...extraOpt,
    ...opt,
  };
};

const useOkapiQuery = (...params) => useQuery(useOkapiQueryConfig(...params));

export { useOkapiQuery, useOkapiQueryConfig };
