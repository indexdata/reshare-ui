import { useOkapiQuery } from '@projectreshare/stripes-reshare';

// The entry carries both the display name and the id ui-rsdir's view route
// needs. The route is /entries/{key}/{value} and the colon in an ISIL symbol is
// a legal path-segment character, so it goes in unescaped.
const useDirectoryEntry = (symbol) => useOkapiQuery(`directory/entries/by-symbol/${symbol}`, {
  enabled: !!symbol,
  staleTime: 30 * 60 * 1000,
  cacheTime: 8 * 60 * 60 * 1000,
  useErrorBoundary: false,
});

export default useDirectoryEntry;
