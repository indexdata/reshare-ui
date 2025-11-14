import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import {
  Accordion,
  AccordionSet,
  Col,
  Row,
  TextField,
} from '@folio/stripes/components';
import SymbolsField from './SymbolsField';
import { required } from '../util/validators';

const EntryForm = () => {
  return (
    <AccordionSet>
      <Accordion
        id="entry-info"
        label={<FormattedMessage id="ui-rsdir.entries.info" />}
      >
        <Row>
          <Col xs={12}>
            <Field
              name="name"
              component={TextField}
              label={<FormattedMessage id="ui-rsdir.entry.name" />}
              required
              validate={required}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <SymbolsField />
          </Col>
        </Row>
      </Accordion>
    </AccordionSet>
  );
};

export default EntryForm;
