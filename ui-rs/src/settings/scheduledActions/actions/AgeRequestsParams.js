import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Col, KeyValue, Row, TextField } from '@folio/stripes/components';

// Positive Go duration using second/minute/hour units, e.g. "72h3m30s".
const GO_DURATION = /^([0-9]*\.?[0-9]+(s|m|h))+$/;

const AgeRequestsParams = () => {
  const intl = useIntl();
  const validateInterval = (value) => (
    !value || GO_DURATION.test(value.trim())
      ? undefined
      : intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.validate.interval' })
  );

  return (
    <Row>
      <Col xs={6}>
        <Field
          id="scheduled-action-age-interval"
          name="actionParams.interval"
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
