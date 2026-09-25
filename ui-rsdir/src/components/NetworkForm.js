import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Col,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';
import { required } from '../util/validators';

const reciprocalOptions = [
  { label: <FormattedMessage id="ui-rsdir.network.reciprocal.unspecified" />, value: '' },
  { label: <FormattedMessage id="stripes-components.boolean.true" />, value: 'true' },
  { label: <FormattedMessage id="stripes-components.boolean.false" />, value: 'false' },
];

const formatReciprocal = value => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
};

const parseReciprocal = value => {
  if (value === '') return null;
  return value === 'true';
};

const NetworkForm = ({ isEditing = false }) => {
  return (
    <Row>
      <Col xs={8}>
        <Field
          name="name"
          component={TextField}
          disabled={isEditing}
          label={<FormattedMessage id="ui-rsdir.network.name" />}
          required
          validate={required}
        />
      </Col>
      <Col xs={4}>
        <Field
          name="reciprocal"
          component={Select}
          dataOptions={reciprocalOptions}
          format={formatReciprocal}
          label={<FormattedMessage id="ui-rsdir.network.reciprocal" />}
          parse={parseReciprocal}
        />
      </Col>
    </Row>
  );
};

export default NetworkForm;
