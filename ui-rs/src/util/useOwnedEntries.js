import { useMemo } from 'react';
import uniqBy from 'lodash/uniqBy';
import { useStripes } from '@folio/stripes/core';
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
// as the requesting institution itself or one of its descendants.
const usePickupLocations = () => {
  const { entries, isSettled } = useOwnedEntries();
  const pickupLocations = useMemo(() => entries
    .filter(entry => entry.illConfig?.isPickupLocation === true)
    .sort((a, b) => a.name.localeCompare(b.name)), [entries]);

  return { pickupLocations, isSettled };
};

// Tiers carry no currency yet, so they take the tenant's. Cheapest first, so
// free tiers lead the dropdown, then by name.
const useTiers = () => {
  const { currency } = useStripes();
  const { entries, isSettled } = useOwnedEntries();
  const tiers = useMemo(
    () => uniqBy(entries.flatMap(entry => entry.tiers ?? []), 'id')
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
      .map(tier => ({ ...tier, currency })),
    [entries, currency]
  );

  return { tiers, isSettled };
};

export { useOwnedEntries, usePickupLocations, useTiers };
