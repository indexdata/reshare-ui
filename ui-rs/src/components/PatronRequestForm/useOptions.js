import { useIntl } from 'react-intl';
import { CopyrightCompliance, PublicationType } from '../../constants/iso18626';

// Lowercased to match the publication types handleSISelect writes.
const publicationTypes = PublicationType.map(code => ({ label: code, value: code.toLowerCase() }));

// TODO: tiers and pickup locations pending the directory endpoints.
const tiers = [];
const locations = [];

// Select dataOptions for PatronRequestForm. Static today, but the terms vary by
// consortium and will come from the backend, so isSuccess is already reported
// for routes to gate their first render on.
const useOptions = () => {
  const intl = useIntl();
  const copyrightTypes = CopyrightCompliance.map(code => ({
    label: intl.formatMessage({ id: `stripes-reshare.iso18626.CopyrightCompliance.${code}` }),
    value: code,
  }));

  return {
    options: { copyrightTypes, publicationTypes, tiers, locations },
    isSuccess: true,
  };
};

export default useOptions;
