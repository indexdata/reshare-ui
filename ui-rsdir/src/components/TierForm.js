import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Col,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';
import { required, requiredValue } from '../util/validators';

const LEVEL_OPTIONS = [
  'express',
  'normal',
  'rush',
  'secondarymail',
  'standard',
  'urgent',
];

const TYPE_OPTIONS = [
  'loan',
  'copy',
];

const buildOptions = (values, prefix) => values.map(value => ({
  label: <FormattedMessage id={`${prefix}.${value}`} />,
  value,
}));

const parseNumber = value => {
  if (value === '' || value === undefined) {
    return undefined;
  }

  return Number.parseFloat(value);
};

const validateCost = value => {
  const requiredError = requiredValue(value);

  if (requiredError) {
    return requiredError;
  }

  const isCurrencyValue = Number.isFinite(value) &&
    value >= 0 &&
    /^\d+(?:\.\d{1,2})?$/.test(String(value));

  return isCurrencyValue
    ? undefined
    : <FormattedMessage id="ui-rsdir.tier.cost.invalid" />;
};

const TierForm = () => {
  return (
    <>
      <Row>
        <Col xs={12}>
          <Field
            name="name"
            component={TextField}
            label={<FormattedMessage id="ui-rsdir.tier.name" />}
            required
            validate={required}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={4}>
          <Field
            name="level"
            component={Select}
            dataOptions={buildOptions(LEVEL_OPTIONS, 'ui-rsdir.tier.level')}
            label={<FormattedMessage id="ui-rsdir.tier.level" />}
            required
            validate={required}
          />
        </Col>
        <Col xs={4}>
          <Field
            name="type"
            component={Select}
            dataOptions={buildOptions(TYPE_OPTIONS, 'ui-rsdir.tier.type')}
            label={<FormattedMessage id="ui-rsdir.tier.type" />}
            required
            validate={required}
          />
        </Col>
        <Col xs={4}>
          <Field
            name="cost"
            component={TextField}
            type="number"
            min="0"
            step="0.01"
            parse={parseNumber}
            label={<FormattedMessage id="ui-rsdir.tier.cost" />}
            required
            validate={validateCost}
          />
        </Col>
      </Row>
    </>
  );
};

export default TierForm;
