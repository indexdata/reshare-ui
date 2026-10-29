import { useOwnedEntries } from './useOwnedEntries';

const useTenantReasons = ({ field, enabled }) => {
  const owned = useOwnedEntries({ enabled });
  const institution = owned.entries.find(entry => entry.type === 'Institution');

  return {
    reasons: institution?.illConfig?.[field] ?? [],
    isLoading: enabled && !owned.isSettled,
    isError: owned.isError,
  };
};

export default useTenantReasons;
