import { configFieldDescription } from './configFieldDescription';

// Representative resource schemas from directory/api.yaml (not import/patch schemas).
const spec = { components: { schemas: {
  LmsConfig: { properties: {
    address: { description: 'Base URL of the LMS API' },
    vendor: { description: 'Host integration profile', allOf: [{ $ref: '#/components/schemas/HostLmsVendor' }] },
    patronProfiles: {
      description: 'Patron profiles used to determine eligibility',
      allOf: [{ $ref: '#/components/schemas/PatronProfiles' }],
    },
  } },
  HostLmsVendor: { description: 'Host vendor' },
  PatronProfiles: {
    type: 'array',
    description: 'Rules inspected in order',
    items: { $ref: '#/components/schemas/PatronProfile' },
  },
  PatronProfile: { properties: { code: { description: 'Profile code returned by the LMS' } } },
  CatalogConfig: { properties: {
    metadataUpdateMode: { $ref: '#/components/schemas/MetadataUpdateMode' },
    holdingsFormat: { $ref: '#/components/schemas/HoldingsParserConfig' },
  } },
  MetadataUpdateMode: { description: 'Determines how lookup metadata updates outgoing requests' },
  HoldingsParserConfig: { properties: { marc: { $ref: '#/components/schemas/MarcHoldingsParserConfig' } } },
  MarcHoldingsParserConfig: { properties: {
    availability: { description: 'All predicates must match a candidate item', type: 'array', items: { $ref: '#/components/schemas/MarcAvailabilityPredicate' } },
  } },
  MarcAvailabilityPredicate: { properties: { operator: { $ref: '#/components/schemas/MarcAvailabilityOperator' } } },
  MarcAvailabilityOperator: { description: 'Availability comparison operator' },
  HoldingsPolicy: { properties: {
    locations: { type: 'array', items: { $ref: '#/components/schemas/HoldingsLocation' } },
  } },
  HoldingsLocation: { properties: { supplyPreference: { $ref: '#/components/schemas/HoldingsSupplyPreference' } } },
  HoldingsSupplyPreference: { description: 'Supply preference where -1 disables supply' },
  IllConfig: { properties: { defaultLoanPeriod: { description: 'Default supplier loan period in calendar days' } } },
  LmsConfigPatch: { properties: { address: { description: 'Wrong patch description' } } },
} } };

it.each([
  ['lmsConfig', 'address', 'Base URL of the LMS API'],
  ['lmsConfig', 'vendor', 'Host integration profile'],
  ['lmsConfig', 'patronProfiles', 'Patron profiles used to determine eligibility'],
  ['lmsConfig', 'patronProfiles.code', 'Profile code returned by the LMS'],
  ['catalogConfig', 'metadataUpdateMode', 'Determines how lookup metadata updates outgoing requests'],
  ['catalogConfig', 'holdingsFormat.marc.availability', 'All predicates must match a candidate item'],
  ['catalogConfig', 'holdingsFormat.marc.availability.operator', 'Availability comparison operator'],
  ['holdingsPolicy', 'locations.supplyPreference', 'Supply preference where -1 disables supply'],
  ['illConfig', 'defaultLoanPeriod', 'Default supplier loan period in calendar days'],
])('resolves %s.%s', (configKey, path, expected) => {
  expect(configFieldDescription(spec, configKey, path)).toBe(expected);
});

it('ignores absent paths, unsupported configurations and missing schemas', () => {
  expect(configFieldDescription(spec, 'lmsConfig', 'absent')).toBeUndefined();
  expect(configFieldDescription(spec, 'config', 'address')).toBeUndefined();
  expect(configFieldDescription(undefined, 'lmsConfig', 'address')).toBeUndefined();
  expect(configFieldDescription(spec, 'lmsConfig', '')).toBeUndefined();
});

it('handles blank help, unresolved references, external references, cycles and ambiguous compositions', () => {
  const cyclicSpec = { components: { schemas: {
    LmsConfig: { properties: {
      blank: { description: '  \n ' },
      missing: { $ref: '#/components/schemas/Missing' },
      external: { $ref: 'other.json#/components/schemas/External' },
      cycle: { $ref: '#/components/schemas/Cycle' },
      composed: { allOf: [{ properties: { child: { description: 'Child help' } } }] },
      ambiguous: { allOf: [{ description: 'First' }, { description: 'Second' }] },
      fallback: { description: ' ', $ref: '#/components/schemas/Help' },
    } },
    Cycle: { allOf: [{ $ref: '#/components/schemas/Cycle' }, { description: 'Help beside cycle' }] },
    Help: { description: 'Referenced help' },
  } } };
  ['blank', 'missing', 'external', 'ambiguous', 'cycle.absent'].forEach(path => {
    expect(configFieldDescription(cyclicSpec, 'lmsConfig', path)).toBeUndefined();
  });
  expect(configFieldDescription(cyclicSpec, 'lmsConfig', 'cycle')).toBe('Help beside cycle');
  expect(configFieldDescription(cyclicSpec, 'lmsConfig', 'composed.child')).toBe('Child help');
  expect(configFieldDescription(cyclicSpec, 'lmsConfig', 'fallback')).toBe('Referenced help');
});
