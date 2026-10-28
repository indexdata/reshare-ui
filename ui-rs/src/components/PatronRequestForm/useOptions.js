import { useMemo } from 'react';
import uniqBy from 'lodash/uniqBy';
import { PublicationType } from '@projectreshare/stripes-reshare';
import { usePickupLocations, useTenantInstitution, useTiers } from '#/util/useOwnedEntries';

// Lowercased to match the publication types handleSISelect writes.
const publicationTypes = PublicationType.map(code => ({ label: code, value: code.toLowerCase() }));

// Select dataOptions for PatronRequestForm. isSuccess means the backend-sourced
// options have settled, so routes can gate their first render on it; a failed
// lookup just leaves them empty and patronLookup off.
const useOptions = () => {
  const { pickupLocations, isSettled } = usePickupLocations();
  const { tiers } = useTiers();
  const { institution, isError: copyrightLoadError } = useTenantInstitution();
  // Mirrors the broker's rule for an NCIP patron lookup; an unset lookupUserEnabled means on.
  const lmsConfig = institution?.lmsConfig;
  const patronLookup = !!lmsConfig?.address && lmsConfig.lookupUserEnabled !== false;
  const availableCopyrightTypes = institution?.illConfig?.availableCopyrightTypes;
  const copyrightTypes = useMemo(() => uniqBy(
    (Array.isArray(availableCopyrightTypes) ? availableCopyrightTypes : [])
      .filter(item => typeof item?.code === 'string' && item.code.trim())
      .map(({ code, defaultDesc }) => ({
        label: typeof defaultDesc === 'string' && defaultDesc.trim() ? defaultDesc : code,
        value: code,
      })),
    'value'
  ), [availableCopyrightTypes]);
  const defaultCode = institution?.illConfig?.defaultCopyrightType?.code;
  const defaultCopyrightCode = copyrightTypes.some(option => option.value === defaultCode) ? defaultCode : undefined;
  const locations = pickupLocations.map(entry => ({ label: entry.name, value: entry.id }));

  return {
    options: { copyrightTypes, defaultCopyrightCode, copyrightLoadError, publicationTypes, tiers, locations, patronLookup },
    isSuccess: isSettled,
  };
};

export default useOptions;
