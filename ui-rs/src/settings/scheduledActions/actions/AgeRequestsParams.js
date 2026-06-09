import React from 'react';
import { Field } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { Col, Row, TextField } from '@folio/stripes/components';

// Per-action settings for `age-requests`: a Go duration per request tier.
// Unvalidated text for now (e.g. "720h").
const DURATIONS = ['standard', 'rush', 'express'];

const AgeRequestsParams = () => (
  <Row>
    {DURATIONS.map(tier => (
      <Col xs={4} key={tier}>
        <Field
          id={`scheduled-action-age-${tier}`}
          name={`actionParams.${tier}`}
          component={TextField}
          label={<FormattedMessage id={`ui-rs.settings.scheduledActions.params.${tier}`} />}
        />
      </Col>
    ))}
  </Row>
);

export default AgeRequestsParams;
