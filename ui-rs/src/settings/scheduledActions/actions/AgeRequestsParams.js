import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Col, KeyValue, Row, TextField } from '@folio/stripes/components';

// A Go time.ParseDuration string limited to second/minute/hour units: one or
// more number+unit segments, e.g. "168h", "1.5h", "72h3m30s". No sign — a
// negative aging interval is meaningless here.
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

// Read-only counterpart for the detail view.
export const AgeRequestsView = ({ actionParams }) => (
  <KeyValue
    label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.interval" />}
    value={actionParams?.interval}
  />
);
