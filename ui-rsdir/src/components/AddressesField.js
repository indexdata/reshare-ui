import React from 'react';
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

const ADDRESS_COMPONENT_TYPE_OPTIONS = [
  { labelId: 'ui-rsdir.address.componentType.thoroughfare', value: 'Thoroughfare' },
  { labelId: 'ui-rsdir.address.componentType.locality', value: 'Locality' },
  { labelId: 'ui-rsdir.address.componentType.administrativeArea', value: 'AdministrativeArea' },
  { labelId: 'ui-rsdir.address.componentType.postalCode', value: 'PostalCode' },
  { labelId: 'ui-rsdir.address.componentType.countryCode', value: 'CountryCode' },
  { labelId: 'ui-rsdir.address.componentType.other', value: 'Other' },
];

const buildOptions = options => [
  { label: '', value: '' },
  ...options.map(option => ({
    label: <FormattedMessage id={option.labelId} />,
    value: option.value,
  })),
];

const parseInteger = value => {
  if (value === '' || value === undefined) {
    return undefined;
  }

  return Number.parseInt(value, 10);
};

const createAddress = () => ({
  type: '',
  addressComponents: [],
});

const createAddressComponent = fields => ({
  seq: fields.length + 1,
  type: '',
  value: '',
});

const AddressesField = () => {
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
              <FieldArray name={`${name}.addressComponents`}>
                {({ fields: componentFields }) => (
                  <div>
                    {componentFields.map((componentName, componentIndex) => (
                      <Card
                        key={componentName}
                        headerStart={<FormattedMessage id="ui-rsdir.address.component.index" values={{ index: componentIndex + 1 }} />}
                        headerEnd={
                          <IconButton
                            icon="trash"
                            onClick={() => componentFields.remove(componentIndex)}
                            aria-label="Remove address component"
                          />
                        }
                      >
                        <Row>
                          <Col xs={4}>
                            <Field
                              name={`${componentName}.seq`}
                              component={TextField}
                              type="number"
                              parse={parseInteger}
                              label={<FormattedMessage id="ui-rsdir.address.sequence" />}
                              required
                              validate={required}
                            />
                          </Col>
                          <Col xs={4}>
                            <Field
                              name={`${componentName}.type`}
                              component={Select}
                              dataOptions={buildOptions(ADDRESS_COMPONENT_TYPE_OPTIONS)}
                              label={<FormattedMessage id="ui-rsdir.address.type" />}
                              required
                              validate={required}
                            />
                          </Col>
                          <Col xs={4}>
                            <Field
                              name={`${componentName}.value`}
                              component={TextField}
                              label={<FormattedMessage id="ui-rsdir.address.value" />}
                              required
                              validate={required}
                            />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button
                      id={`add-address-component-button-${index}`}
                      onClick={() => componentFields.push(createAddressComponent(componentFields))}
                    >
                      <FormattedMessage id="ui-rsdir.address.component.add" />
                    </Button>
                  </div>
                )}
              </FieldArray>
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

export default AddressesField;
