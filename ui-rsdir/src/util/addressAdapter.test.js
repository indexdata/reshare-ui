import addressPluginGeneric from '@k-int/address-plugin-generic';
import addressPluginBritishIsles from '@k-int/address-plugin-british-isles';
import addressPluginNorthAmerica from '@k-int/address-plugin-north-america';
import {
  apiAddressToFormAddress,
  apiAddressToDisplayComponents,
  apiAddressToPluginAddress,
  pluginAddressToApiAddress,
} from './addressAdapter';

describe('addressAdapter', () => {
  it('adds the k-int plugin fields to an API address before form registration', () => {
    const address = {
      id: 'address-id',
      type: 'Default',
      addressComponents: [
        { seq: 0, type: 'Thoroughfare', value: '123 Main Street' },
        { seq: 1, type: 'Locality', value: 'Springfield' },
        { seq: 2, type: 'AdministrativeArea', value: 'IL' },
        { seq: 3, type: 'PostalCode', value: '62701' },
        { seq: 4, type: 'CountryCode', value: 'US' },
      ],
    };

    expect(apiAddressToFormAddress(address, addressPluginGeneric)).toEqual({
      ...address,
      thoroughfare: '123 Main Street',
      locality: 'Springfield',
      administrativeArea: 'IL',
      postalCode: '62701',
      country: 'US',
    });
  });

  it('converts API components to generic-plugin lines', () => {
    const pluginAddress = apiAddressToPluginAddress({
      id: 'address-id',
      type: 'Shipping',
      addressComponents: [
        { seq: 12, type: 'Thoroughfare', value: '123 Main Street' },
        { seq: 3, type: 'Other', value: 'Springfield' },
        { seq: 13, type: 'CountryCode', value: 'US' },
      ],
    }, addressPluginGeneric);

    expect(pluginAddress).toEqual({
      addressLabel: 'Shipping',
      countryCode: 'generic',
      id: 'address-id',
      lines: [
        { id: 'address-id-12', type: { value: 'thoroughfare' }, value: '123 Main Street' },
        { id: 'address-id-3', type: { value: 'postalcodeortown' }, value: 'Springfield' },
        { id: 'address-id-13', type: { value: 'country' }, value: 'US' },
      ],
    });
  });

  it('maps plugin-only fields to Other using stable sequences', () => {
    const apiAddress = pluginAddressToApiAddress({
      id: 'address-id',
      type: 'Default',
      department: 'Shipping',
      premise: 'Main Library',
      thoroughfare: '123 Main Street',
      postalCodeOrTown: 'Springfield',
      locality: 'Sangamon County',
      administrativeArea: 'IL',
      postalCode: '62701',
      postBox: 'PO Box 1',
      postOffice: 'Springfield Post Office',
      country: 'US',
    }, addressPluginGeneric);

    expect(apiAddress.addressComponents).toEqual([
      { seq: 0, type: 'Other', value: 'Shipping' },
      { seq: 1, type: 'Other', value: 'Main Library' },
      { seq: 2, type: 'Thoroughfare', value: '123 Main Street' },
      { seq: 3, type: 'Other', value: 'Springfield' },
      { seq: 4, type: 'Locality', value: 'Sangamon County' },
      { seq: 5, type: 'AdministrativeArea', value: 'IL' },
      { seq: 6, type: 'PostalCode', value: '62701' },
      { seq: 7, type: 'Other', value: 'PO Box 1' },
      { seq: 8, type: 'Other', value: 'Springfield Post Office' },
      { seq: 9, type: 'CountryCode', value: 'US' },
    ]);
  });

  it('preserves unmatched and duplicate legacy components', () => {
    const apiAddress = pluginAddressToApiAddress({
      type: 'Other',
      thoroughfare: 'Updated street',
      addressComponents: [
        { seq: 20, type: 'Other', value: 'Unmapped value' },
        { seq: 4, type: 'Thoroughfare', value: 'Original street' },
        { seq: 5, type: 'Thoroughfare', value: 'Second street' },
      ],
    }, addressPluginGeneric);

    expect(apiAddress.addressComponents).toEqual([
      { seq: 2, type: 'Thoroughfare', value: 'Updated street' },
      { seq: 5, type: 'Thoroughfare', value: 'Second street' },
      { seq: 20, type: 'Other', value: 'Unmapped value' },
    ]);
  });

  it('removes a mapped component when its plugin field is cleared', () => {
    const apiAddress = pluginAddressToApiAddress({
      type: 'Billing',
      locality: '',
      addressComponents: [
        { seq: 1, type: 'Locality', value: 'Old locality' },
      ],
    }, addressPluginGeneric);

    expect(apiAddress.addressComponents).toEqual([]);
  });

  it('orders display components using the plugin field order', () => {
    const addressComponents = [
      { seq: 1, type: 'CountryCode', value: 'US' },
      { seq: 20, type: 'Thoroughfare', value: '123 Main Street' },
      { seq: 4, type: 'Locality', value: 'Springfield' },
      { seq: 5, type: 'AdministrativeArea', value: 'IL' },
      { seq: 6, type: 'PostalCode', value: '62701' },
    ];

    const displayed = apiAddressToDisplayComponents(
      { addressComponents },
      addressPluginGeneric.fieldOrder
    );

    expect(displayed.map(component => component.value)).toEqual([
      '123 Main Street',
      'Springfield',
      'IL',
      '62701',
      'US',
    ]);
    expect(addressComponents.map(component => component.value)).toEqual([
      'US',
      '123 Main Street',
      'Springfield',
      'IL',
      '62701',
    ]);
  });

  it('converts North American address lines through the selected plugin', () => {
    const address = {
      id: 'address-id',
      type: 'Default',
      addressComponents: [
        { seq: 1, type: 'Other', value: 'Main Library' },
        { seq: 2, type: 'Thoroughfare', value: '123 Main Street' },
        { seq: 4, type: 'Locality', value: 'Springfield' },
        { seq: 5, type: 'AdministrativeArea', value: 'IL' },
        { seq: 6, type: 'PostalCode', value: '62701' },
        { seq: 9, type: 'CountryCode', value: 'US' },
      ],
    };

    const formAddress = apiAddressToFormAddress(address, addressPluginNorthAmerica);

    expect(formAddress).toEqual(expect.objectContaining({
      addressLineOne: 'Main Library',
      addressLineTwo: '123 Main Street',
      country: 'US',
      countryCode: 'US',
    }));
    expect(pluginAddressToApiAddress(formAddress, addressPluginNorthAmerica).addressComponents)
      .toEqual(address.addressComponents);
  });

  it('preserves components unsupported by the selected plugin', () => {
    const apiAddress = pluginAddressToApiAddress({
      type: 'Default',
      thoroughfare: '123 Main Street',
      locality: 'London',
      administrativeArea: 'London',
      postalCode: 'SW1A 1AA',
      country: 'UK',
      addressComponents: [
        { seq: 0, type: 'Other', value: 'Shipping department' },
      ],
    }, addressPluginBritishIsles);

    expect(apiAddress.addressComponents).toContainEqual(
      { seq: 0, type: 'Other', value: 'Shipping department' }
    );
  });

  it('orders reserved Other fields and retains duplicates and legacy values', () => {
    const displayed = apiAddressToDisplayComponents({
      addressComponents: [
        { seq: 20, type: 'Other', value: 'Legacy note' },
        { seq: 8, type: 'Other', value: 'Main post office' },
        { seq: 2, type: 'Thoroughfare', value: 'First street line' },
        { seq: 1, type: 'Thoroughfare', value: 'Second street line' },
        { seq: 0, type: 'Other', value: 'Shipping department' },
        { seq: 21, type: 'Other', value: '' },
      ],
    }, addressPluginGeneric.fieldOrder);

    expect(displayed.map(component => component.value)).toEqual([
      'Shipping department',
      'Second street line',
      'First street line',
      'Main post office',
      'Legacy note',
    ]);
  });

  it('formats an address with no components as an empty list', () => {
    expect(apiAddressToDisplayComponents({}, addressPluginGeneric.fieldOrder)).toEqual([]);
  });
});
