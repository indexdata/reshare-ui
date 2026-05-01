import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Accordion,
  AccordionSet,
  Col,
  Select,
  Row,
  TextField,
} from '@folio/stripes/components';
import SymbolsField from './SymbolsField';
import NetworksField from './NetworksField';
import { required } from '../util/validators';
import AddressesField from './AddressesField';

const types = [
  { 
    label: 'Institution',
    value: 'Institution'
  },
  {
    label: 'Consortium',
    value: 'Consortium'
  }
];

const EntryForm = () => {
  return (
    <AccordionSet>
      <Accordion
        id="entry-info"
        label={<FormattedMessage id="ui-rsdir.entries.info" />}
      >
        <Row>
          <Col xs={6}>
            <Field
              name="name"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.name" />}
              required
              validate={required}
            />
          </Col>
          <Col xs={6}>
            <Field
              name="type"
              component={Select}
              label={<FormattedMessage id="ui-rsdir.entry.type" />}
              required
              dataOptions={types}
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Field
              name="description"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.description" />}
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <Field
              name="organizationId"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.organizationId" />}
              validate={required}
            />
          </Col>
          <Col>
            <Field
              name="contactName"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.contactName" />}
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <Field
              name="email"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.email" />}
              validate={required}
            />
          </Col>
          <Col>
            <Field
              name="phoneNumber"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.phoneNumber" />}
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <SymbolsField />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <AddressesField />
          </Col>
        </Row>
      </Accordion>
    </AccordionSet>
  );
};

export default EntryForm;
