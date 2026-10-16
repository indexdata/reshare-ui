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
import { createFormSymbol, normalizeAuthority } from '../util/symbolAdapter';

const validateAuthorities = symbols => {
  const rows = symbols || [];
  const authorities = rows.map(symbol => normalizeAuthority(symbol.authority));
  const errors = authorities.map((authority, index) => {
    // Unchanged stored Authorities are exempt, including historical duplicates.
    if (!authority || authority === rows[index]._editor?.originalAuthority) return undefined;

    return authorities.some((other, otherIndex) => otherIndex !== index && other === authority)
      ? { authority: <FormattedMessage id="ui-rsdir.symbol.authority.duplicate" /> }
      : undefined;
  });

  return errors.some(Boolean) ? errors : undefined;
};

const SymbolsField = () => {
  return (
    <FieldArray name="symbols" validate={validateAuthorities}>
      {({ fields }) => (
        <div>
          {fields.map((name, index) => (
            <Card
              key={fields.value[index]._editor.key}
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
            onClick={() => fields.push(createFormSymbol())}
          >
            <FormattedMessage id="ui-rsdir.symbol.add" />
          </Button>
        </div>
      )}
    </FieldArray>
  );
};

export default SymbolsField;
