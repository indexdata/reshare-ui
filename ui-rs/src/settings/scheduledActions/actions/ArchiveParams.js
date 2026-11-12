import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Checkbox, Col, KeyValue, Row, TextField } from '@folio/stripes/components';

const DURATION_PART = '(\\d+(?:\\.\\d*)?|\\.\\d+)(ns|us|µs|μs|ms|s|m|h)';
const GO_DURATION = new RegExp(`^\\+?(?:${DURATION_PART})+$`);
const NANOSECONDS = { ns: 1, us: 1e3, µs: 1e3, μs: 1e3, ms: 1e6, s: 1e9, m: 60e9, h: 3600e9 };

const isPositiveDuration = (value) => {
  if (typeof value !== 'string' || !GO_DURATION.test(value)) return false;
  const nanoseconds = Array.from(value.matchAll(new RegExp(DURATION_PART, 'g')))
    .reduce((total, [, amount, unit]) => total + Math.trunc(Number(amount) * NANOSECONDS[unit]), 0);
  // Go durations use signed 64-bit nanoseconds.
  return nanoseconds > 0 && nanoseconds < 2 ** 63;
};

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
