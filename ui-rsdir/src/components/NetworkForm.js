import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Col,
  Row,
  TextField,
} from '@folio/stripes/components';
import { required, requiredValue } from '../util/validators';

const parseNumber = value => {
  if (value === '' || value === undefined) {
    return undefined;
  }

  return Number.parseFloat(value);
};

const NetworkForm = () => {
  return (
    <Row>
      <Col xs={8}>
        <Field
          name="name"
          component={TextField}
          label={<FormattedMessage id="ui-rsdir.network.name" />}
          required
          validate={required}
        />
      </Col>
      <Col xs={4}>
        <Field
          name="priority"
          component={TextField}
          type="number"
          step="any"
          parse={parseNumber}
          label={<FormattedMessage id="ui-rsdir.network.priority" />}
          required
          validate={requiredValue}
        />
      </Col>
    </Row>
  );
};

export default NetworkForm;
