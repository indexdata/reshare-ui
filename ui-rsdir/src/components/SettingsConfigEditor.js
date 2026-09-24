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
  Tooltip,
} from '@folio/stripes/components';

import css from './SettingsConfigEditor.css';

const STRING_ARRAY = 'stringarray';
const STRING_MAP = 'stringmap';
const SYMBOL_LIST = 'symbollist';
const SUB_FIELD = 'subfield';
const OBJECT_ARRAY = 'objectarray';
const INTEGER_PATTERN = /^-?\d+$/;

const normalizedValueType = valueType => valueType?.toLowerCase?.() || 'string';

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

const hasOwnValue = (source, fieldName) => isObject(source) &&
  Object.prototype.hasOwnProperty.call(source, fieldName) &&
  source[fieldName] !== null && source[fieldName] !== undefined;

const selectedSubFields = (value, field) => field.subMap.filter(child => hasOwnValue(value, child.fieldName));

const isValidSymbol = value => isObject(value) &&
  typeof value.authority === 'string' && !!value.authority &&
  typeof value.symbol === 'string' && !!value.symbol;

const symbolKey = value => JSON.stringify([value.authority, value.symbol]);

const symbolLabel = value => `${value.authority}:${value.symbol}`;

const normalizedSymbols = value => (Array.isArray(value) ? value : [])
  .filter(isValidSymbol)
  .map(({ authority, symbol }) => ({ authority, symbol }));

const validateFieldDefinition = (field, path = field.fieldName) => {
  const type = normalizedValueType(field.valueType);

  if (field.onlyOne && type !== SUB_FIELD) {
    throw new Error(`SettingsConfigEditor field "${path}" can use onlyOne only with type subField.`);
  }

  if (type === STRING_MAP && field.requiredKeys !== undefined && (
    !Array.isArray(field.requiredKeys) ||
    field.requiredKeys.some(key => typeof key !== 'string')
  )) {
    throw new Error(`SettingsConfigEditor stringMap field "${path}" requires requiredKeys to be an array of strings.`);
  }

  if (type === OBJECT_ARRAY) {
    if (!Array.isArray(field.objectMap)) {
      throw new Error(`SettingsConfigEditor field "${path}" requires an objectMap array.`);
    }

    field.objectMap.forEach(child => {
      const childPath = `${path}.${child.fieldName}`;
      const childType = normalizedValueType(child.valueType);

      if (childType === SUB_FIELD || childType === OBJECT_ARRAY) {
        throw new Error(`SettingsConfigEditor objectMap field "${childPath}" cannot have type ${child.valueType}.`);
      }

      validateFieldDefinition(child, childPath);
    });
    return;
  }

  if (type !== SUB_FIELD) {
    return;
  }

  if (!Array.isArray(field.subMap)) {
    throw new Error(`SettingsConfigEditor field "${path}" requires a subMap array.`);
  }

  field.subMap.forEach(child => {
    const childPath = `${path}.${child.fieldName}`;
    validateFieldDefinition(child, childPath);
  });
};

const toEditorValue = (value, field, onlyPresent = false) => {
  const type = normalizedValueType(field.valueType);

  if (type === STRING_ARRAY) {
    return Array.isArray(value) ? [...value] : [];
  }

  if (type === SYMBOL_LIST) {
    return normalizedSymbols(value);
  }

  if (type === STRING_MAP) {
    return isObject(value) ? { ...value } : {};
  }

  if (type === OBJECT_ARRAY) {
    const source = Array.isArray(value) ? value : [];

    return source.map(item => field.objectMap.reduce((acc, child) => {
      if (onlyPresent && !hasOwnValue(item, child.fieldName)) {
        delete acc[child.fieldName];
        return acc;
      }

      return {
        ...acc,
        [child.fieldName]: toEditorValue(
          isObject(item) ? item[child.fieldName] : undefined,
          child,
          onlyPresent,
        ),
      };
    }, isObject(item) ? { ...item } : {}));
  }

  if (type === SUB_FIELD) {
    const source = isObject(value) ? value : {};
    const preserveAbsence = onlyPresent || field.onlyOne;

    return field.subMap.reduce((acc, child) => {
      if (preserveAbsence && !hasOwnValue(source, child.fieldName)) {
        delete acc[child.fieldName];
        return acc;
      }

      return {
        ...acc,
        [child.fieldName]: toEditorValue(source[child.fieldName], child, preserveAbsence),
      };
    }, { ...source });
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const valueForPatch = (value, field, onlyPresent = false) => {
  const type = normalizedValueType(field.valueType);

  if (type === STRING_ARRAY) {
    return Array.isArray(value) ? [...value] : [];
  }

  if (type === SYMBOL_LIST) {
    return normalizedSymbols(value);
  }

  if (type === STRING_MAP) {
    return isObject(value) ? { ...value } : {};
  }

  if (type === OBJECT_ARRAY) {
    const source = Array.isArray(value) ? value : [];

    return source.map(item => field.objectMap.reduce((acc, child) => {
      if (onlyPresent && !hasOwnValue(item, child.fieldName)) {
        delete acc[child.fieldName];
        return acc;
      }

      return {
        ...acc,
        [child.fieldName]: valueForPatch(
          isObject(item) ? item[child.fieldName] : undefined,
          child,
          onlyPresent,
        ),
      };
    }, isObject(item) ? { ...item } : {}));
  }

  if (type === SUB_FIELD) {
    const source = isObject(value) ? value : {};
    const preserveAbsence = onlyPresent || field.onlyOne;

    return field.subMap.reduce((acc, child) => {
      if (preserveAbsence && !hasOwnValue(source, child.fieldName)) {
        delete acc[child.fieldName];
        return acc;
      }

      return {
        ...acc,
        [child.fieldName]: valueForPatch(source[child.fieldName], child, preserveAbsence),
      };
    }, { ...source });
  }

  if (type === 'boolean') {
    if (value === '') {
      return null;
    }
    return value === 'true';
  }

  if (type === 'integer') {
    return value === '' ? null : Number(value);
  }

  if (type === 'number') {
    return value === '' ? null : Number.parseFloat(value);
  }

  return value;
};

const isEmptyFieldValue = (value, field) => {
  const type = normalizedValueType(field.valueType);

  if (type === STRING_ARRAY || type === SYMBOL_LIST || type === OBJECT_ARRAY) {
    return !Array.isArray(value) || value.length === 0;
  }

  if (type === STRING_MAP) {
    return !isObject(value) || Object.keys(value).length === 0;
  }

  if (type === SUB_FIELD) {
    const source = isObject(value) ? value : {};

    if (field.onlyOne) {
      return selectedSubFields(source, field).length === 0;
    }

    return field.subMap.every(child => isEmptyFieldValue(source[child.fieldName], child));
  }

  return value === '' || value === null || value === undefined;
};

const missingRequiredStringMapKeys = (value, requiredKeys = []) => {
  const mapValue = isObject(value) ? value : {};

  return requiredKeys.filter((key, index) => (
    requiredKeys.indexOf(key) === index &&
    !Object.prototype.hasOwnProperty.call(mapValue, key)
  ));
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

const valuesFromResource = (resource, configKey, fieldMapping) => fieldMapping.reduce((acc, field) => ({
  ...acc,
  [field.fieldName]: toEditorValue(resource?.[configKey]?.[field.fieldName], field),
}), {});

const omitRootPath = (state, rootPath) => Object.keys(state).reduce((acc, path) => (
  path === rootPath || path.startsWith(`${rootPath}.`) ? acc : { ...acc, [path]: state[path] }
), {});

const SettingsConfigEditor = ({
  configKey,
  controlIdPrefix = 'settings-config',
  emptyMessage,
  fieldLabelId,
  fieldMapping = [],
  initialResource,
  resourcePath,
  successMessage,
}) => {
  useMemo(() => {
    fieldMapping.forEach(field => validateFieldDefinition(field));
    return null;
  }, [fieldMapping]);
  const ky = useOkapiKy();
  const intl = useIntl();
  const callout = useContext(CalloutContext);
  const queryClient = useQueryClient();
  const [resource, setResource] = useState(initialResource);
  const [values, setValues] = useState(() => valuesFromResource(initialResource, configKey, fieldMapping));
  const [editingFields, setEditingFields] = useState({});
  const [savingFields, setSavingFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [newStringValues, setNewStringValues] = useState({});
  const [newSymbolValues, setNewSymbolValues] = useState({});
  const [symbolEntryErrors, setSymbolEntryErrors] = useState({});
  const [newStringMapEntries, setNewStringMapEntries] = useState({});
  const [stringMapEntryErrors, setStringMapEntryErrors] = useState({});
  const [newObjectValues, setNewObjectValues] = useState({});
  const editingFieldsRef = useRef({});
  const activeResourcePathRef = useRef(resourcePath);
  const previousResourcePathRef = useRef(resourcePath);
  activeResourcePathRef.current = resourcePath;

  const booleanOptions = useMemo(() => [
    { label: '', value: '' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.true', defaultMessage: 'True' }), value: 'true' },
    { label: intl.formatMessage({ id: 'stripes-components.boolean.false', defaultMessage: 'False' }), value: 'false' },
  ], [intl]);

  useEffect(() => {
    const nextValues = valuesFromResource(initialResource, configKey, fieldMapping);
    const isNewResource = previousResourcePathRef.current !== resourcePath;

    setResource(initialResource);
    setValues(current => {
      if (isNewResource) {
        return nextValues;
      }

      return fieldMapping.reduce((acc, field) => ({
        ...acc,
        [field.fieldName]: editingFieldsRef.current[field.fieldName] ?
          current[field.fieldName] ?? toEditorValue(undefined, field) :
          nextValues[field.fieldName],
      }), {});
    });

    if (isNewResource) {
      editingFieldsRef.current = {};
      setEditingFields({});
      setSavingFields({});
      setFieldErrors({});
      setNewStringValues({});
      setNewSymbolValues({});
      setSymbolEntryErrors({});
      setNewStringMapEntries({});
      setStringMapEntryErrors({});
      setNewObjectValues({});
    }

    previousResourcePathRef.current = resourcePath;
  }, [configKey, fieldMapping, initialResource, resourcePath]);

  const contextForField = (field, parentContext) => ({
    path: [...(parentContext?.path || []), field.fieldName],
    topField: parentContext?.topField || field,
  });

  const pathForField = (field, parentContext) => contextForField(field, parentContext).path.join('.');

  const controlPathForField = (field, parentContext) => pathForField(field, parentContext).split('.').join('-');

  const topFieldName = (field, parentContext) => contextForField(field, parentContext).topField.fieldName;

  const valueAtPath = (source, path) => path.reduce((value, key) => value?.[key], source);

  const valueWithPathUpdated = (source, path, nextValue) => {
    const [key, ...remainingPath] = path;
    const currentValue = isObject(source) ? source : {};

    if (remainingPath.length === 0) {
      const previousValue = currentValue[key];
      return {
        ...currentValue,
        [key]: typeof nextValue === 'function' ? nextValue(previousValue) : nextValue,
      };
    }

    return {
      ...currentValue,
      [key]: valueWithPathUpdated(currentValue[key], remainingPath, nextValue),
    };
  };

  const labelForPath = path => intl.formatMessage({
    id: fieldLabelId(path),
    defaultMessage: path.split('.').pop(),
  });

  const renderFieldLabel = (field, path, instance) => {
    const label = labelForPath(path);

    if (!field.defaultDesc) {
      return label;
    }

    const tooltipId = [
      controlIdPrefix,
      path.split('.').join('-'),
      instance,
      'description',
    ].filter(Boolean).join('-');
    const description = intl.formatMessage({
      id: `${fieldLabelId(path)}.desc`,
      defaultMessage: field.defaultDesc,
    });

    return (
      <span className={css.fieldLabel}>
        <span>{label}</span>
        <Tooltip
          id={tooltipId}
          placement="top"
          text={description}
        >
          {({ ref, ariaIds }) => (
            <IconButton
              ref={ref}
              aria-describedby={ariaIds.text}
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.showFieldDescription',
                defaultMessage: 'Show description for {field}',
              }, { field: label })}
              icon="question-mark"
              iconSize="small"
              id={`${tooltipId}-trigger`}
              size="small"
            />
          )}
        </Tooltip>
      </span>
    );
  };

  const committedTopLevelValue = field => toEditorValue(
    resource?.[configKey]?.[field.fieldName],
    field,
  );

  const committedFieldValue = (field, parentContext) => {
    const context = contextForField(field, parentContext);
    const topLevelValue = committedTopLevelValue(context.topField);

    return context.path.length === 1 ? topLevelValue : valueAtPath(topLevelValue, context.path.slice(1));
  };

  const draftFieldValue = (field, parentContext) => valueAtPath(
    values,
    contextForField(field, parentContext).path,
  );

  const setDraftFieldValue = (field, parentContext, nextValue) => {
    const path = contextForField(field, parentContext).path;
    setValues(current => valueWithPathUpdated(current, path, nextValue));
  };

  const selectOnlyOneChild = (field, parentContext) => event => {
    const selectedFieldName = event.target.value;
    const mappedFieldNames = new Set(field.subMap.map(child => child.fieldName));
    const selectedField = selectedFieldName ?
      field.subMap.find(child => child.fieldName === selectedFieldName) : undefined;

    if (selectedFieldName && (!selectedField || selectedField.disabled)) {
      return;
    }

    setDraftFieldValue(field, parentContext, current => {
      const source = isObject(current) ? current : {};
      const unrelatedValues = Object.keys(source).reduce((acc, key) => (
        mappedFieldNames.has(key) ? acc : { ...acc, [key]: source[key] }
      ), {});

      if (!selectedFieldName) {
        return unrelatedValues;
      }

      const selectedValue = hasOwnValue(source, selectedFieldName) ?
        source[selectedFieldName] : toEditorValue(undefined, selectedField, true);

      return {
        ...unrelatedValues,
        [selectedFieldName]: selectedValue,
      };
    });
    setFieldErrors(current => omitRootPath(current, pathForField(field, parentContext)));
  };

  const clearTransientState = rootPath => {
    setFieldErrors(current => omitRootPath(current, rootPath));
    setNewStringValues(current => omitRootPath(current, rootPath));
    setNewSymbolValues(current => omitRootPath(current, rootPath));
    setSymbolEntryErrors(current => omitRootPath(current, rootPath));
    setNewStringMapEntries(current => omitRootPath(current, rootPath));
    setStringMapEntryErrors(current => omitRootPath(current, rootPath));
    setNewObjectValues(current => omitRootPath(current, rootPath));
  };

  const setFieldEditing = (fieldName, isEditing) => {
    const nextEditingFields = {
      ...editingFieldsRef.current,
      [fieldName]: isEditing,
    };

    editingFieldsRef.current = nextEditingFields;
    setEditingFields(nextEditingFields);
  };

  const editField = field => {
    setValues(current => ({
      ...current,
      [field.fieldName]: committedTopLevelValue(field),
    }));
    clearTransientState(field.fieldName);
    setFieldEditing(field.fieldName, true);
  };

  const cancelEditingField = field => {
    setValues(current => ({
      ...current,
      [field.fieldName]: committedTopLevelValue(field),
    }));
    clearTransientState(field.fieldName);
    setFieldEditing(field.fieldName, false);
  };

  const handleChange = (field, parentField) => event => {
    setDraftFieldValue(field, parentField, event.target.value);
  };

  const handleNewStringChange = path => event => {
    setNewStringValues(current => ({
      ...current,
      [path]: event.target.value,
    }));
  };

  const addStringArrayValue = (field, parentField) => {
    const path = pathForField(field, parentField);
    const nextValue = (newStringValues[path] || '').trim();

    if (!nextValue) {
      return;
    }

    setDraftFieldValue(field, parentField, current => [
      ...(Array.isArray(current) ? current : []),
      nextValue,
    ]);
    setNewStringValues(current => ({ ...current, [path]: '' }));
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const removeStringArrayValue = (field, parentField, index) => {
    const path = pathForField(field, parentField);
    setDraftFieldValue(field, parentField, current => current.filter((value, valueIndex) => valueIndex !== index));
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const handleNewStringKeyDown = (field, parentField) => event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addStringArrayValue(field, parentField);
    }
  };

  const handleNewSymbolChange = (path, property) => event => {
    setNewSymbolValues(current => ({
      ...current,
      [path]: {
        authority: '',
        symbol: '',
        ...current[path],
        [property]: event.target.value,
      },
    }));
    setSymbolEntryErrors(current => ({ ...current, [path]: undefined }));
  };

  const addSymbolListValue = (field, parentField) => {
    const path = pathForField(field, parentField);
    const newValue = newSymbolValues[path] || { authority: '', symbol: '' };
    const nextValue = {
      authority: newValue.authority.trim(),
      symbol: newValue.symbol.trim(),
    };

    if (!isValidSymbol(nextValue)) {
      return;
    }

    const currentValues = draftFieldValue(field, parentField) || [];
    if (currentValues.some(symbolValue => symbolKey(symbolValue) === symbolKey(nextValue))) {
      setSymbolEntryErrors(current => ({
        ...current,
        [path]: intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.duplicateSymbol',
          defaultMessage: 'The symbol {symbol} already exists.',
        }, { symbol: symbolLabel(nextValue) }),
      }));
      return;
    }

    setDraftFieldValue(field, parentField, current => [...(Array.isArray(current) ? current : []), nextValue]);
    setNewSymbolValues(current => ({ ...current, [path]: { authority: '', symbol: '' } }));
    setSymbolEntryErrors(current => ({ ...current, [path]: undefined }));
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const handleNewSymbolKeyDown = (field, parentField) => event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSymbolListValue(field, parentField);
    }
  };

  const removeSymbolListValue = (field, parentField, index) => {
    const path = pathForField(field, parentField);
    setDraftFieldValue(field, parentField, current => (
      (Array.isArray(current) ? current : []).filter((_value, valueIndex) => valueIndex !== index)
    ));
    setSymbolEntryErrors(current => ({ ...current, [path]: undefined }));
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const handleNewStringMapEntryChange = (path, property) => event => {
    setNewStringMapEntries(current => ({
      ...current,
      [path]: {
        key: '',
        value: '',
        ...current[path],
        [property]: event.target.value,
      },
    }));

    if (property === 'key') {
      setStringMapEntryErrors(current => ({ ...current, [path]: undefined }));
    }
  };

  const addStringMapEntry = (field, parentField) => {
    const path = pathForField(field, parentField);
    const newEntry = newStringMapEntries[path] || { key: '', value: '' };
    const key = newEntry.key.trim();
    const value = newEntry.value.trim();
    const currentMap = draftFieldValue(field, parentField) || {};

    if (!key || !value) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(currentMap, key)) {
      setStringMapEntryErrors(current => ({
        ...current,
        [path]: intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.duplicateStringMapKey',
          defaultMessage: 'The key {key} already exists.',
        }, { key }),
      }));
      return;
    }

    setDraftFieldValue(field, parentField, current => ({
      ...(current || {}),
      [key]: value,
    }));
    setNewStringMapEntries(current => ({ ...current, [path]: { key: '', value: '' } }));
    setStringMapEntryErrors(current => ({ ...current, [path]: undefined }));
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const removeStringMapEntry = (field, parentField, key) => {
    const path = pathForField(field, parentField);
    setDraftFieldValue(field, parentField, current => {
      const nextMap = { ...current };
      delete nextMap[key];
      return nextMap;
    });
    setFieldErrors(current => ({ ...current, [path]: undefined }));
    setStringMapEntryErrors(current => ({ ...current, [path]: undefined }));
  };

  const handleNewStringMapEntryKeyDown = (field, parentField) => event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addStringMapEntry(field, parentField);
    }
  };

  const emptyObjectValue = field => field.objectMap.reduce((acc, child) => ({
    ...acc,
    [child.fieldName]: toEditorValue(undefined, child),
  }), {});

  const newObjectValue = (field, parentField) => (
    newObjectValues[pathForField(field, parentField)] || emptyObjectValue(field)
  );

  const setNewObjectChildValue = (field, parentField, child, nextValue) => {
    const path = pathForField(field, parentField);

    setNewObjectValues(current => {
      const objectValue = current[path] || emptyObjectValue(field);
      const previousValue = objectValue[child.fieldName];

      return {
        ...current,
        [path]: {
          ...objectValue,
          [child.fieldName]: typeof nextValue === 'function' ? nextValue(previousValue) : nextValue,
        },
      };
    });
  };

  const newObjectChildPath = (field, parentField, child) => (
    `${pathForField(field, parentField)}.new.${child.fieldName}`
  );

  const addObjectStringArrayValue = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const nextValue = (newStringValues[childPath] || '').trim();

    if (!nextValue) {
      return;
    }

    setNewObjectChildValue(field, parentField, child, current => [
      ...(Array.isArray(current) ? current : []),
      nextValue,
    ]);
    setNewStringValues(current => ({ ...current, [childPath]: '' }));
    setFieldErrors(current => ({
      ...current,
      [childPath]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const removeObjectStringArrayValue = (field, parentField, child, index) => {
    const childPath = newObjectChildPath(field, parentField, child);
    setNewObjectChildValue(field, parentField, child, current => (
      current.filter((value, valueIndex) => valueIndex !== index)
    ));
    setFieldErrors(current => ({
      ...current,
      [childPath]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const addObjectSymbolListValue = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const newValue = newSymbolValues[childPath] || { authority: '', symbol: '' };
    const nextValue = {
      authority: newValue.authority.trim(),
      symbol: newValue.symbol.trim(),
    };

    if (!isValidSymbol(nextValue)) {
      return;
    }

    const objectValue = newObjectValue(field, parentField);
    const currentValues = objectValue[child.fieldName] || [];
    if (currentValues.some(symbolValue => symbolKey(symbolValue) === symbolKey(nextValue))) {
      setSymbolEntryErrors(current => ({
        ...current,
        [childPath]: intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.duplicateSymbol',
          defaultMessage: 'The symbol {symbol} already exists.',
        }, { symbol: symbolLabel(nextValue) }),
      }));
      return;
    }

    setNewObjectChildValue(field, parentField, child, current => [
      ...(Array.isArray(current) ? current : []),
      nextValue,
    ]);
    setNewSymbolValues(current => ({ ...current, [childPath]: { authority: '', symbol: '' } }));
    setSymbolEntryErrors(current => ({ ...current, [childPath]: undefined }));
    setFieldErrors(current => ({
      ...current,
      [childPath]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const removeObjectSymbolListValue = (field, parentField, child, index) => {
    const childPath = newObjectChildPath(field, parentField, child);
    setNewObjectChildValue(field, parentField, child, current => (
      (Array.isArray(current) ? current : []).filter((_value, valueIndex) => valueIndex !== index)
    ));
    setSymbolEntryErrors(current => ({ ...current, [childPath]: undefined }));
    setFieldErrors(current => ({
      ...current,
      [childPath]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const addObjectStringMapEntry = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const newEntry = newStringMapEntries[childPath] || { key: '', value: '' };
    const key = newEntry.key.trim();
    const value = newEntry.value.trim();
    const objectValue = newObjectValue(field, parentField);
    const currentMap = objectValue[child.fieldName] || {};

    if (!key || !value) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(currentMap, key)) {
      setStringMapEntryErrors(current => ({
        ...current,
        [childPath]: intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.duplicateStringMapKey',
          defaultMessage: 'The key {key} already exists.',
        }, { key }),
      }));
      return;
    }

    setNewObjectChildValue(field, parentField, child, current => ({
      ...(current || {}),
      [key]: value,
    }));
    setNewStringMapEntries(current => ({ ...current, [childPath]: { key: '', value: '' } }));
    setStringMapEntryErrors(current => ({ ...current, [childPath]: undefined }));
    setFieldErrors(current => ({
      ...current,
      [childPath]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const removeObjectStringMapEntry = (field, parentField, child, key) => {
    const childPath = newObjectChildPath(field, parentField, child);
    setNewObjectChildValue(field, parentField, child, current => {
      const nextMap = { ...current };
      delete nextMap[key];
      return nextMap;
    });
    setFieldErrors(current => ({ ...current, [childPath]: undefined }));
    setStringMapEntryErrors(current => ({ ...current, [childPath]: undefined }));
  };

  const objectValueRequiredMessage = () => intl.formatMessage({
    id: 'ui-rsdir.settingsConfig.objectArrayValueRequired',
    defaultMessage: 'At least one value is required.',
  });

  const requiredMessage = () => intl.formatMessage({
    id: 'stripes-core.label.missingRequiredField',
    defaultMessage: 'Required',
  });

  const invalidIntegerMessage = () => intl.formatMessage({
    id: 'ui-rsdir.settingsConfig.invalidInteger',
    defaultMessage: 'Enter a whole number using digits only.',
  });

  const integerOutOfRangeMessage = () => intl.formatMessage({
    id: 'ui-rsdir.settingsConfig.integerOutOfRange',
    defaultMessage: 'Enter a whole number between -9007199254740991 and 9007199254740991.',
  });

  const onlyOneMessage = () => intl.formatMessage({
    id: 'ui-rsdir.settingsConfig.onlyOne',
    defaultMessage: 'Select no more than one value.',
  });

  const validationErrorsForValue = (field, value, path) => {
    const errors = {};

    if (field.disabled) {
      return errors;
    }

    const type = normalizedValueType(field.valueType);

    if (field.required && isEmptyFieldValue(value, field)) {
      errors[path] = requiredMessage();
    }

    if (type === 'integer' && !isEmptyFieldValue(value, field)) {
      if (!INTEGER_PATTERN.test(value)) {
        errors[path] = invalidIntegerMessage();
      } else if (!Number.isSafeInteger(Number(value))) {
        errors[path] = integerOutOfRangeMessage();
      }
    }

    if (type === STRING_MAP && Array.isArray(field.requiredKeys)) {
      const missingKeys = missingRequiredStringMapKeys(value, field.requiredKeys);

      if (missingKeys.length > 0) {
        errors[path] = intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.missingRequiredStringMapKeys',
          defaultMessage: 'Missing required keys: {keys}.',
        }, { keys: missingKeys.join(', ') });
      }
    }

    if (type === SUB_FIELD) {
      const source = isObject(value) ? value : {};
      const selectedFields = field.onlyOne ? selectedSubFields(source, field) : field.subMap;

      if (field.onlyOne && selectedFields.length > 1) {
        errors[path] = onlyOneMessage();
      }

      selectedFields.forEach(child => {
        Object.assign(errors, validationErrorsForValue(
          child,
          source[child.fieldName],
          `${path}.${child.fieldName}`,
        ));
      });
    }

    if (type === OBJECT_ARRAY && Array.isArray(value)) {
      value.forEach((item, index) => {
        const objectPath = `${path}.${index}`;

        if (field.objectMap.every(child => isEmptyFieldValue(item?.[child.fieldName], child))) {
          errors[objectPath] = objectValueRequiredMessage();
        }

        field.objectMap.forEach(child => {
          Object.assign(errors, validationErrorsForValue(
            child,
            item?.[child.fieldName],
            `${objectPath}.${child.fieldName}`,
          ));
        });
      });
    }

    return errors;
  };

  const validationErrorsForField = field => {
    return validationErrorsForValue(field, values[field.fieldName], field.fieldName);
  };

  const saveField = field => {
    const { fieldName } = field;
    const savedResourcePath = resourcePath;
    const validationErrors = validationErrorsForField(field);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(current => ({
        ...omitRootPath(current, fieldName),
        ...validationErrors,
      }));
      return;
    }

    setSavingFields(current => ({ ...current, [fieldName]: true }));
    setFieldErrors(current => omitRootPath(current, fieldName));

    const patchValue = valueForPatch(values[fieldName], field);

    ky.patch(savedResourcePath, {
      json: {
        [configKey]: {
          [fieldName]: patchValue,
        },
      },
    })
      .then(parseJsonResponse)
      .then(updatedResource => {
        const currentResource = queryClient.getQueryData(savedResourcePath) || resource;
        const nextResource = updatedResource || {
          ...currentResource,
          [configKey]: {
            ...currentResource?.[configKey],
            [fieldName]: patchValue,
          },
        };

        queryClient.setQueryData(savedResourcePath, nextResource);
        queryClient.invalidateQueries(savedResourcePath);

        if (activeResourcePathRef.current !== savedResourcePath) {
          return;
        }

        setResource(nextResource);
        setValues(current => ({
          ...current,
          [fieldName]: toEditorValue(nextResource?.[configKey]?.[fieldName], field),
        }));
        clearTransientState(fieldName);
        setFieldEditing(fieldName, false);
        callout.sendCallout({
          type: 'success',
          message: successMessage,
        });
      })
      .catch(error => {
        if (activeResourcePathRef.current !== savedResourcePath) {
          return;
        }

        setFieldErrors(current => ({
          ...current,
          [fieldName]: field.getSaveErrorMessage?.(error) ?? error.message,
        }));
      })
      .finally(() => {
        if (activeResourcePathRef.current === savedResourcePath) {
          setSavingFields(current => ({ ...current, [fieldName]: false }));
        }
      });
  };

  const renderSymbolListValues = (field, isEditing, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const value = isEditing ? draftFieldValue(field, parentField) : committedFieldValue(field, parentField);
    const symbolValues = Array.isArray(value) ? value : [];

    return (
      <div className={css.structuredValues}>
        {symbolValues.map((symbolValue, index) => (
          <div className={css.structuredValue} key={`${symbolKey(symbolValue)}-${index}`}>
            <span className={css.structuredValueText}>{symbolLabel(symbolValue)}</span>
            {isEditing &&
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeSymbol',
                  defaultMessage: 'Remove {symbol} from {field}',
                }, { field: labelForPath(path), symbol: symbolLabel(symbolValue) })}
                disabled={savingFields[topFieldName(field, parentField)]}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeSymbolListValue(field, parentField, index)}
                size="small"
              />
            }
          </div>
        ))}
      </div>
    );
  };

  const renderSymbolListInput = (field, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const newValue = newSymbolValues[path] || { authority: '', symbol: '' };
    const isSaving = savingFields[topFieldName(field, parentField)];
    const canAdd = !!newValue.authority.trim() && !!newValue.symbol.trim();

    return (
      <div>
        {renderSymbolListValues(field, true, parentField)}
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newSymbolAuthority',
                defaultMessage: 'New authority for {field}',
              }, { field: labelForPath(path) })}
              disabled={isSaving}
              error={symbolEntryErrors[path] || fieldErrors[path]}
              id={`${controlIdPrefix}-${controlPath}-authority`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.symbolAuthority" defaultMessage="Authority" />}
              marginBottom0
              onChange={handleNewSymbolChange(path, 'authority')}
              onKeyDown={handleNewSymbolKeyDown(field, parentField)}
              value={newValue.authority}
            />
          </div>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newSymbolName',
                defaultMessage: 'New name for {field}',
              }, { field: labelForPath(path) })}
              disabled={isSaving}
              id={`${controlIdPrefix}-${controlPath}-name`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.symbolName" defaultMessage="Name" />}
              marginBottom0
              onChange={handleNewSymbolChange(path, 'symbol')}
              onKeyDown={handleNewSymbolKeyDown(field, parentField)}
              value={newValue.symbol}
            />
          </div>
          <div className={css.structuredAddButton}>
            <Button
              disabled={isSaving || !canAdd}
              id={`add-${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onClick={() => addSymbolListValue(field, parentField)}
            >
              <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderStringArrayValues = (field, isEditing, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const value = isEditing ? draftFieldValue(field, parentField) : committedFieldValue(field, parentField);
    const arrayValues = Array.isArray(value) ? value : [];

    return (
      <div className={css.structuredValues}>
        {arrayValues.map((arrayValue, index) => (
          <div className={css.structuredValue} key={`${arrayValue}-${index}`}>
            <span className={css.structuredValueText}>{arrayValue}</span>
            {isEditing &&
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeStringValue',
                  defaultMessage: 'Remove {value} from {field}',
                }, {
                  field: labelForPath(path),
                  value: arrayValue,
                })}
                disabled={savingFields[topFieldName(field, parentField)]}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeStringArrayValue(field, parentField, index)}
                size="small"
              />
            }
          </div>
        ))}
      </div>
    );
  };

  const renderStringArrayInput = (field, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const newValue = newStringValues[path] || '';
    const isSaving = savingFields[topFieldName(field, parentField)];

    return (
      <div>
        {renderStringArrayValues(field, true, parentField)}
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringValue',
                defaultMessage: 'New value for {field}',
              }, {
                field: labelForPath(path),
              })}
              disabled={isSaving}
              error={fieldErrors[path]}
              id={`${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onChange={handleNewStringChange(path)}
              onKeyDown={handleNewStringKeyDown(field, parentField)}
              value={newValue}
            />
          </div>
          <Button
            disabled={isSaving || !newValue.trim()}
            id={`add-${controlIdPrefix}-${controlPath}`}
            marginBottom0
            onClick={() => addStringArrayValue(field, parentField)}
          >
            <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStringMapValues = (field, isEditing, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const value = isEditing ? draftFieldValue(field, parentField) : committedFieldValue(field, parentField);
    const mapValue = isObject(value) ? value : {};

    return (
      <div className={css.structuredValues}>
        {Object.entries(mapValue).map(([key, mapEntryValue], index) => (
          <div className={css.structuredValue} key={key}>
            <span className={css.structuredValueText}>
              <span className={css.stringMapKey}>{key}</span>
              <span className={css.stringMapSeparator}>:</span>
              <span>{mapEntryValue}</span>
            </span>
            {isEditing &&
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeStringMapEntry',
                  defaultMessage: 'Remove {key}: {value} from {field}',
                }, {
                  field: labelForPath(path),
                  key,
                  value: mapEntryValue,
                })}
                disabled={savingFields[topFieldName(field, parentField)]}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeStringMapEntry(field, parentField, key)}
                size="small"
              />
            }
          </div>
        ))}
      </div>
    );
  };

  const renderStringMapInput = (field, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const newEntry = newStringMapEntries[path] || { key: '', value: '' };
    const isSaving = savingFields[topFieldName(field, parentField)];
    const canAdd = !!newEntry.key.trim() && !!newEntry.value.trim();

    return (
      <div>
        {renderStringMapValues(field, true, parentField)}
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringMapKey',
                defaultMessage: 'New key for {field}',
              }, {
                field: labelForPath(path),
              })}
              disabled={isSaving}
              error={stringMapEntryErrors[path] || fieldErrors[path]}
              id={`${controlIdPrefix}-${controlPath}-key`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.stringMapKey" defaultMessage="Key" />}
              marginBottom0
              onChange={handleNewStringMapEntryChange(path, 'key')}
              onKeyDown={handleNewStringMapEntryKeyDown(field, parentField)}
              value={newEntry.key}
            />
          </div>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringMapValue',
                defaultMessage: 'New value for {field}',
              }, {
                field: labelForPath(path),
              })}
              disabled={isSaving}
              id={`${controlIdPrefix}-${controlPath}-value`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.stringMapValue" defaultMessage="Value" />}
              marginBottom0
              onChange={handleNewStringMapEntryChange(path, 'value')}
              onKeyDown={handleNewStringMapEntryKeyDown(field, parentField)}
              value={newEntry.value}
            />
          </div>
          <div className={css.stringMapAddButton}>
            <Button
              disabled={isSaving || !canAdd}
              id={`add-${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onClick={() => addStringMapEntry(field, parentField)}
            >
              <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderObjectChildValue = (child, value) => {
    const type = normalizedValueType(child.valueType);

    if (type === STRING_ARRAY) {
      return (
        <div className={css.structuredValues}>
          {(Array.isArray(value) ? value : []).map((entry, index) => (
            <span className={css.structuredValue} key={`${entry}-${index}`}>{entry}</span>
          ))}
        </div>
      );
    }

    if (type === SYMBOL_LIST) {
      return (
        <div className={css.structuredValues}>
          {normalizedSymbols(value).map((symbolValue, index) => (
            <span className={css.structuredValue} key={`${symbolKey(symbolValue)}-${index}`}>
              {symbolLabel(symbolValue)}
            </span>
          ))}
        </div>
      );
    }

    if (type === STRING_MAP) {
      return (
        <div className={css.structuredValues}>
          {Object.entries(isObject(value) ? value : {}).map(([key, entryValue]) => (
            <span className={css.structuredValue} key={key}>
              <span className={css.stringMapKey}>{key}</span>
              <span className={css.stringMapSeparator}>:</span>
              <span>{entryValue}</span>
            </span>
          ))}
        </div>
      );
    }

    return value;
  };

  const removeObjectArrayValue = (field, parentField, index) => {
    const path = pathForField(field, parentField);
    setDraftFieldValue(field, parentField, current => (
      current.filter((value, valueIndex) => valueIndex !== index)
    ));
    setFieldErrors(current => omitRootPath(current, path));
  };

  const addObjectArrayValue = (field, parentField) => {
    const path = pathForField(field, parentField);
    const objectPath = `${path}.new`;
    const objectValue = newObjectValue(field, parentField);
    const errors = {};

    if (field.objectMap.every(child => isEmptyFieldValue(objectValue[child.fieldName], child))) {
      errors[objectPath] = objectValueRequiredMessage();
    }

    field.objectMap.forEach(child => {
      Object.assign(errors, validationErrorsForValue(
        child,
        objectValue[child.fieldName],
        `${objectPath}.${child.fieldName}`,
      ));
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(current => ({
        ...omitRootPath(current, objectPath),
        ...errors,
      }));
      return;
    }

    setDraftFieldValue(field, parentField, current => [
      ...(Array.isArray(current) ? current : []),
      objectValue,
    ]);
    setNewObjectValues(current => omitRootPath(current, path));
    setNewStringValues(current => omitRootPath(current, objectPath));
    setNewSymbolValues(current => omitRootPath(current, objectPath));
    setSymbolEntryErrors(current => omitRootPath(current, objectPath));
    setNewStringMapEntries(current => omitRootPath(current, objectPath));
    setStringMapEntryErrors(current => omitRootPath(current, objectPath));
    setFieldErrors(current => ({
      ...omitRootPath(current, objectPath),
      [path]: undefined,
    }));
  };

  const handleNewObjectScalarChange = (field, parentField, child) => event => {
    setNewObjectChildValue(field, parentField, child, event.target.value);
    setFieldErrors(current => ({
      ...current,
      [newObjectChildPath(field, parentField, child)]: undefined,
      [`${pathForField(field, parentField)}.new`]: undefined,
    }));
  };

  const handleNewObjectScalarKeyDown = (field, parentField) => event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addObjectArrayValue(field, parentField);
    }
  };

  const renderNewObjectStringArrayInput = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const controlPath = childPath.split('.').join('-');
    const objectValue = newObjectValue(field, parentField);
    const valuesForChild = Array.isArray(objectValue[child.fieldName]) ? objectValue[child.fieldName] : [];
    const newValue = newStringValues[childPath] || '';
    const isSaving = savingFields[topFieldName(field, parentField)];

    return (
      <div>
        <div className={css.structuredValues}>
          {valuesForChild.map((entry, index) => (
            <div className={css.structuredValue} key={`${entry}-${index}`}>
              <span className={css.structuredValueText}>{entry}</span>
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeStringValue',
                  defaultMessage: 'Remove {value} from {field}',
                }, { field: labelForPath(childPath), value: entry })}
                disabled={isSaving}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeObjectStringArrayValue(field, parentField, child, index)}
                size="small"
              />
            </div>
          ))}
        </div>
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringValue',
                defaultMessage: 'New value for {field}',
              }, { field: labelForPath(childPath) })}
              disabled={isSaving}
              error={fieldErrors[childPath]}
              id={`${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onChange={handleNewStringChange(childPath)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addObjectStringArrayValue(field, parentField, child);
                }
              }}
              value={newValue}
            />
          </div>
          <Button
            disabled={isSaving || !newValue.trim()}
            id={`add-${controlIdPrefix}-${controlPath}`}
            marginBottom0
            onClick={() => addObjectStringArrayValue(field, parentField, child)}
          >
            <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
          </Button>
        </div>
      </div>
    );
  };

  const renderNewObjectSymbolListInput = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const controlPath = childPath.split('.').join('-');
    const objectValue = newObjectValue(field, parentField);
    const symbolValues = Array.isArray(objectValue[child.fieldName]) ? objectValue[child.fieldName] : [];
    const newValue = newSymbolValues[childPath] || { authority: '', symbol: '' };
    const isSaving = savingFields[topFieldName(field, parentField)];
    const canAdd = !!newValue.authority.trim() && !!newValue.symbol.trim();

    return (
      <div>
        <div className={css.structuredValues}>
          {symbolValues.map((symbolValue, index) => (
            <div className={css.structuredValue} key={`${symbolKey(symbolValue)}-${index}`}>
              <span className={css.structuredValueText}>{symbolLabel(symbolValue)}</span>
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeSymbol',
                  defaultMessage: 'Remove {symbol} from {field}',
                }, { field: labelForPath(childPath), symbol: symbolLabel(symbolValue) })}
                disabled={isSaving}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeObjectSymbolListValue(field, parentField, child, index)}
                size="small"
              />
            </div>
          ))}
        </div>
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newSymbolAuthority',
                defaultMessage: 'New authority for {field}',
              }, { field: labelForPath(childPath) })}
              disabled={isSaving}
              error={symbolEntryErrors[childPath] || fieldErrors[childPath]}
              id={`${controlIdPrefix}-${controlPath}-authority`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.symbolAuthority" defaultMessage="Authority" />}
              marginBottom0
              onChange={handleNewSymbolChange(childPath, 'authority')}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addObjectSymbolListValue(field, parentField, child);
                }
              }}
              value={newValue.authority}
            />
          </div>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newSymbolName',
                defaultMessage: 'New name for {field}',
              }, { field: labelForPath(childPath) })}
              disabled={isSaving}
              id={`${controlIdPrefix}-${controlPath}-name`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.symbolName" defaultMessage="Name" />}
              marginBottom0
              onChange={handleNewSymbolChange(childPath, 'symbol')}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addObjectSymbolListValue(field, parentField, child);
                }
              }}
              value={newValue.symbol}
            />
          </div>
          <div className={css.structuredAddButton}>
            <Button
              disabled={isSaving || !canAdd}
              id={`add-${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onClick={() => addObjectSymbolListValue(field, parentField, child)}
            >
              <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewObjectStringMapInput = (field, parentField, child) => {
    const childPath = newObjectChildPath(field, parentField, child);
    const controlPath = childPath.split('.').join('-');
    const objectValue = newObjectValue(field, parentField);
    const mapValue = isObject(objectValue[child.fieldName]) ? objectValue[child.fieldName] : {};
    const newEntry = newStringMapEntries[childPath] || { key: '', value: '' };
    const isSaving = savingFields[topFieldName(field, parentField)];
    const canAdd = !!newEntry.key.trim() && !!newEntry.value.trim();

    return (
      <div>
        <div className={css.structuredValues}>
          {Object.entries(mapValue).map(([key, entryValue], index) => (
            <div className={css.structuredValue} key={key}>
              <span className={css.structuredValueText}>
                <span className={css.stringMapKey}>{key}</span>
                <span className={css.stringMapSeparator}>:</span>
                <span>{entryValue}</span>
              </span>
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeStringMapEntry',
                  defaultMessage: 'Remove {key}: {value} from {field}',
                }, { field: labelForPath(childPath), key, value: entryValue })}
                disabled={isSaving}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeObjectStringMapEntry(field, parentField, child, key)}
                size="small"
              />
            </div>
          ))}
        </div>
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringMapKey',
                defaultMessage: 'New key for {field}',
              }, { field: labelForPath(childPath) })}
              disabled={isSaving}
              error={stringMapEntryErrors[childPath] || fieldErrors[childPath]}
              id={`${controlIdPrefix}-${controlPath}-key`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.stringMapKey" defaultMessage="Key" />}
              marginBottom0
              onChange={handleNewStringMapEntryChange(childPath, 'key')}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addObjectStringMapEntry(field, parentField, child);
                }
              }}
              value={newEntry.key}
            />
          </div>
          <div className={css.structuredInput}>
            <TextField
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.newStringMapValue',
                defaultMessage: 'New value for {field}',
              }, { field: labelForPath(childPath) })}
              disabled={isSaving}
              id={`${controlIdPrefix}-${controlPath}-value`}
              label={<FormattedMessage id="ui-rsdir.settingsConfig.stringMapValue" defaultMessage="Value" />}
              marginBottom0
              onChange={handleNewStringMapEntryChange(childPath, 'value')}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addObjectStringMapEntry(field, parentField, child);
                }
              }}
              value={newEntry.value}
            />
          </div>
          <div className={css.stringMapAddButton}>
            <Button
              disabled={isSaving || !canAdd}
              id={`add-${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onClick={() => addObjectStringMapEntry(field, parentField, child)}
            >
              <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewObjectChildInput = (field, parentField, child) => {
    const { validChoices = [] } = child;
    const type = normalizedValueType(child.valueType);
    const childPath = newObjectChildPath(field, parentField, child);
    const controlPath = childPath.split('.').join('-');
    const isSaving = savingFields[topFieldName(field, parentField)];
    const objectValue = newObjectValue(field, parentField);
    const commonProps = {
      'aria-label': labelForPath(childPath),
      disabled: isSaving,
      error: fieldErrors[childPath],
      id: `${controlIdPrefix}-${controlPath}`,
      onChange: handleNewObjectScalarChange(field, parentField, child),
      required: child.required,
      value: objectValue[child.fieldName] ?? '',
    };

    if (type === STRING_ARRAY) {
      return renderNewObjectStringArrayInput(field, parentField, child);
    }

    if (type === SYMBOL_LIST) {
      return renderNewObjectSymbolListInput(field, parentField, child);
    }

    if (type === STRING_MAP) {
      return renderNewObjectStringMapInput(field, parentField, child);
    }

    if (validChoices.length > 0) {
      return <Select {...commonProps} dataOptions={buildChoiceOptions(validChoices)} />;
    }

    if (type === 'boolean') {
      return <Select {...commonProps} dataOptions={booleanOptions} />;
    }

    return (
      <TextField
        {...commonProps}
        onKeyDown={handleNewObjectScalarKeyDown(field, parentField)}
        step={type === 'integer' ? 1 : undefined}
        type={type === 'integer' || type === 'number' ? 'number' : 'text'}
      />
    );
  };

  const renderObjectArrayValues = (field, isEditing, parentField) => {
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const value = isEditing ? draftFieldValue(field, parentField) : committedFieldValue(field, parentField);
    const arrayValues = Array.isArray(value) ? value : [];
    const isSaving = savingFields[topFieldName(field, parentField)];

    return (
      <div className={css.objectArrayValues}>
        {arrayValues.map((objectValue, index) => (
          <div className={css.objectArrayValue} key={`${controlPath}-${index}`}>
            <div className={css.objectArrayComponents}>
              {field.objectMap.map(child => {
                const childPath = `${path}.${index}.${child.fieldName}`;

                return (
                  <div
                    className={`${css.objectArrayComponent} ${child.disabled ? css.disabledField : ''}`}
                    key={child.fieldName}
                  >
                    <span className={css.objectArrayComponentLabel}>
                      {renderFieldLabel(child, `${path}.${child.fieldName}`, `value-${index}`)}:
                    </span>
                    {!child.disabled &&
                      <>
                        <div className={css.objectArrayComponentValue}>
                          {renderObjectChildValue(child, objectValue[child.fieldName])}
                        </div>
                        {fieldErrors[childPath] &&
                          <div className={css.subFieldError} role="alert">{fieldErrors[childPath]}</div>
                        }
                      </>
                    }
                  </div>
                );
              })}
              {fieldErrors[`${path}.${index}`] &&
                <div className={css.subFieldError} role="alert">{fieldErrors[`${path}.${index}`]}</div>
              }
            </div>
            {isEditing &&
              <IconButton
                aria-label={intl.formatMessage({
                  id: 'ui-rsdir.settingsConfig.removeObjectArrayValue',
                  defaultMessage: 'Remove item {index} from {field}',
                }, { field: labelForPath(path), index: index + 1 })}
                disabled={isSaving}
                icon="times"
                iconSize="small"
                id={`remove-${controlIdPrefix}-${controlPath}-${index}`}
                onClick={() => removeObjectArrayValue(field, parentField, index)}
                size="small"
              />
            }
          </div>
        ))}
      </div>
    );
  };

  const renderObjectArrayInput = (field, parentField) => {
    const path = pathForField(field, parentField);
    const objectPath = `${path}.new`;
    const controlPath = controlPathForField(field, parentField);
    const isSaving = savingFields[topFieldName(field, parentField)];

    return (
      <div>
        {fieldErrors[path] &&
          <div className={css.subFieldError} role="alert">{fieldErrors[path]}</div>
        }
        {renderObjectArrayValues(field, true, parentField)}
        <div className={css.objectArrayAdd}>
          {field.objectMap.map(child => (
            <div
              className={`${css.objectArrayAddField} ${child.disabled ? css.disabledField : ''}`}
              key={child.fieldName}
            >
              <div className={css.subFieldLabel}>
                {renderFieldLabel(child, `${path}.${child.fieldName}`, 'new')}
              </div>
              {!child.disabled && renderNewObjectChildInput(field, parentField, child)}
            </div>
          ))}
          {fieldErrors[objectPath] &&
            <div className={css.subFieldError} role="alert">{fieldErrors[objectPath]}</div>
          }
          <Button
            disabled={isSaving}
            id={`add-${controlIdPrefix}-${controlPath}`}
            marginBottom0
            onClick={() => addObjectArrayValue(field, parentField)}
          >
            <FormattedMessage id="ui-rsdir.add" defaultMessage="Add" />
          </Button>
        </div>
      </div>
    );
  };

  const renderFieldInput = (field, parentField) => {
    const { validChoices = [] } = field;
    const type = normalizedValueType(field.valueType);
    const path = pathForField(field, parentField);
    const controlPath = controlPathForField(field, parentField);
    const isSaving = savingFields[topFieldName(field, parentField)];

    if (type === STRING_ARRAY) {
      return renderStringArrayInput(field, parentField);
    }

    if (type === SYMBOL_LIST) {
      return renderSymbolListInput(field, parentField);
    }

    if (type === STRING_MAP) {
      return renderStringMapInput(field, parentField);
    }

    if (type === OBJECT_ARRAY) {
      return renderObjectArrayInput(field, parentField);
    }

    const commonProps = {
      'aria-label': labelForPath(path),
      disabled: isSaving,
      error: fieldErrors[path],
      id: `${controlIdPrefix}-${controlPath}`,
      onChange: handleChange(field, parentField),
      required: field.required,
      value: draftFieldValue(field, parentField) ?? '',
    };

    if (validChoices.length > 0) {
      return <Select {...commonProps} dataOptions={buildChoiceOptions(validChoices)} />;
    }

    if (type === 'boolean') {
      return <Select {...commonProps} dataOptions={booleanOptions} />;
    }

    return (
      <TextField
        {...commonProps}
        step={type === 'integer' ? 1 : undefined}
        type={type === 'integer' || type === 'number' ? 'number' : 'text'}
      />
    );
  };

  const renderFieldDisplay = (field, parentField) => {
    const type = normalizedValueType(field.valueType);

    if (type === STRING_ARRAY) {
      return renderStringArrayValues(field, false, parentField);
    }

    if (type === SYMBOL_LIST) {
      return renderSymbolListValues(field, false, parentField);
    }

    if (type === STRING_MAP) {
      return renderStringMapValues(field, false, parentField);
    }

    if (type === OBJECT_ARRAY) {
      return renderObjectArrayValues(field, false, parentField);
    }

    return committedFieldValue(field, parentField);
  };

  const renderSubField = (field, isEditing, parentContext) => {
    const context = contextForField(field, parentContext);
    const path = context.path.join('.');
    const value = isEditing ? draftFieldValue(field, parentContext) : committedFieldValue(field, parentContext);
    const selectedFields = field.onlyOne ? selectedSubFields(value, field) : field.subMap;
    const selectedFieldName = selectedFields.length === 1 ? selectedFields[0].fieldName : '';
    const fieldsToRender = field.onlyOne ? selectedFields : field.subMap;

    return (
      <div className={css.subFields}>
        {fieldErrors[path] &&
          <div className={css.subFieldError} role="alert">
            {fieldErrors[path]}
          </div>
        }
        {field.onlyOne && isEditing &&
          <Select
            aria-label={intl.formatMessage({
              id: 'ui-rsdir.settingsConfig.onlyOneSelection',
              defaultMessage: 'Selected value for {field}',
            }, { field: labelForPath(path) })}
            dataOptions={[
              { label: '', value: '' },
              ...field.subMap.map(child => ({
                disabled: child.disabled,
                label: labelForPath(`${path}.${child.fieldName}`),
                value: child.fieldName,
              })),
            ]}
            disabled={savingFields[topFieldName(field, parentContext)]}
            id={`${controlIdPrefix}-${path.split('.').join('-')}-selection`}
            onChange={selectOnlyOneChild(field, parentContext)}
            value={selectedFieldName}
          />
        }
        {fieldsToRender.map(child => {
          const childPath = pathForField(child, context);
          const isChildSubField = normalizedValueType(child.valueType) === SUB_FIELD;

          return (
            <div
              className={`${css.subField} ${child.disabled ? css.disabledField : ''}`}
              key={child.fieldName}
            >
              <div className={css.subFieldLabel}>{renderFieldLabel(child, childPath)}</div>
              {!child.disabled && (isChildSubField ?
                renderSubField(child, isEditing, context) :
                isEditing ? renderFieldInput(child, context) : renderFieldDisplay(child, context)
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {fieldMapping.map(field => {
        const { fieldName } = field;
        const isEditing = editingFields[fieldName];
        const isSaving = savingFields[fieldName];
        const isSubField = normalizedValueType(field.valueType) === SUB_FIELD;

        return (
          <Card
            cardClass={field.disabled ? css.disabledField : undefined}
            roundedBorder
            key={fieldName}
            headerStart={renderFieldLabel(field, fieldName)}
            headerEnd={!field.disabled &&
              <Button
                buttonStyle={isEditing ? 'primary' : undefined}
                disabled={isSaving}
                id={`${isEditing ? 'save' : 'edit'}-${controlIdPrefix}-${fieldName}`}
                onClick={() => (isEditing ? saveField(field) : editField(field))}
              >
                {isEditing ?
                  <FormattedMessage id="stripes-components.saveAndClose.save" defaultMessage="Save" /> :
                  <FormattedMessage id="ui-rsdir.edit" defaultMessage="Edit" />
                }
              </Button>
            }
          >
            {!field.disabled && (isEditing ?
              <div className={css.fieldEditor}>
                <div className={css.fieldInput}>
                  {isSubField ? renderSubField(field, true) : renderFieldInput(field)}
                </div>
                <IconButton
                  aria-label={intl.formatMessage({ id: 'ui-rsdir.cancel', defaultMessage: 'Cancel' })}
                  disabled={isSaving}
                  icon="times"
                  iconSize="small"
                  id={`cancel-${controlIdPrefix}-${fieldName}`}
                  onClick={() => cancelEditingField(field)}
                  size="small"
                />
              </div> :
              isSubField ? renderSubField(field, false) : renderFieldDisplay(field)
            )}
          </Card>
        );
      })}
      {!resource?.[configKey] &&
        <div>
          {emptyMessage}
        </div>
      }
    </div>
  );
};

export default SettingsConfigEditor;
