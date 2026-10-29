import { useMemo } from 'react';
import uniqBy from 'lodash/uniqBy';
import { PublicationType, useOkapiQuery } from '@projectreshare/stripes-reshare';
import { usePickupLocations, useTenantInstitution, useTiers } from '#/util/useOwnedEntries';

// Lowercased to match the publication types handleSISelect writes.
const publicationTypes = PublicationType.map(code => ({ label: code, value: code.toLowerCase() }));

const toCopyrightOptions = items => uniqBy(
  (Array.isArray(items) ? items : [])
    .filter(item => typeof item?.code === 'string' && item.code.trim())
    .map(({ code, defaultDesc }) => ({
      label: typeof defaultDesc === 'string' && defaultDesc.trim() ? defaultDesc : code,
      value: code,
    })),
  'value'
);

// The directory publishes its stock copyright types as a code → description map.
const defaultCopyrightItems = spec => {
  const data = spec?.components?.schemas?.IllConfig?.properties?.availableCopyrightTypes?.['x-default-data'];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data).map(([code, defaultDesc]) => ({ code, defaultDesc }));
};

// Select dataOptions for PatronRequestForm. isSuccess means the backend-sourced
// options have settled, so routes can gate their first render on it; a failed
// lookup just leaves them empty and patronLookup off.
const useOptions = () => {
  const { pickupLocations, isSettled } = usePickupLocations();
  const { tiers } = useTiers();
  const { institution, isSuccess: institutionLoaded, isError: institutionLoadError } = useTenantInstitution();
  // Mirrors the broker's rule for an NCIP patron lookup; an unset lookupUserEnabled means on.
  const lmsConfig = institution?.lmsConfig;
  const patronLookup = !!lmsConfig?.address && lmsConfig.lookupUserEnabled !== false;
  const availableCopyrightTypes = institution?.illConfig?.availableCopyrightTypes;
  const configuredCopyrightTypes = useMemo(() => toCopyrightOptions(availableCopyrightTypes), [availableCopyrightTypes]);
  // An institution that has configured no copyright types gets the directory's defaults;
  // a failed lookup does not, so it still reads as a load error. The spec is fetched up
  // front rather than on demand so a refresh that empties the configured list doesn't
  // unsettle the options and unmount a form mid-draft.
  const needsDefaultCopyrightTypes = institutionLoaded && configuredCopyrightTypes.length === 0;
  const openApiQuery = useOkapiQuery('directory/openapi.json', {
    staleTime: 30 * 60 * 1000,
    retry: false,
    useErrorBoundary: false,
    refetchOnWindowFocus: false,
  });
  const copyrightLoadError = institutionLoadError || (needsDefaultCopyrightTypes && openApiQuery.isError);
  const copyrightTypes = needsDefaultCopyrightTypes ?
    toCopyrightOptions(defaultCopyrightItems(openApiQuery.data)) :
    configuredCopyrightTypes;
  const defaultCode = institution?.illConfig?.defaultCopyrightType?.code;
  const defaultCopyrightCode = copyrightTypes.some(option => option.value === defaultCode) ? defaultCode : undefined;
  const locations = pickupLocations.map(entry => ({ label: entry.name, value: entry.id }));

  return {
    options: { copyrightTypes, defaultCopyrightCode, copyrightLoadError, publicationTypes, tiers, locations, patronLookup },
    isSuccess: isSettled && (openApiQuery.isSuccess || openApiQuery.isError),
  };
};

export default useOptions;
