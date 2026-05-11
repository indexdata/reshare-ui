import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Col,
  Row,
  Select,
  TextField,
} from '@folio/stripes/components';

const entryPath = id => `rsdir/entries/by-id/${id}`;

const fieldLabelId = fieldName => `ui-rsdir.lmsConfig.${fieldName}`;

const toEditorValue = value => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const normalizedValueType = valueType => valueType?.toLowerCase?.() || 'string';

const valueForPatch = (value, valueType) => {
  const type = normalizedValueType(valueType);

  if (type === 'boolean') {
    return value === 'true';
  }

  if (type === 'integer') {
    return value === '' ? null : Number.parseInt(value, 10);
  }

  if (type === 'number') {
    return value === '' ? null : Number.parseFloat(value);
  }

  return value;
};

const buildChoiceOptions = validChoices => [
  { label: '', value: '' },
  ...validChoices.map(choice => ({
    label: String(choice),
    value: String(choice),
  })),
];

const parseJsonResponse = response => response.text()
  .then(text => (text ? JSON.parse(text) : undefined));

const valuesFromEntry = (entry, fieldMapping) => fieldMapping.reduce((acc, field) => ({
  ...acc,
  [field.fieldName]: toEditorValue(entry?.lmsConfig?.[field.fieldName]),
}), {});

const LMSConfigEditor = ({ id, entry: initialEntry, fieldMapping = [] }) => {
  const ky = useOkapiKy();
  const intl = useIntl();
  const [entry, setEntry] = useState(initialEntry);
  const [values, setValues] = useState(() => valuesFromEntry(initialEntry, fieldMapping));
  const [savingFields, setSavingFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const booleanOptions = useMemo(() => [
    { label: '', value: '' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.true', defaultMessage: 'True' }), value: 'true' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.false', defaultMessage: 'False' }), value: 'false' },
  ], [intl]);

  useEffect(() => {
    setEntry(initialEntry);
    setValues(valuesFromEntry(initialEntry, fieldMapping));
  }, [fieldMapping, initialEntry]);

  const handleChange = fieldName => event => {
    setValues(current => ({
      ...current,
      [fieldName]: event.target.value,
    }));
  };

  const saveField = field => {
    const { fieldName, valueType, required } = field;
    const value = values[fieldName];

    if (required && value === '') {
      setFieldErrors(current => ({
        ...current,
        [fieldName]: intl.formatMessage({ id: 'stripes-core.label.missingRequiredField', defaultMessage: 'Required' }),
      }));
      return;
    }

    setSavingFields(current => ({ ...current, [fieldName]: true }));
    setFieldErrors(current => ({ ...current, [fieldName]: undefined }));

    const patchValue = valueForPatch(value, valueType);

    ky.patch(entryPath(id), {
      json: {
        lmsConfig: {
          [fieldName]: patchValue,
        },
      },
    })
      .then(parseJsonResponse)
      .then(updatedEntry => {
        setEntry(current => updatedEntry || {
          ...current,
          lmsConfig: {
            ...current?.lmsConfig,
            [fieldName]: patchValue,
          },
        });
      })
      .catch(error => {
        setFieldErrors(current => ({
          ...current,
          [fieldName]: error.message,
        }));
      })
      .finally(() => {
        setSavingFields(current => ({ ...current, [fieldName]: false }));
      });
  };

  const renderFieldInput = field => {
    const { fieldName, valueType, required, validChoices = [] } = field;
    const type = normalizedValueType(valueType);
    const commonProps = {
      id: `lms-config-${fieldName}`,
      error: fieldErrors[fieldName],
      label: intl.formatMessage({ id: fieldLabelId(fieldName), defaultMessage: fieldName }),
      onChange: handleChange(fieldName),
      required,
      value: values[fieldName] || '',
    };

    if (validChoices.length > 0) {
      return (
        <Select
          {...commonProps}
          dataOptions={buildChoiceOptions(validChoices)}
        />
      );
    }

    if (type === 'boolean') {
      return (
        <Select
          {...commonProps}
          dataOptions={booleanOptions}
        />
      );
    }

    return (
      <TextField
        {...commonProps}
        type={type === 'integer' || type === 'number' ? 'number' : 'text'}
      />
    );
  };

  return (
    <div>
      {fieldMapping.map(field => (
        <Row bottom="xs" key={field.fieldName}>
          <Col xs={8}>
            {renderFieldInput(field)}
          </Col>
          <Col xs={4}>
            <Button
              buttonStyle="primary"
              disabled={savingFields[field.fieldName]}
              id={`save-lms-config-${field.fieldName}`}
              onClick={() => saveField(field)}
            >
              <FormattedMessage id="stripes-components.saveAndClose.save" defaultMessage="Save" />
            </Button>
          </Col>
        </Row>
      ))}
      {!entry?.lmsConfig &&
        <div>
          <FormattedMessage
            id="ui-rsdir.lmsConfig.empty"
            defaultMessage="No LMS configuration has been saved for this entry."
          />
        </div>
      }
    </div>
  );
};

export default LMSConfigEditor;
