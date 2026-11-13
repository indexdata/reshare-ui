import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Col, KeyValue, Row, TextField } from '@folio/stripes/components';

import isPositiveDuration from './isPositiveDuration';

const AgeRequestsParams = () => {
  const intl = useIntl();
  const validateInterval = (value) => (
    isPositiveDuration(value)
      ? undefined
      : intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.validate.interval' })
  );

  return (
    <Row>
      <Col xs={6}>
        <Field
          id="scheduled-action-age-interval"
          name="actionParams.interval"
          required
          component={TextField}
          validate={validateInterval}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.interval" />}
        />
      </Col>
    </Row>
  );
};

export { AgeRequestsParams };

export const AgeRequestsView = ({ actionParams }) => (
  <KeyValue
    label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.interval" />}
    value={actionParams?.interval}
  />
);
