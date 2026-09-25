import { useMemo } from 'react';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

// Directory entries whose tenant is ours. A failed lookup (e.g. a user without
// directory permissions) leaves them empty rather than tripping the error boundary.
const useOwnedEntries = ({ enabled = true } = {}) => {
  const query = useOkapiQuery('directory/entries/owned', {
    searchParams: { limit: '1000' },
    staleTime: 5 * 60 * 1000,
    useErrorBoundary: false,
    enabled,
  });

  const entries = useMemo(() => query.data?.items ?? [], [query.data]);
  const byId = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries]);

  return { entries, byId, isSettled: query.isSuccess || query.isError };
};

// Candidates for a request's requesterPickupLocationId, which the broker accepts
// only as a branch of the requesting institution.
const usePickupLocations = () => {
  const { entries, isSettled } = useOwnedEntries();
  const pickupLocations = useMemo(() => entries
    .filter(entry => entry.type?.toLowerCase() === 'branch')
    .sort((a, b) => a.name.localeCompare(b.name)), [entries]);

  return { pickupLocations, isSettled };
};

export { useOwnedEntries, usePickupLocations };
