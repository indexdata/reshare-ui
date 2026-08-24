const ADDRESS_FIELD_MAPPINGS = [
  { field: 'department', lineType: 'department', pluginType: 'Department', componentType: 'Other', seq: 0 },
  { field: 'premise', lineType: 'premise', pluginType: 'Premise', componentType: 'Other', seq: 1 },
  { field: 'thoroughfare', lineType: 'thoroughfare', pluginType: 'Thoroughfare', componentType: 'Thoroughfare', seq: 2 },
  { field: 'postalCodeOrTown', lineType: 'postalcodeortown', pluginType: 'PostalCodeOrTown', componentType: 'Other', seq: 3 },
  { field: 'locality', lineType: 'locality', pluginType: 'Locality', componentType: 'Locality', seq: 4 },
  { field: 'administrativeArea', lineType: 'administrativearea', pluginType: 'AdministrativeArea', componentType: 'AdministrativeArea', seq: 5 },
  { field: 'postalCode', lineType: 'postalcode', pluginType: 'PostalCode', componentType: 'PostalCode', seq: 6 },
  { field: 'postBox', lineType: 'postbox', pluginType: 'PostBox', componentType: 'Other', seq: 7 },
  { field: 'postOffice', lineType: 'postoffice', pluginType: 'PostOffice', componentType: 'Other', seq: 8 },
  { field: 'country', lineType: 'country', pluginType: 'Country', componentType: 'CountryCode', seq: 9 },
];

const pluginFieldNames = new Set(ADDRESS_FIELD_MAPPINGS.map(({ field }) => field));
const pluginOnlyFieldNames = new Set([
  ...pluginFieldNames,
  'addressLabel',
  'addressLineOne',
  'addressLineTwo',
  'countryCode',
  'lines',
]);

const mappingForComponent = component => {
  if (component.type === 'Other') {
    return ADDRESS_FIELD_MAPPINGS.find(mapping => (
      mapping.componentType === 'Other' && mapping.seq === component.seq
    ));
  }

  return ADDRESS_FIELD_MAPPINGS.find(mapping => mapping.componentType === component.type);
};

const hasValue = value => value !== undefined && value !== null && value !== '';

const apiCountryCode = address => (
  (address.addressComponents || []).find(component => component.type === 'CountryCode')?.value
);

const pluginCountryCode = (address, addressPlugin) => {
  const countryCode = apiCountryCode(address);
  const supportedCountries = addressPlugin?.listOfSupportedCountries || [];

  if (supportedCountries.includes(countryCode)) return countryCode;
  return supportedCountries[0] || countryCode;
};

export const apiAddressToPluginAddress = (address = {}, addressPlugin) => ({
  addressLabel: address.type,
  countryCode: pluginCountryCode(address, addressPlugin),
  id: address.id,
  lines: (address.addressComponents || []).map((component, index) => {
    const mapping = mappingForComponent(component);

    if (!mapping) return null;

    return {
      id: `${address.id || 'new-address'}-${component.seq ?? index}`,
      type: { value: mapping.lineType },
      value: component.value,
    };
  }).filter(Boolean),
});

export const apiAddressToFormAddress = (address = {}, addressPlugin) => ({
  ...address,
  ...addressPlugin.backendToFields(apiAddressToPluginAddress(address, addressPlugin)),
});

export const apiAddressesToFormAddresses = (addresses, addressPlugin) => (
  addresses?.map(address => apiAddressToFormAddress(address, addressPlugin))
);

export const pluginAddressToApiAddress = (address = {}, addressPlugin) => {
  const addressProperties = Object.keys(address).reduce((result, key) => {
    if (key !== 'addressComponents' && !pluginOnlyFieldNames.has(key)) {
      result[key] = address[key];
    }

    return result;
  }, {});

  const pluginAddress = addressPlugin.fieldsToBackend({
    ...apiAddressToPluginAddress(address, addressPlugin),
    ...address,
    addressLabel: address.type,
    countryCode: pluginCountryCode(address, addressPlugin),
  });

  const seenFields = new Set();
  const preservedComponents = (address.addressComponents || []).filter(component => {
    const mapping = mappingForComponent(component);

    if (
      !mapping ||
      !Number.isFinite(addressPlugin.fieldOrder[mapping.pluginType]) ||
      seenFields.has(mapping.field)
    ) return true;

    seenFields.add(mapping.field);
    return false;
  });

  const pluginComponents = (pluginAddress.lines || [])
    .filter(line => hasValue(line?.value))
    .map(line => {
      const mapping = ADDRESS_FIELD_MAPPINGS.find(candidate => (
        candidate.lineType === line.type?.value?.toLowerCase()
      ));

      if (!mapping) return null;

      return {
        seq: mapping.seq,
        type: mapping.componentType,
        value: line.value,
      };
    })
    .filter(Boolean);

  return {
    ...addressProperties,
    addressComponents: [...pluginComponents, ...preservedComponents]
      .sort((left, right) => left.seq - right.seq),
  };
};

export const pluginAddressesToApiAddresses = (addresses, addressPlugin) => (
  addresses?.map(address => pluginAddressToApiAddress(address, addressPlugin))
);

export const apiAddressToDisplayComponents = (address = {}, fieldOrder = {}) => (
  (address.addressComponents || [])
    .map((component, index) => {
      const mapping = mappingForComponent(component);
      const pluginOrder = mapping && fieldOrder[mapping.pluginType];

      return {
        component,
        index,
        pluginOrder: Number.isFinite(pluginOrder) ? pluginOrder : undefined,
      };
    })
    .filter(({ component }) => hasValue(component.value))
    .sort((left, right) => {
      const leftIsRecognized = left.pluginOrder !== undefined;
      const rightIsRecognized = right.pluginOrder !== undefined;

      if (leftIsRecognized !== rightIsRecognized) return leftIsRecognized ? -1 : 1;
      if (leftIsRecognized && left.pluginOrder !== right.pluginOrder) {
        return left.pluginOrder - right.pluginOrder;
      }

      const sequenceDifference = (left.component.seq ?? Number.MAX_SAFE_INTEGER)
        - (right.component.seq ?? Number.MAX_SAFE_INTEGER);

      return sequenceDifference || left.index - right.index;
    })
    .map(({ component }) => component)
);

export { ADDRESS_FIELD_MAPPINGS };
