import { useIntl } from 'react-intl';
import { CopyrightCompliance, PublicationType } from '@projectreshare/stripes-reshare';
import { usePickupLocations } from '../../util/useOwnedEntries';

// Lowercased to match the publication types handleSISelect writes.
const publicationTypes = PublicationType.map(code => ({ label: code, value: code.toLowerCase() }));

// TODO: tiers pending the directory endpoints.
const tiers = [];

// Select dataOptions for PatronRequestForm. isSuccess means the backend-sourced
// options have settled, so routes can gate their first render on it; a failed
// lookup just leaves them empty.
const useOptions = () => {
  const intl = useIntl();
  const { pickupLocations, isSettled } = usePickupLocations();
  const copyrightTypes = CopyrightCompliance.map(code => ({
    label: intl.formatMessage({ id: `stripes-reshare.iso18626.CopyrightCompliance.${code}` }),
    value: code,
  }));
  const locations = pickupLocations.map(entry => ({ label: entry.name, value: entry.id }));

  return {
    options: { copyrightTypes, publicationTypes, tiers, locations },
    isSuccess: isSettled,
  };
};

export default useOptions;
