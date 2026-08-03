import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useQueryClient } from 'react-query';
import { CalloutContext, useOkapiKy } from '@folio/stripes/core';
import {
  Button,
  Card,
  IconButton,
  Select,
  TextField,
} from '@folio/stripes/components';

import css from './LMSConfigEditor.css';

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
    if (value === '') {
      return null;
    }
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
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState(initialEntry);
  const [values, setValues] = useState(() => valuesFromEntry(initialEntry, fieldMapping));
  const [editingFields, setEditingFields] = useState({});
  const [savingFields, setSavingFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const editingFieldsRef = useRef({});
  const previousIdRef = useRef(id);

  const booleanOptions = useMemo(() => [
    { label: '', value: '' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.true', defaultMessage: 'True' }), value: 'true' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.false', defaultMessage: 'False' }), value: 'false' },
  ], [intl]);

  useEffect(() => {
    const nextValues = valuesFromEntry(initialEntry, fieldMapping);
    const isNewEntry = previousIdRef.current !== id;

    setEntry(initialEntry);
    setValues(current => {
      if (isNewEntry) {
        return nextValues;
      }

      return fieldMapping.reduce((acc, field) => ({
        ...acc,
        [field.fieldName]: editingFieldsRef.current[field.fieldName] ?
          current[field.fieldName] ?? '' :
          nextValues[field.fieldName],
      }), {});
    });

    if (isNewEntry) {
      editingFieldsRef.current = {};
      setEditingFields({});
      setFieldErrors({});
    }

    previousIdRef.current = id;
  }, [fieldMapping, id, initialEntry]);

  const committedValue = fieldName => toEditorValue(entry?.lmsConfig?.[fieldName]);

  const setFieldEditing = (fieldName, isEditing) => {
    const nextEditingFields = {
      ...editingFieldsRef.current,
      [fieldName]: isEditing,
    };

    editingFieldsRef.current = nextEditingFields;
    setEditingFields(nextEditingFields);
  };

  const handleChange = fieldName => event => {
    setValues(current => ({
      ...current,
      [fieldName]: event.target.value,
    }));
  };

  const editField = fieldName => {
    setValues(current => ({
      ...current,
      [fieldName]: committedValue(fieldName),
    }));
    setFieldErrors(current => ({
      ...current,
      [fieldName]: undefined,
    }));
    setFieldEditing(fieldName, true);
  };

  const cancelEditingField = fieldName => {
    setValues(current => ({
      ...current,
      [fieldName]: committedValue(fieldName),
    }));
    setFieldErrors(current => ({
      ...current,
      [fieldName]: undefined,
    }));
    setFieldEditing(fieldName, false);
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
        const currentEntry = queryClient.getQueryData(entryPath(id)) || entry;
        const nextEntry = updatedEntry || {
          ...currentEntry,
          lmsConfig: {
            ...currentEntry?.lmsConfig,
            [fieldName]: patchValue,
          },
        };

        setEntry(nextEntry);
        setValues(current => ({
          ...current,
          [fieldName]: toEditorValue(nextEntry?.lmsConfig?.[fieldName]),
        }));
        setFieldEditing(fieldName, false);
        queryClient.setQueryData(entryPath(id), nextEntry);
        queryClient.invalidateQueries(entryPath(id));
        callout.sendCallout({
          type: 'success',
          message: <FormattedMessage id="ui-rsdir.lmsConfig.edit.success" />,
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
      'aria-label': intl.formatMessage({ id: fieldLabelId(fieldName), defaultMessage: fieldName }),
      id: `lms-config-${fieldName}`,
      error: fieldErrors[fieldName],
      onChange: handleChange(fieldName),
      required,
      value: values[fieldName] ?? '',
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
      {fieldMapping.map(field => {
        const { fieldName } = field;
        const isEditing = editingFields[fieldName];
        const isSaving = savingFields[fieldName];

        return (
          <Card
            roundedBorder
            key={fieldName}
            headerStart={intl.formatMessage({ id: fieldLabelId(fieldName), defaultMessage: fieldName })}
            headerEnd={
              <Button
                buttonStyle={isEditing ? 'primary' : undefined}
                disabled={isSaving}
                id={`${isEditing ? 'save' : 'edit'}-lms-config-${fieldName}`}
                onClick={() => (isEditing ? saveField(field) : editField(fieldName))}
              >
                {isEditing ?
                  <FormattedMessage id="stripes-components.saveAndClose.save" defaultMessage="Save" /> :
                  <FormattedMessage id="ui-rsdir.edit" defaultMessage="Edit" />
                }
              </Button>
            }
          >
            {isEditing ?
              <div className={css.fieldEditor}>
                <div className={css.fieldInput}>
                  {renderFieldInput(field)}
                </div>
                <IconButton
                  aria-label={intl.formatMessage({ id: 'ui-rsdir.cancel', defaultMessage: 'Cancel' })}
                  disabled={isSaving}
                  icon="times"
                  iconSize="small"
                  id={`cancel-lms-config-${fieldName}`}
                  onClick={() => cancelEditingField(fieldName)}
                  size="small"
                />
              </div> :
              committedValue(fieldName)
            }
          </Card>
        );
      })}
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
