import {
  applyDisabledPaths,
  vendorFieldMapping,
  vendorFieldMappingForVendor,
} from './vendorFieldMapping';

describe('vendorFieldMapping', () => {
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
      { fieldName: 'ncipNamespaceEnabled', disabled: true },
      { fieldName: 'address', disabled: false },
    ]);
    expect(vendorFieldMappingForVendor([
      { fieldName: 'address' },
    ], 'WMS', 'lmsConfig')).toEqual([
      { fieldName: 'address', disabled: false },
    ]);
  });
});
