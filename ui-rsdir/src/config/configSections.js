import { FormattedMessage } from 'react-intl';

// Base field maps; see FieldMapping.md for the DSL.
// useEffectiveSections applies host-profile overrides.

const lmsConfigFields = [
  {
    fieldName: 'vendor',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'address',
    valueType: 'string',
    required: true
  },
  {
    fieldName: 'fromAgency',
    valueType: 'string',
    required: true
  },
  {
    fieldName: 'fromAgencyAuthentication',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'toAgency',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'lookupUserEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'acceptItemEnabled',
    valueType: 'boolean',
    defaultDesc: 'Is Accept Item Enabled?',
  },
  {
    fieldName: 'bibIdNormalization',
    valueType: 'string',
    nullOnEmpty: true,
    validChoices: ['none', 'sierra']
  },
  {
    fieldName: 'checkInItemEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'checkOutItemEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'itemLocation',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'ncipNamespaceEnabled',
    valueType: 'boolean'
  },
  {
    fieldName: 'requestItemEnabled',
    valueType: 'boolean'
  },
  {
    fieldName: 'requestItemRequestType',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'requestItemRequestScopeType',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'requestItemPickupLocationEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'requestItemBibIdCode',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'requesterPickupLocation',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'supplierPickupLocation',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'requesterPatronPattern',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'patronProfiles',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'code',
        valueType: 'string',
        required: true
      },
      {
        fieldName: 'name',
        valueType: 'string',
        required: true
      },
      {
        fieldName: 'canCreateRequests',
        valueType: 'boolean',
        required: true
      }
    ]
  }
];

const catalogConfigFields = [
  {
    fieldName: 'profile',
    valueType: 'string',
    nullOnEmpty: true,
  },
  {
    fieldName: 'sru',
    valueType: 'subField',
    subMap: [
      {
        fieldName: 'address',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'recordSchema',
        valueType: 'string',
      },
    ],
  },
  {
    fieldName: 'zoom',
    valueType: 'subField',
    subMap: [
      {
        fieldName: 'address',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'options',
        valueType: 'stringMap',
      },
    ],
  },
  {
    fieldName: 'queryConfig',
    valueType: 'subField',
    subMap: [
      {
        fieldName: 'type',
        valueType: 'string',
        validChoices: ['cql', 'pqf'],
      },
      {
        fieldName: 'title',
        valueType: 'string',
      },
      {
        fieldName: 'isbn',
        valueType: 'string',
      },
      {
        fieldName: 'issn',
        valueType: 'string',
      },
      {
        fieldName: 'identifier',
        valueType: 'string',
      },
    ],
  },
  {
    fieldName: 'holdingsFormat',
    valueType: 'subField',
    onlyOne: true,
    subMap: [
      {
        fieldName: 'marc',
        valueType: 'subField',
        subMap: [
          {
            fieldName: 'availability',
            valueType: 'objectArray',
            objectMap: [
              {
                fieldName: 'subField',
                valueType: 'string',
                required: true
              },
              {
                fieldName: 'operator',
                valueType: 'string',
                validChoices: ['equals', 'absent'],
                required: true
              },
              {
                fieldName: 'value',
                valueType: 'string'
              }
            ]
          },
          {
            fieldName: 'mainField',
            valueType: 'string',
          },
          {
            fieldName: 'locationSubField',
            valueType: 'string',
          },
          {
            fieldName: 'shelvingLocationSubField',
            valueType: 'string',
          },
          {
            fieldName: 'itemIdSubField',
            valueType: 'string',
          },
          {
            fieldName: 'restrictedSubField',
            valueType: 'string',
          },
          {
            fieldName: 'callNumberSubField',
            valueType: 'string',
          },
        ],
      },
      {
        fieldName: 'opac',
        valueType: 'subField',
        subMap: [
          {
            fieldName: 'availabilityRule',
            valueType: 'string',
            validChoices: ['availableNow', 'publicNote']
          },
          {
            fieldName: 'availablePublicNotes',
            valueType: 'stringArray'
          },
          {
            fieldName: 'requireLocalLocation',
            valueType: 'boolean'
          },
          {
            fieldName: 'shelvingLocationSource',
            valueType: 'string',
            validChoices: ['shelvingLocation', 'localLocation']
          },
          {
            fieldName: 'includeItemId',
            valueType: 'boolean'
          },
          {
            fieldName: 'includeItemLoanPolicy',
            valueType: 'boolean'
          },
          {
            fieldName: 'includeTemporaryLocation',
            valueType: 'boolean'
          },
          {
            fieldName: 'allCirculations',
            valueType: 'boolean'
          }
        ]
      },
      {
        fieldName: 'reservoir',
        valueType: 'subField',
        subMap: []
      },
      {
        fieldName: 'marc21plus1',
        valueType: 'subField',
        subMap: []
      }
    ],
  },
  {
    fieldName: 'metadataUpdateMode',
    valueType: 'string',
    validChoices: ['replace', 'merge', 'none', 'auto'],
  },
  {
    fieldName: 'metadataFormat',
    valueType: 'subField',
    subMap: [
      {
        fieldName: 'marc21',
        valueType: 'subField',
        subMap: [
          {
            fieldName: 'identifier',
            valueType: 'string'
          },
          {
            fieldName: 'isbn',
            valueType: 'string'
          },
          {
            fieldName: 'issn',
            valueType: 'string'
          },
          {
            fieldName: 'title',
            valueType: 'string'
          },
          {
            fieldName: 'subtitle',
            valueType: 'string'
          },
          {
            fieldName: 'author',
            valueType: 'string'
          },
          {
            fieldName: 'edition',
            valueType: 'string'
          },
        ],
      },
    ],
  },
];

const holdingsPolicyFields = [
  {
    fieldName: 'locations',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'code',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'name',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'supplyPreference',
        valueType: 'integer',
        required: true,
      },
    ],
  },
  {
    fieldName: 'shelvingLocations',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'code',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'name',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'supplyPreference',
        valueType: 'integer',
        required: true,
      },
    ],
  },
  {
    fieldName: 'locationPolicies',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'locationCode',
        valueType: 'string',
      },
      {
        fieldName: 'shelvingLocationCode',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'supplyPreference',
        valueType: 'integer',
        required: true,
      },
    ],
  },
  {
    fieldName: 'itemLoanPolicies',
    valueType: 'objectArray',
    objectMap: [
      {
        fieldName: 'code',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'name',
        valueType: 'string',
        required: true,
      },
      {
        fieldName: 'lendable',
        valueType: 'boolean',
        required: true,
      },
    ],
  },
];

const codeDescriptionArray = fieldName => ({
  fieldName,
  valueType: 'objectArray',
  defaultOnly: fieldName === 'availableCopyrightTypes',
  objectMap: [
    { fieldName: 'code', valueType: 'string', required: true },
    { fieldName: 'defaultDesc', valueType: 'string', required: true },
  ],
});

const copyrightSaveImpact = ({ nextValue, resource }) => {
  const config = resource?.illConfig;
  const code = config?.defaultCopyrightType?.code;
  if (typeof code !== 'string' ||
    !config.availableCopyrightTypes?.some(item => item.code === code) ||
    nextValue.some(item => item.code === code)) return undefined;

  return {
    heading: <FormattedMessage id="ui-rsdir.illConfig.clearDefault.heading" defaultMessage="Clear default copyright type?" />,
    message: (
      <FormattedMessage
        id="ui-rsdir.illConfig.clearDefault.message"
        defaultMessage="Saving these changes will remove {code} from the available copyright types and clear the current default copyright type."
        values={{ code }}
      />
    ),
    confirmLabel: <FormattedMessage id="ui-rsdir.illConfig.clearDefault.confirm" defaultMessage="Save and clear default" />,
    discardChangesMessage: (
      <FormattedMessage
        id="ui-rsdir.illConfig.clearDefault.discardChanges"
        defaultMessage="Unsaved changes to the default copyright type will also be discarded."
      />
    ),
    additionalValues: { defaultCopyrightType: null },
  };
};

const illConfigFields = [
  codeDescriptionArray('loanConditions'),
  { ...codeDescriptionArray('availableCopyrightTypes'), getSaveImpact: copyrightSaveImpact },
  {
    fieldName: 'defaultCopyrightType',
    valueType: 'codeDescription',
    availableValuesField: 'availableCopyrightTypes',
    emptyChoicesMessage: (
      <FormattedMessage
        id="ui-rsdir.illConfig.defaultCopyrightType.defineAvailable"
        defaultMessage="Define available Copyright types before selecting a default"
      />
    ),
  },
  codeDescriptionArray('unfilledReasons'),
  codeDescriptionArray('cancellationReasons'),
  {
    fieldName: 'loadBalancingPolicy',
    valueType: 'string',
    validChoices: ['deficit', 'proportional'],
    nullOnEmpty: true,
  },
  {
    fieldName: 'isPickupLocation',
    valueType: 'boolean',
  },
  {
    fieldName: 'iso18626Url',
    valueType: 'string',
  },
  {
    fieldName: 'iso18626Vendor',
    valueType: 'string',
    validChoices: ['Alma', 'ReShare', 'CrossLink', 'ILLiad', 'Unknown'],
  },
  {
    fieldName: 'defaultLoanPeriod',
    valueType: 'integer',
    minValue: 1,
  },
  {
    fieldName: 'lendersOfLastResort',
    valueType: 'symbolList',
    getSaveErrorMessage: error => (error.response?.status === 400 ? (
      <FormattedMessage
        id="ui-rsdir.illConfig.lendersOfLastResort.invalid"
        defaultMessage="Please make sure all Lenders of Last Resort symbols are valid and not duplicated."
      />
    ) : undefined),
  },
  {
    fieldName: 'includeRequestingAgencyInfo',
    valueType: 'boolean',
  },
  {
    fieldName: 'includeSupplierInfo',
    valueType: 'boolean',
  },
  {
    fieldName: 'includeReturnInfo',
    valueType: 'boolean',
  },
  {
    fieldName: 'includeVendorNote',
    valueType: 'boolean',
  },
  {
    fieldName: 'useOfferedCosts',
    valueType: 'boolean',
  },
  {
    fieldName: 'minimumCost',
    valueType: 'number',
    minValue: 0,
  },
  {
    fieldName: 'noteFieldSeparator',
    valueType: 'string',
  },
  {
    fieldName: 'supplierPatronPattern',
    valueType: 'string',
  },
  {
    fieldName: 'requestIdPrefix',
    valueType: 'string',
    nullOnEmpty: true,
    getSaveErrorMessage: error => (error.response?.status === 400 ? (
      <FormattedMessage
        id="ui-rsdir.illConfig.requestIdPrefix.invalid"
        defaultMessage="Request ID prefix must be at most 32 letters and digits."
      />
    ) : undefined),
  },
  {
    fieldName: 'duplicateCheckWindowHours',
    valueType: 'integer',
    minValue: 0,
  },
  {
    fieldName: 'maxRequestsPerPatron',
    valueType: 'integer',
    minValue: 0,
  },
];

// All configuration sections, whatever the entry type.
export const CONFIG_SECTIONS = [
  {
    configKey: 'lmsConfig',
    segment: 'lmsconfig',
    controlIdPrefix: 'lms-config',
    labelPrefix: 'ui-rsdir.lmsConfig',
    fieldMap: lmsConfigFields,
  },
  {
    configKey: 'catalogConfig',
    segment: 'catalogconfig',
    controlIdPrefix: 'catalog-config',
    labelPrefix: 'ui-rsdir.catalogConfig',
    fieldMap: catalogConfigFields,
  },
  {
    configKey: 'holdingsPolicy',
    segment: 'holdingspolicy',
    controlIdPrefix: 'holdings-policy',
    labelPrefix: 'ui-rsdir.holdingsPolicy',
    fieldMap: holdingsPolicyFields,
  },
  {
    configKey: 'illConfig',
    segment: 'illconfig',
    controlIdPrefix: 'ill-config',
    labelPrefix: 'ui-rsdir.illConfig',
    fieldMap: illConfigFields,
  },
].map(section => ({
  ...section,
  fieldLabelId: path => `${section.labelPrefix}.${path}`,
}));

export const configSection = configKey => CONFIG_SECTIONS.find(section => section.configKey === configKey);

export const sectionAppliesTo = (segment, entryType) => {
  if (segment === 'catalogconfig') return entryType !== 'Branch';
  if (segment === 'lmsconfig') return entryType === 'Institution' || entryType === 'Branch';
  return true;
};
