import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Field } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import {
  Button,
  TextField,
  Row,
  Col,
  Card,
  IconButton,
} from '@folio/stripes/components';

const SymbolsField = () => {
  return (
    <FieldArray name="symbols">
      {({ fields }) => (
        <div>
          {fields.map((name, index) => (
            <Card
              key={name}
              headerStart={<FormattedMessage id="ui-rsdir.symbol.index" values={{ index: index + 1 }} />}
              headerEnd={
                <IconButton
                  icon="trash"
                  onClick={() => fields.remove(index)}
                  aria-label="Remove symbol"
                />
              }
            >
              <Row>
                <Col xs={6}>
                  <Field
                    name={`${name}.authority`}
                    component={TextField}
                    label={<FormattedMessage id="ui-rsdir.symbol.authority" />}
                    required
                  />
                </Col>
                <Col xs={6}>
                  <Field
                    name={`${name}.symbol`}
                    component={TextField}
                    label={<FormattedMessage id="ui-rsdir.symbol.symbol" />}
                    required
                  />
                </Col>
              </Row>
            </Card>
          ))}
          <Button
            id="add-symbol-button"
            onClick={() => fields.push({ authority: '', symbol: '' })}
          >
            <FormattedMessage id="ui-rsdir.symbol.add" />
          </Button>
        </div>
      )}
    </FieldArray>
  );
};

export default SymbolsField;
