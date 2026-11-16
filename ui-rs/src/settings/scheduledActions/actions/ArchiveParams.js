import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Checkbox, Col, KeyValue, Row, TextField } from '@folio/stripes/components';

import isPositiveDuration from './isPositiveDuration';

export const ArchiveParams = () => {
  const intl = useIntl();

  return (
    <Row>
      <Col xs={12} md={6}>
        <Field
          id="scheduled-action-archive-interval"
          name="actionParams.interval"
          required
          component={TextField}
          validate={value => (isPositiveDuration(value)
            ? undefined
            : intl.formatMessage({ id: 'ui-rs.settings.scheduledActions.validate.archiveInterval' }))}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.archiveInterval" />}
        />
      </Col>
      <Col xs={12} md={6}>
        <Field
          id="scheduled-action-archive-anonymize"
          name="actionParams.anonymize"
          type="checkbox"
          component={Checkbox}
          label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.anonymize" />}
        />
      </Col>
    </Row>
  );
};

export const ArchiveView = ({ actionParams }) => (
  <>
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.archiveInterval" />}
      value={actionParams?.interval}
    />
    <KeyValue
      label={<FormattedMessage id="ui-rs.settings.scheduledActions.params.anonymize" />}
      value={<FormattedMessage id={actionParams?.anonymize ? 'ui-rs.yes' : 'ui-rs.no'} />}
    />
  </>
);
