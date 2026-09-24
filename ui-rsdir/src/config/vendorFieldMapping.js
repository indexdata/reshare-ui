export const vendorFieldMapping = {
  Alma: {
    lmsConfig: [],
    catalogConfig: [
      'holdingsFormat.opac.availabilityRule',
      'holdingsFormat.opac.requireLocalLocation',
      'holdingsFormat.opac.includeItemId',
      'holdingsFormat.opac.includeItemLoanPolicy',
      'holdingsFormat.opac.allCirculations',
    ],
  },
  FOLIO: {
    lmsConfig: [],
    catalogConfig: [
      'holdingsFormat.opac.availabilityRule',
      'holdingsFormat.opac.requireLocalLocation',
      'holdingsFormat.opac.includeItemId',
      'holdingsFormat.opac.includeItemLoanPolicy',
      'holdingsFormat.opac.allCirculations',
      'holdingsFormat.opac.includeTemporaryLocation',
    ],
  },
  Generic: {
    lmsConfig: [
      'ncipNamespaceEnabled',
      'bibIdNormalization',
      'requestItemRequestType',
      'requestItemRequestScopeType',
      'requestItemBibIdCode',
      'requestItemPickupLocationEnabled',
      'lookupUserEnabled',
      'acceptItemEnabled',
      'checkInItemEnabled',
      'checkOutItemEnabled',
      'requestItemEnabled',
    ],
    catalogConfig: [],
  },
  Koha: {
    lmsConfig: [
      'ncipNamespaceEnabled',
    ],
    catalogConfig: [
      'holdingsFormat.marc.mainField',
      'holdingsFormat.marc.locationSubField',
      'holdingsFormat.marc.callNumberSubField',
      'holdingsFormat.marc.availability',
    ],
  },
  Sierra: {
    lmsConfig: [
      'requestItemRequestType',
      'requestItemRequestScopeType',
      'bibIdNormalization',
    ],
    catalogConfig: [
      'holdingsFormat.opac.availabilityRule',
      'holdingsFormat.opac.availablePublicNotes',
      'holdingsFormat.opac.shelvingLocationSource',
      'holdingsFormat.opac.includeItemId',
      'holdingsFormat.opac.includeItemLoanPolicy',
    ],
  },
};

export const applyDisabledPaths = (fieldMapping, disabledPaths) => {
  const disabledPathSet = new Set(disabledPaths);

  const applyToFields = (fields, parentPath = '') => fields.map(field => {
    const path = parentPath ? `${parentPath}.${field.fieldName}` : field.fieldName;
    const nextField = {
      ...field,
      disabled: field.disabled || disabledPathSet.has(path),
    };

    if (Array.isArray(field.subMap)) {
      nextField.subMap = applyToFields(field.subMap, path);
    }

    if (Array.isArray(field.objectMap)) {
      nextField.objectMap = applyToFields(field.objectMap, path);
    }

    return nextField;
  });

  return applyToFields(fieldMapping);
};

export const vendorFieldMappingForVendor = (fieldMapping, vendor, configKey) => (
  applyDisabledPaths(fieldMapping, vendorFieldMapping[vendor]?.[configKey] || [])
);
