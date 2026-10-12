import {
  applyDisabledPaths,
  hostProfilesFromOpenApi,
  hostProfileChoices,
  vendorFieldMappingForVendor as mapVendorFields,
  selectionChangeImpact as changeImpact,
} from './vendorFieldMapping';

import spec from '../../test/fixtures/directoryOpenApi';

const { vendorFieldMapping, vendorFieldValues } = hostProfilesFromOpenApi(spec);
const vendorFieldMappingForVendor = (fields, vendor, configKey, setting) => (
  mapVendorFields(fields, vendor, configKey, vendorFieldMapping, setting)
);
const selectionChangeImpact = options => changeImpact({ ...options, vendorFieldMapping });

describe('vendorFieldMapping', () => {
  it.each([
    ['lmsConfig', 'Alma', 'Koha', 'Koha'],
    ['lmsConfig', 'Koha', 'Alma', 'Alma'],
    ['lmsConfig', 'Alma', 'Alma', 'Alma'],
    ['lmsConfig', 'Alma', undefined, undefined],
    ['lmsConfig', 'Generic', 'Alma', undefined],
    ['catalogConfig', 'Koha', 'Alma', undefined],
  ])('reports the protecting profile for %s selection %s with profile %s', (configKey, nextValue, profile, expected) => {
    expect(selectionChangeImpact({
      configKey,
      nextValue,
      resource: { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile } },
    }).catalogProfile).toBe(expected);
  });

  it.each([
    ['lmsConfig', 'Alma', undefined, undefined, ['catalogConfig'], 'Alma'],
    ['lmsConfig', 'Koha', undefined, undefined, ['lmsConfig', 'catalogConfig'], 'Koha'],
    ['lmsConfig', 'Koha', 'Alma', 'Sierra', ['lmsConfig'], 'Koha'],
    ['lmsConfig', 'Alma', 'Koha', 'Sierra', [], 'Alma'],
    ['catalogConfig', 'Koha', 'Alma', 'Sierra', ['catalogConfig'], 'Koha'],
    ['catalogConfig', 'Generic', 'Alma', 'Koha', [], 'Generic'],
  ])('lists new impacts for %s selection %s with profile %s and vendor %s', (
    configKey, nextValue, profile, vendor, groupKeys, name,
  ) => {
    const resource = { lmsConfig: { vendor }, catalogConfig: { profile } };
    const impact = selectionChangeImpact({ configKey, nextValue, resource });
    expect(impact.groups.map(group => group.configKey)).toEqual(groupKeys);
    expect(impact.source).toEqual({
      name,
      setting: configKey === 'lmsConfig' || !nextValue ? 'lmsConfig.vendor' : 'catalogConfig.profile',
    });
    impact.groups.forEach(group => {
      expect(group.paths).toEqual(vendorFieldMapping[name][group.configKey]);
      expect(group.paths).not.toBe(vendorFieldMapping[name][group.configKey]);
    });
  });

  it.each(['lmsConfig', 'catalogConfig'])('skips confirmation when clearing %s', configKey => {
    expect(selectionChangeImpact({
      configKey,
      nextValue: '',
      resource: { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile: 'Koha' } },
    })).toBeUndefined();
    expect(selectionChangeImpact({ configKey, nextValue: '', resource: {} })).toBeUndefined();
  });

  it('attributes overridden leaves and locked selections without attributing other disabled fields', () => {
    const source = { setting: 'catalogConfig.profile', name: 'Alma' };
    const mapping = [{
      fieldName: 'format',
      valueType: 'subField',
      onlyOne: true,
      subMap: [{
        fieldName: 'opac',
        valueType: 'subField',
        subMap: [{ fieldName: 'fixed' }, { fieldName: 'editable' }],
      }, { fieldName: 'marc', disabled: true }],
    }];
    const result = applyDisabledPaths(mapping, ['format.opac.fixed'], source);
    expect(result[0].overrideSource).toEqual(source);
    expect(result[0].subMap[0]).not.toHaveProperty('overrideSource');
    expect(result[0].subMap[0].subMap[0].overrideSource).toEqual(source);
    expect(result[0].subMap[0].subMap[1]).not.toHaveProperty('overrideSource');
    expect(result[0].subMap[1]).not.toHaveProperty('overrideSource');
    expect(mapping[0]).not.toHaveProperty('overrideSource');
  });

  const exclusiveMapping = [{
    fieldName: 'format',
    valueType: 'subField',
    onlyOne: true,
    subMap: [{
      fieldName: 'first',
      valueType: 'subField',
      onlyOne: true,
      subMap: [{ fieldName: 'value' }, { fieldName: 'other' }],
    }, { fieldName: 'second' }],
  }];

  it.each(['format.first', 'format.first.value'])('locks the branch containing %s', path => {
    const result = applyDisabledPaths(exclusiveMapping, [path]);
    expect(result[0].lockedSelection).toBe('first');
    expect(exclusiveMapping[0]).not.toHaveProperty('lockedSelection');
  });

  it('locks nested selectors and matches complete path segments', () => {
    const result = applyDisabledPaths(exclusiveMapping, ['format.first.value']);
    expect(result[0].subMap[0].lockedSelection).toBe('value');
    expect(applyDisabledPaths(exclusiveMapping, ['format.firstly.value'])[0]).not.toHaveProperty('lockedSelection');
    expect(applyDisabledPaths(exclusiveMapping, [])[0]).not.toHaveProperty('lockedSelection');
  });

  it('rejects contradictory branch overrides', () => {
    expect(() => applyDisabledPaths(exclusiveMapping, ['format.first', 'format.second']))
      .toThrow('Conflicting vendor overrides for onlyOne field "format".');
  });

  it('stores the expected restrictions for each supported vendor', () => {
    expect(vendorFieldMapping).toEqual({
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
        lmsConfig: ['ncipNamespaceEnabled'],
        catalogConfig: [
          'holdingsFormat.marc.mainField',
          'holdingsFormat.marc.locationSubField',
          'holdingsFormat.marc.callNumberSubField',
          'holdingsFormat.marc.availability',
          'holdingsFormat.marc.shelvingLocationSubField',
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
    });
  });

  it('recursively applies restrictions without mutating the source mapping', () => {
    const fieldMapping = [{
      fieldName: 'topLevel',
    }, {
      fieldName: 'group',
      valueType: 'subField',
      subMap: [{
        fieldName: 'nested',
      }, {
        fieldName: 'items',
        valueType: 'objectArray',
        objectMap: [{ fieldName: 'objectValue' }],
      }],
    }, {
      fieldName: 'alwaysDisabled',
      disabled: true,
    }];

    const result = applyDisabledPaths(fieldMapping, [
      'topLevel',
      'group.items.objectValue',
    ]);

    expect(result[0].disabled).toBe(true);
    expect(result[1].disabled).toBe(false);
    expect(result[1].subMap[0].disabled).toBe(false);
    expect(result[1].subMap[1].objectMap[0].disabled).toBe(true);
    expect(result[2].disabled).toBe(true);
    expect(fieldMapping[0]).not.toHaveProperty('disabled');
    expect(fieldMapping[1].subMap[1].objectMap[0]).not.toHaveProperty('disabled');

    expect(vendorFieldMappingForVendor([
      { fieldName: 'ncipNamespaceEnabled' },
      { fieldName: 'address' },
    ], 'Generic', 'lmsConfig')).toEqual([
      { fieldName: 'ncipNamespaceEnabled', disabled: true, overrideSource: { setting: 'lmsConfig.vendor', name: 'Generic' } },
      { fieldName: 'address', disabled: false },
    ]);
    expect(vendorFieldMappingForVendor([
      { fieldName: 'address' },
    ], 'WMS', 'lmsConfig')).toEqual([
      { fieldName: 'address', disabled: false },
    ]);
  });
});

describe('hostProfilesFromOpenApi', () => {
  it('sorts published names and retains saved selections without inventing rules', () => {
    const { names } = hostProfilesFromOpenApi(spec);
    expect(names).toEqual(['Alma', 'FOLIO', 'Generic', 'Koha', 'Sierra']);
    expect(hostProfileChoices(names, 'WMS')).toEqual([...names, 'WMS']);
    expect(hostProfileChoices(names, 'Alma')).toBe(names);
    expect(hostProfileChoices(names, undefined)).toBe(names);
  });

  it('derives new profile paths from nested objects, treating arrays and falsy scalars as leaves', () => {
    const input = { 'x-host-profiles': { NewVendor: {
      lmsConfig: { enabled: false, empty: '', zero: 0, cleared: null, group: { ignored: {}, leaf: true } },
      catalogConfig: { items: [{ code: 'x' }], emptyItems: [] },
    },
    Empty: {} } };
    const original = JSON.stringify(input);
    expect(hostProfilesFromOpenApi(input)).toEqual({
      names: ['Empty', 'NewVendor'],
      vendorFieldValues: {
        Empty: { lmsConfig: {}, catalogConfig: {} },
        NewVendor: {
          lmsConfig: { enabled: false, empty: '', zero: 0, cleared: null, 'group.leaf': true },
          catalogConfig: { items: [{ code: 'x' }], emptyItems: [] },
        },
      },
      vendorFieldMapping: {
        Empty: { lmsConfig: [], catalogConfig: [] },
        NewVendor: {
          lmsConfig: ['enabled', 'empty', 'zero', 'cleared', 'group.leaf'],
          catalogConfig: ['items', 'emptyItems'],
        },
      },
    });
    expect(JSON.stringify(input)).toBe(original);
  });

  it.each([
    undefined, {}, { 'x-host-profiles': null }, { 'x-host-profiles': [] }, { 'x-host-profiles': {} },
    { 'x-host-profiles': { Bad: null } }, { 'x-host-profiles': { Bad: [] } },
    { 'x-host-profiles': { Bad: { lmsConfig: false } } },
    { 'x-host-profiles': { Bad: { catalogConfig: null } } },
  ])('rejects missing or malformed metadata: %j', input => {
    expect(() => hostProfilesFromOpenApi(input)).toThrow();
  });

  it('does not confuse inherited properties with a published profile', () => {
    expect(mapVendorFields([{ fieldName: 'enabled' }], 'constructor', 'lmsConfig', vendorFieldMapping))
      .toEqual([{ fieldName: 'enabled', disabled: false }]);
    expect(changeImpact({ configKey: 'lmsConfig', nextValue: 'constructor', vendorFieldMapping }).groups).toEqual([]);
  });
});

it('attaches raw values only to overridden leaves without changing the source mapping', () => {
  const fields = [{ fieldName: 'ncipNamespaceEnabled' }, { fieldName: 'address' }];
  const result = mapVendorFields(fields, 'Koha', 'lmsConfig', vendorFieldMapping, undefined, vendorFieldValues);
  expect(result[0]).toMatchObject({ disabled: true, overrideValue: false });
  expect(result[1]).not.toHaveProperty('overrideValue');
  expect(fields[0]).not.toHaveProperty('overrideValue');
  const catalog = mapVendorFields([{
    fieldName: 'holdingsFormat', onlyOne: true, subMap: [{ fieldName: 'marc', subMap: [{ fieldName: 'availability' }] }],
  }], 'Koha', 'catalogConfig', vendorFieldMapping, 'catalogConfig.profile', vendorFieldValues);
  expect(catalog[0]).not.toHaveProperty('overrideValue');
  expect(catalog[0].subMap[0].subMap[0].overrideValue)
    .toEqual(spec['x-host-profiles'].Koha.catalogConfig.holdingsFormat.marc.availability);
});

it.each([[null], [false], ['bad'], [[{}]], 'bad'].map(value => ({ value })))('rejects malformed object-array override %j before rendering', ({ value }) => {
  expect(() => applyDisabledPaths([{ fieldName: 'rules', valueType: 'objectArray', objectMap: [] }],
    ['rules'], { setting: 'catalogConfig.profile', name: 'Custom' }, { rules: value }))
    .toThrow('Invalid object-array override for "rules".');
});

it.each([null, [], [{ operator: 'equals', value: '0' }]].map(value => ({ value })))('retains valid object-array override %j', ({ value }) => {
  const fields = applyDisabledPaths([{ fieldName: 'rules', valueType: 'objectArray', objectMap: [] }],
    ['rules'], { setting: 'catalogConfig.profile', name: 'Custom' }, { rules: value });
  expect(fields[0].overrideValue).toEqual(value);
});
