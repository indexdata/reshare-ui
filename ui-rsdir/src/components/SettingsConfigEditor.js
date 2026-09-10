import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfiniteQuery, useQueryClient } from 'react-query';
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
const SYMBOL_PAGE_SIZE = 1000;
const INTEGER_PATTERN = /^-?\d+$/;

const normalizedValueType = valueType => valueType?.toLowerCase?.() || 'string';

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

const containsValueType = (fields, targetType) => fields.some(field => {
  const type = normalizedValueType(field.valueType);

  return type === targetType ||
    (type === SUB_FIELD && Array.isArray(field.subMap) && containsValueType(field.subMap, targetType)) ||
    (type === OBJECT_ARRAY && Array.isArray(field.objectMap) && containsValueType(field.objectMap, targetType));
});

const normalizeList = data => (Array.isArray(data) ? data : (data?.items || []));

const loadedEntryCount = pages => pages.reduce((count, page) => count + normalizeList(page).length, 0);

const nextInstitutionPageOffset = (lastPage, pages) => {
  const loadedCount = loadedEntryCount(pages);
  const lastPageSize = normalizeList(lastPage).length;
  const totalCount = pages[0]?.about?.count ?? lastPage?.about?.count;

  if (lastPageSize === 0) {
    return undefined;
  }

  if (Number.isFinite(totalCount)) {
    return loadedCount < totalCount ? loadedCount : undefined;
  }

  return lastPageSize === SYMBOL_PAGE_SIZE ? loadedCount : undefined;
};

const isValidSymbol = value => isObject(value) &&
  typeof value.authority === 'string' && !!value.authority &&
  typeof value.symbol === 'string' && !!value.symbol;

const symbolKey = value => JSON.stringify([value.authority, value.symbol]);

const symbolLabel = value => `${value.authority}:${value.symbol}`;

const normalizedSymbols = value => (Array.isArray(value) ? value : [])
  .filter(isValidSymbol)
  .map(({ authority, symbol }) => ({ authority, symbol }));

const symbolValuesFromEntries = data => [...new Map(normalizeList(data)
  .flatMap(entry => (Array.isArray(entry?.symbols) ? entry.symbols : []))
  .filter(isValidSymbol)
  .map(({ authority, symbol }) => ({ authority, symbol }))
  .map(symbolValue => [symbolKey(symbolValue), symbolValue])).values()]
  .sort((left, right) => symbolLabel(left).localeCompare(symbolLabel(right)));

const validateFieldDefinition = (field, path = field.fieldName) => {
  const type = normalizedValueType(field.valueType);

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

const toEditorValue = (value, field) => {
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

    return source.map(item => field.objectMap.reduce((acc, child) => ({
      ...acc,
      [child.fieldName]: toEditorValue(isObject(item) ? item[child.fieldName] : undefined, child),
    }), isObject(item) ? { ...item } : {}));
  }

  if (type === SUB_FIELD) {
    const source = isObject(value) ? value : {};

    return field.subMap.reduce((acc, child) => ({
      ...acc,
      [child.fieldName]: toEditorValue(source[child.fieldName], child),
    }), { ...source });
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const valueForPatch = (value, field) => {
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

    return source.map(item => field.objectMap.reduce((acc, child) => ({
      ...acc,
      [child.fieldName]: valueForPatch(isObject(item) ? item[child.fieldName] : undefined, child),
    }), isObject(item) ? { ...item } : {}));
  }

  if (type === SUB_FIELD) {
    const source = isObject(value) ? value : {};

    return field.subMap.reduce((acc, child) => ({
      ...acc,
      [child.fieldName]: valueForPatch(source[child.fieldName], child),
    }), { ...source });
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
  const [newStringMapEntries, setNewStringMapEntries] = useState({});
  const [stringMapEntryErrors, setStringMapEntryErrors] = useState({});
  const [newObjectValues, setNewObjectValues] = useState({});
  const editingFieldsRef = useRef({});
  const activeResourcePathRef = useRef(resourcePath);
  const previousResourcePathRef = useRef(resourcePath);
  const hasSymbolList = useMemo(
    () => containsValueType(fieldMapping, SYMBOL_LIST),
    [fieldMapping],
  );
  const institutionEntriesQuery = useInfiniteQuery({
    queryKey: ['directory/entries', 'type=Institution', 'symbolList'],
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      params.append('cql', 'type=Institution');
      params.append('limit', SYMBOL_PAGE_SIZE);
      params.append('offset', pageParam);

      return ky(`directory/entries?${params.toString()}`).json();
    },
    enabled: hasSymbolList,
    getNextPageParam: nextInstitutionPageOffset,
    staleTime: 2 * 60 * 1000,
  });
  const {
    data: institutionEntriesData,
    fetchNextPage: fetchNextInstitutionPage,
    hasNextPage: hasNextInstitutionPage,
    isError: institutionEntriesHaveError,
    isFetchingNextPage: isFetchingNextInstitutionPage,
    isLoading: institutionEntriesAreLoading,
  } = institutionEntriesQuery;
  const institutionEntries = useMemo(
    () => institutionEntriesData?.pages?.flatMap(normalizeList) || [],
    [institutionEntriesData],
  );
  const validSymbolValues = useMemo(
    () => symbolValuesFromEntries(institutionEntries),
    [institutionEntries],
  );

  useEffect(() => {
    if (hasSymbolList && hasNextInstitutionPage &&
      !isFetchingNextInstitutionPage && !institutionEntriesHaveError) {
      fetchNextInstitutionPage();
    }
  }, [
    fetchNextInstitutionPage,
    hasSymbolList,
    hasNextInstitutionPage,
    institutionEntriesData,
    institutionEntriesHaveError,
    isFetchingNextInstitutionPage,
  ]);
  const symbolsAreLoading = institutionEntriesAreLoading ||
    isFetchingNextInstitutionPage || hasNextInstitutionPage;

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

  const clearTransientState = rootPath => {
    setFieldErrors(current => omitRootPath(current, rootPath));
    setNewStringValues(current => omitRootPath(current, rootPath));
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

  const addSymbolListValue = (field, parentField) => event => {
    const path = pathForField(field, parentField);
    const nextValue = validSymbolValues.find(symbolValue => symbolKey(symbolValue) === event.target.value);

    if (!nextValue) {
      return;
    }

    setDraftFieldValue(field, parentField, current => {
      const currentValues = Array.isArray(current) ? current : [];
      return currentValues.some(symbolValue => symbolKey(symbolValue) === symbolKey(nextValue)) ?
        currentValues :
        [...currentValues, { ...nextValue }];
    });
    setFieldErrors(current => ({ ...current, [path]: undefined }));
  };

  const removeSymbolListValue = (field, parentField, index) => {
    const path = pathForField(field, parentField);
    setDraftFieldValue(field, parentField, current => (
      (Array.isArray(current) ? current : []).filter((_value, valueIndex) => valueIndex !== index)
    ));
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

  const addObjectSymbolListValue = (field, parentField, child) => event => {
    const childPath = newObjectChildPath(field, parentField, child);
    const nextValue = validSymbolValues.find(symbolValue => symbolKey(symbolValue) === event.target.value);

    if (!nextValue) {
      return;
    }

    setNewObjectChildValue(field, parentField, child, current => {
      const currentValues = Array.isArray(current) ? current : [];
      return currentValues.some(symbolValue => symbolKey(symbolValue) === symbolKey(nextValue)) ?
        currentValues :
        [...currentValues, { ...nextValue }];
    });
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

  const validationErrorsForValue = (field, value, path) => {
    const errors = {};
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
      field.subMap.forEach(child => {
        Object.assign(errors, validationErrorsForValue(
          child,
          isObject(value) ? value[child.fieldName] : undefined,
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
          [fieldName]: error.message,
        }));
      })
      .finally(() => {
        if (activeResourcePathRef.current === savedResourcePath) {
          setSavingFields(current => ({ ...current, [fieldName]: false }));
        }
      });
  };

  const symbolOptionsForValue = value => {
    const selectedValues = new Set(normalizedSymbols(value).map(symbolKey));

    return [
      {
        label: intl.formatMessage({
          id: 'ui-rsdir.settingsConfig.selectSymbol',
          defaultMessage: 'Select a symbol',
        }),
        value: '',
      },
      ...validSymbolValues
        .filter(symbolValue => !selectedValues.has(symbolKey(symbolValue)))
        .map(symbolValue => ({ label: symbolLabel(symbolValue), value: symbolKey(symbolValue) })),
    ];
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
    const value = draftFieldValue(field, parentField);
    const isSaving = savingFields[topFieldName(field, parentField)];

    return (
      <div>
        {renderSymbolListValues(field, true, parentField)}
        <div className={css.structuredAdd}>
          <div className={css.structuredInput}>
            <Select
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.selectSymbolForField',
                defaultMessage: 'Select a symbol for {field}',
              }, { field: labelForPath(path) })}
              dataOptions={symbolOptionsForValue(value)}
              disabled={isSaving || symbolsAreLoading || institutionEntriesHaveError}
              error={fieldErrors[path]}
              id={`${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onChange={addSymbolListValue(field, parentField)}
              value=""
            />
          </div>
        </div>
        {institutionEntriesHaveError &&
          <div className={css.subFieldError} role="alert">
            <FormattedMessage
              id="ui-rsdir.settingsConfig.symbolsLoadError"
              defaultMessage="Unable to load available symbols."
            />
          </div>
        }
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
    const isSaving = savingFields[topFieldName(field, parentField)];

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
            <Select
              aria-label={intl.formatMessage({
                id: 'ui-rsdir.settingsConfig.selectSymbolForField',
                defaultMessage: 'Select a symbol for {field}',
              }, { field: labelForPath(childPath) })}
              dataOptions={symbolOptionsForValue(symbolValues)}
              disabled={isSaving || symbolsAreLoading || institutionEntriesHaveError}
              error={fieldErrors[childPath]}
              id={`${controlIdPrefix}-${controlPath}`}
              marginBottom0
              onChange={addObjectSymbolListValue(field, parentField, child)}
              value=""
            />
          </div>
        </div>
        {institutionEntriesHaveError &&
          <div className={css.subFieldError} role="alert">
            <FormattedMessage
              id="ui-rsdir.settingsConfig.symbolsLoadError"
              defaultMessage="Unable to load available symbols."
            />
          </div>
        }
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
                  <div className={css.objectArrayComponent} key={child.fieldName}>
                    <span className={css.objectArrayComponentLabel}>
                      {renderFieldLabel(child, `${path}.${child.fieldName}`, `value-${index}`)}:
                    </span>
                    <div className={css.objectArrayComponentValue}>
                      {renderObjectChildValue(child, objectValue[child.fieldName])}
                    </div>
                    {fieldErrors[childPath] &&
                      <div className={css.subFieldError} role="alert">{fieldErrors[childPath]}</div>
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
            <div className={css.objectArrayAddField} key={child.fieldName}>
              <div className={css.subFieldLabel}>
                {renderFieldLabel(child, `${path}.${child.fieldName}`, 'new')}
              </div>
              {renderNewObjectChildInput(field, parentField, child)}
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

    return (
      <div className={css.subFields}>
        {fieldErrors[path] &&
          <div className={css.subFieldError} role="alert">
            {fieldErrors[path]}
          </div>
        }
        {field.subMap.map(child => {
          const childPath = pathForField(child, context);
          const isChildSubField = normalizedValueType(child.valueType) === SUB_FIELD;

          return (
            <div className={css.subField} key={child.fieldName}>
              <div className={css.subFieldLabel}>{renderFieldLabel(child, childPath)}</div>
              {isChildSubField ?
                renderSubField(child, isEditing, context) :
                isEditing ? renderFieldInput(child, context) : renderFieldDisplay(child, context)
              }
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
            roundedBorder
            key={fieldName}
            headerStart={renderFieldLabel(field, fieldName)}
            headerEnd={
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
            {isEditing ?
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
            }
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
