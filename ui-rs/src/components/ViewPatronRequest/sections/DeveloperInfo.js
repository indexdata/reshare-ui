import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useStripes } from '@folio/stripes/core';
import { Accordion } from '@folio/stripes/components';
import stringify from 'json-stable-stringify';

const DeveloperInfo = ({ record, actions }) => {
  const stripes = useStripes();
  if (!stripes.config.showDevInfo) return null;
  return (
    <Accordion
      closedByDefault
      label={<FormattedMessage id="ui-rs.information.heading.developer" />}
      displayWhenClosed={<FormattedMessage id="ui-rs.information.heading.developer.help" />}
    >
      <h3><FormattedMessage id="ui-rs.information.heading.developer.record" /></h3>
      <pre>{stringify(record, { space: 2 })}</pre>
      <hr />
      <h3><FormattedMessage id="ui-rs.information.heading.developer.actions" /></h3>
      <pre>{stringify(actions, { space: 2 })}</pre>
    </Accordion>
  );
};

export default DeveloperInfo;
