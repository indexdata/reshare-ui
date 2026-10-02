import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@folio/stripes/components';
import { DirectLink } from '@projectreshare/stripes-reshare';

// Opens the slip, which carries the button that marks it printed.
const PullslipPrinted = () => (
  <DirectLink component={Button} buttonStyle="primary mega" fullWidth to="pullslip" preserveSearch>
    <FormattedMessage id="ui-rs.printPullslip" />
  </DirectLink>
);

export default PullslipPrinted;
