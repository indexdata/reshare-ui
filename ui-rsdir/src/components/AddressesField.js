import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Field, useField } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import {
  Button,
  Card,
  Col,
  IconButton,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';
import { required } from '../util/validators';

const ADDRESS_TYPE_OPTIONS = [
  { labelId: 'ui-rsdir.address.addressType.default', value: 'Default' },
  { labelId: 'ui-rsdir.address.addressType.shipping', value: 'Shipping' },
  { labelId: 'ui-rsdir.address.addressType.billing', value: 'Billing' },
  { labelId: 'ui-rsdir.address.addressType.other', value: 'Other' },
];

const buildOptions = options => [
  { label: '', value: '' },
  ...options.map(option => ({
    label: <FormattedMessage id={option.labelId} />,
    value: option.value,
  })),
];

const createAddress = () => ({
  type: '',
  addressComponents: [],
});

const AddressCard = ({ addressPlugin, fields, index, name }) => {
  const AddressFields = addressPlugin.addressFields;
  const { input: countryInput } = useField(`${name}.country`, {
    subscription: { value: true },
  });
  const supportedCountries = addressPlugin.listOfSupportedCountries || [];
  const country = supportedCountries.includes(countryInput.value)
    ? countryInput.value
    : supportedCountries[0];

  return (
    <Card
      headerStart={<FormattedMessage id="ui-rsdir.address.index" values={{ index: index + 1 }} />}
      headerEnd={
        <IconButton
          icon="trash"
          onClick={() => fields.remove(index)}
          aria-label="Remove address"
        />
      }
    >
      <Row>
        <Col xs={6}>
          <Field
            name={`${name}.type`}
            component={Select}
            dataOptions={buildOptions(ADDRESS_TYPE_OPTIONS)}
            label={<FormattedMessage id="ui-rsdir.address.addressType" />}
            required
            validate={required}
          />
        </Col>
      </Row>
      <AddressFields
        country={country}
        name={name}
        textFieldComponent={TextField}
      />
    </Card>
  );
};

const AddressesField = ({ addressPlugin }) => {
  return (
    <FieldArray name="addresses">
      {({ fields }) => (
        <div>
          {fields.map((name, index) => (
            <AddressCard
              addressPlugin={addressPlugin}
              fields={fields}
              index={index}
              key={name}
              name={name}
            />
          ))}
          <Button
            id="add-address-button"
            onClick={() => fields.push(createAddress())}
          >
            <FormattedMessage id="ui-rsdir.address.add" />
          </Button>
        </div>
      )}
    </FieldArray>
  );
};

AddressCard.propTypes = {
  addressPlugin: PropTypes.shape({
    addressFields: PropTypes.elementType.isRequired,
    listOfSupportedCountries: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  fields: PropTypes.shape({
    remove: PropTypes.func.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
};

AddressesField.propTypes = {
  addressPlugin: PropTypes.shape({
    addressFields: PropTypes.elementType.isRequired,
  }).isRequired,
};

export default AddressesField;
