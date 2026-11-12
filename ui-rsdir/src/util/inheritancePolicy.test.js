import { applyInheritancePolicy, EDITABLE, fieldAccess, fieldCanInherit, HIDDEN, READ_ONLY } from './inheritancePolicy';

// Mirrors the shape of crosslink/directory/api.yaml: containers reference
// their schema through allOf, and children may override container policy.
const spec = {
  components: {
    schemas: {
      EntryProperties: {
        properties: {
          lmsConfig: {
            allOf: [{ $ref: '#/components/schemas/LmsConfig' }],
            'x-inheritance-root': 'Institution',
            'x-editable-on': ['Institution'],
          },
          illConfig: {
            allOf: [{ $ref: '#/components/schemas/IllConfig' }],
            'x-inheritance-root': 'Consortium',
            'x-editable-on': ['Consortium', 'Institution'],
          },
          timeZone: { type: 'string' },
        },
      },
      LmsConfig: {
        properties: {
          address: { type: 'string' },
          requesterPickupLocation: {
            type: 'string',
            'x-inheritance-root': 'none',
            'x-editable-on': ['Institution', 'Branch'],
          },
        },
      },
      IllConfig: {
        properties: {
          loadBalancingPolicy: { 'x-inheritance-root': 'none', 'x-editable-on': ['Consortium'] },
          requestIdPrefix: { type: 'string', 'x-inheritance-root': 'Institution' },
        },
      },
    },
  },
};

describe('fieldAccess', () => {
  it.each([
    // Container policy applies to unannotated children.
    ['lmsConfig', 'address', 'Institution', EDITABLE],
    ['lmsConfig', 'address', 'Branch', READ_ONLY],
    ['lmsConfig', 'address', 'Consortium', HIDDEN],
    // A child's own annotations replace the container's.
    ['lmsConfig', 'requesterPickupLocation', 'Branch', EDITABLE],
    ['lmsConfig', 'requesterPickupLocation', 'Consortium', HIDDEN],
    ['illConfig', 'loadBalancingPolicy', 'Institution', HIDDEN],
    // Root and editability fall back independently.
    ['illConfig', 'requestIdPrefix', 'Branch', READ_ONLY],
    ['illConfig', 'requestIdPrefix', 'Institution', EDITABLE],
  ])('%s.%s on %s is %s', (configKey, fieldName, entryType, expected) => {
    expect(fieldAccess(spec, configKey, fieldName, entryType)).toBe(expected);
  });

  it('leaves fields editable without metadata', () => {
    expect(fieldAccess(undefined, 'lmsConfig', 'address', 'Branch')).toBe(EDITABLE);
    expect(fieldAccess(spec, 'holdingsPolicy', 'locations', 'Branch')).toBe(EDITABLE);
    expect(fieldAccess(spec, 'lmsConfig', 'address', undefined)).toBe(EDITABLE);
  });
});

it('fieldCanInherit follows the root for editable fields too', () => {
  expect(fieldCanInherit(spec, 'illConfig', 'loanConditions', 'Institution')).toBe(true);
  expect(fieldCanInherit(spec, 'illConfig', 'requestIdPrefix', 'Institution')).toBe(false);
  expect(fieldCanInherit(spec, 'illConfig', 'loanConditions', 'Consortium')).toBe(false);
});

it('applyInheritancePolicy marks inherited fields read-only and removes hidden ones', () => {
  const fieldMap = [{ fieldName: 'address' }, { fieldName: 'requesterPickupLocation' }];

  expect(applyInheritancePolicy(fieldMap, spec, 'lmsConfig', 'Branch')).toEqual([
    { fieldName: 'address', readOnly: true },
    { fieldName: 'requesterPickupLocation' },
  ]);
  expect(applyInheritancePolicy(fieldMap, spec, 'lmsConfig', 'Consortium')).toEqual([]);
});
