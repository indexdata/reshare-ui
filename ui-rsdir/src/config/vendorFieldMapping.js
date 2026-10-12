const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const overrideEntries = (value, parentPath = '') => Object.entries(value).flatMap(([key, child]) => {
  const path = parentPath ? `${parentPath}.${key}` : key;
  return isObject(child) ? overrideEntries(child, path) : [[path, child]];
});

export const hostProfilesFromOpenApi = spec => {
  const profiles = spec?.['x-host-profiles'];
  if (!isObject(profiles) || Object.keys(profiles).length === 0) {
    throw new Error('Missing or invalid x-host-profiles metadata.');
  }

  const names = Object.keys(profiles).sort();
  const vendorFieldValues = {};
  const vendorFieldMapping = Object.fromEntries(names.map(name => {
    const profile = profiles[name];
    if (!isObject(profile)) throw new Error(`Invalid host profile "${name}".`);

    const values = {};
    const mapping = Object.fromEntries(['lmsConfig', 'catalogConfig'].map(configKey => {
      const config = Object.prototype.hasOwnProperty.call(profile, configKey) ? profile[configKey] : {};
      if (!isObject(config)) throw new Error(`Invalid ${configKey} for host profile "${name}".`);
      const entries = overrideEntries(config);
      values[configKey] = Object.fromEntries(entries);
      return [configKey, entries.map(([path]) => path)];
    }));
    Object.defineProperty(vendorFieldValues, name, { value: values, enumerable: true });
    return [name, mapping];
  }));

  return { names, vendorFieldMapping, vendorFieldValues };
};

export const hostProfileChoices = (names, savedSelection) => (
  savedSelection && !names.includes(savedSelection) ? [...names, savedSelection] : names
);

export const applyDisabledPaths = (fieldMapping, disabledPaths, overrideSource, overrideValues = {}) => {
  const disabledPathSet = new Set(disabledPaths);

  const applyToFields = (fields, parentPath = '') => fields.map(field => {
    const path = parentPath ? `${parentPath}.${field.fieldName}` : field.fieldName;
    const nextField = {
      ...field,
      disabled: field.disabled || disabledPathSet.has(path),
    };

    if (disabledPathSet.has(path)) {
      if (overrideSource) nextField.overrideSource = overrideSource;
      if (Object.prototype.hasOwnProperty.call(overrideValues, path)) {
        const value = overrideValues[path];
        if (field.valueType?.toLowerCase() === 'objectarray' && value !== null && (
          !Array.isArray(value) || value.some(item => !isObject(item))
        )) {
          throw new Error(`Invalid object-array override for "${path}".`);
        }
        nextField.overrideValue = value;
      }
    }

    if (Array.isArray(field.subMap)) {
      nextField.subMap = applyToFields(field.subMap, path);

      if (field.onlyOne) {
        const overriddenChildren = field.subMap.filter(child => {
          const childPath = `${path}.${child.fieldName}`;
          return disabledPaths.some(disabledPath => (
            disabledPath === childPath || disabledPath.startsWith(`${childPath}.`)
          ));
        });

        if (overriddenChildren.length > 1) {
          throw new Error(`Conflicting vendor overrides for onlyOne field "${path}".`);
        }

        if (overriddenChildren.length === 1) {
          nextField.lockedSelection = overriddenChildren[0].fieldName;
          if (overrideSource) {
            nextField.overrideSource = overrideSource;
          }
        }
      }
    }

    if (Array.isArray(field.objectMap)) {
      nextField.objectMap = applyToFields(field.objectMap, path);
    }

    return nextField;
  });

  return applyToFields(fieldMapping);
};

const mappingForProfile = (vendorFieldMapping, name) => (
  Object.prototype.hasOwnProperty.call(vendorFieldMapping, name) ? vendorFieldMapping[name] : undefined
);

export const vendorFieldMappingForVendor = (fieldMapping, vendor, configKey, vendorFieldMapping, setting = 'lmsConfig.vendor', overrideValues = {}) => (
  applyDisabledPaths(fieldMapping, mappingForProfile(vendorFieldMapping, vendor)?.[configKey] || [], { setting, name: vendor },
    mappingForProfile(overrideValues, vendor)?.[configKey])
);

export const selectionChangeImpact = ({ configKey, nextValue, resource, vendorFieldMapping }) => {
  if (!nextValue) {
    return undefined;
  }

  const isVendor = configKey === 'lmsConfig';
  const name = nextValue;
  const mapping = mappingForProfile(vendorFieldMapping, name);
  const setting = isVendor ? 'lmsConfig.vendor' : 'catalogConfig.profile';
  const configKeys = isVendor ?
    ['lmsConfig', ...(!resource?.catalogConfig?.profile ? ['catalogConfig'] : [])] :
    ['catalogConfig'];
  const groups = configKeys.map(key => ({
    configKey: key,
    paths: [...new Set(mapping?.[key] || [])],
  })).filter(group => group.paths.length > 0);

  const catalogProfile = isVendor && mapping?.catalogConfig?.length > 0 ?
    resource?.catalogConfig?.profile : undefined;

  return { source: { setting, name }, groups, ...(catalogProfile ? { catalogProfile } : {}) };
};
