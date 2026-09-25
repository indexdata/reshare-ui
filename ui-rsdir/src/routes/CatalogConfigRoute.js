import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { vendorFieldMappingForVendor } from '../config/vendorFieldMapping';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.catalogConfig.${fieldName}`;
export const fieldMap = [
  {
    fieldName: 'profile',
    valueType: 'string',
    nullOnEmpty: true,
    validChoices: ['Alma', 'Sierra', 'Koha', 'WMS', 'Aleph', 'FOLIO', 'Generic']
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

const CatalogConfigRoute = () => {
  const { id } = useParams();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });
  const vendor = entryQuery.data?.lmsConfig?.vendor;
  const profile = entryQuery.data?.catalogConfig?.profile;
  const selectedProfile = profile || vendor;
  const mappedFields = useMemo(
    () => vendorFieldMappingForVendor(fieldMap, selectedProfile, 'catalogConfig'),
    [selectedProfile],
  );

  if (!entryQuery.isSuccess) return <EntryLoadingPane />;

  return (
    <EntryPane entry={entryQuery.data}>
      <SettingsConfigEditor
        configKey="catalogConfig"
        controlIdPrefix="catalog-config"
        emptyMessage={
          <FormattedMessage
            id="ui-rsdir.catalogConfig.empty"
            defaultMessage="No catalog configuration has been saved for this entry."
          />
        }
        fieldLabelId={fieldLabelId}
        fieldMapping={mappedFields}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.catalogConfig.edit.success" />}
      />
    </EntryPane>
  );
};

export default CatalogConfigRoute;
