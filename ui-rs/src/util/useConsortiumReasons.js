import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { useOwnedEntries } from './useOwnedEntries';

const useConsortiumReasons = ({ field, enabled }) => {
  const owned = useOwnedEntries({ enabled });
  const institution = owned.entries.find(entry => entry.type === 'Institution');
  const consortiumId = institution?.parent;
  const consortium = useOkapiQuery(`directory/entries/by-id/${consortiumId}`, {
    enabled: enabled && !!consortiumId,
    staleTime: 2 * 60 * 1000,
    useErrorBoundary: false,
  });

  return {
    reasons: consortium.data?.illConfig?.[field] ?? [],
    isLoading: enabled && (!owned.isSettled || (!!consortiumId && !consortium.data && !consortium.isError)),
    isError: owned.isError || (!!consortiumId && consortium.isError),
  };
};

export default useConsortiumReasons;
