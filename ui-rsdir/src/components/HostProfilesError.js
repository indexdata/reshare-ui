import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@folio/stripes/components';

const HostProfilesError = ({ isFetching, refetch }) => (
  <div role="alert">
    <p>
      <FormattedMessage
        id="ui-rsdir.settingsConfig.hostProfiles.error"
        defaultMessage="Vendor and catalog profile information is unavailable. Retry to load it before editing these settings."
      />
    </p>
    <Button disabled={isFetching} onClick={() => refetch()}>
      <FormattedMessage id="ui-rsdir.settingsConfig.hostProfiles.retry" defaultMessage="Retry" />
    </Button>
  </div>
);

export default HostProfilesError;
