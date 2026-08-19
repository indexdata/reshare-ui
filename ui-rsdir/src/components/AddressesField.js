import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
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

const AddressesField = ({ addressPlugin }) => {
  const AddressFields = addressPlugin.addressFields;

  return (
    <FieldArray name="addresses">
      {({ fields }) => (
        <div>
          {fields.map((name, index) => (
            <Card
              key={name}
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
                name={name}
                textFieldComponent={TextField}
              />
            </Card>
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

AddressesField.propTypes = {
  addressPlugin: PropTypes.shape({
    addressFields: PropTypes.elementType.isRequired,
  }).isRequired,
};

export default AddressesField;
