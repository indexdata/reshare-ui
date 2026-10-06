import {
  applyDisabledPaths,
  vendorFieldMapping,
  vendorFieldMappingForVendor,
  selectionChangeImpact,
} from './vendorFieldMapping';

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
