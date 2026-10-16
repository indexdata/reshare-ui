import { useIntl } from 'react-intl';
import { CopyrightCompliance, PublicationType } from '@projectreshare/stripes-reshare';
import { usePickupLocations, useTenantInstitution, useTiers } from '#/util/useOwnedEntries';

// Lowercased to match the publication types handleSISelect writes.
const publicationTypes = PublicationType.map(code => ({ label: code, value: code.toLowerCase() }));

// Select dataOptions for PatronRequestForm. isSuccess means the backend-sourced
// options have settled, so routes can gate their first render on it; a failed
// lookup just leaves them empty and patronLookup off.
const useOptions = () => {
  const intl = useIntl();
  const { pickupLocations, isSettled } = usePickupLocations();
  const { tiers } = useTiers();
  const { institution } = useTenantInstitution();
  // Mirrors the broker's rule for an NCIP patron lookup; an unset lookupUserEnabled means on.
  const lmsConfig = institution?.lmsConfig;
  const patronLookup = !!lmsConfig?.address && lmsConfig.lookupUserEnabled !== false;
  const copyrightTypes = CopyrightCompliance.map(code => ({
    label: intl.formatMessage({ id: `stripes-reshare.iso18626.CopyrightCompliance.${code}` }),
    value: code,
  }));
  const locations = pickupLocations.map(entry => ({ label: entry.name, value: entry.id }));

  return {
    options: { copyrightTypes, publicationTypes, tiers, locations, patronLookup },
    isSuccess: isSettled,
  };
};

export default useOptions;
