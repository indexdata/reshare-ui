import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { FormattedMessage } from 'react-intl';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

const CREATE = 'create';
const EDIT = 'edit';
const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.catalogConfig.${fieldName}`;
const fieldMap = [
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
    subMap: [
      {
        fieldName: 'marc',
        valueType: 'subField',
        subMap: [
          {
            fieldName: 'mainField',
            valueType: 'string',
          },
          {
            fieldName: 'locationsSubField',
            valueType: 'string',
          },
          {
            fieldName: 'shelvingLocationsSubField',
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
            fieldName: 'title',
            valueType: 'string',
          },
          {
            fieldName: 'author',
            valueType: 'string',
          },
          {
            fieldName: 'edition',
            valueType: 'string',
          },
        ],
      },
    ],
  },
];

const EditCatalogConfigRoute = () => {
  const { id } = useParams();
  const location = useLocation();

  const operation = id ? EDIT : CREATE;
  const close = useCloseDirect(operation === CREATE ? `/directory/entries${location.search}` : `/directory/entries/entry-points/${id}/edit${location.search}`);

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
    enabled: !!id,
  });

  if (operation === EDIT && !entryQuery.isSuccess) return null;

  return (
    <Pane
      defaultWidth="fill"
      paneTitle={<FormattedMessage id="ui-rsdir.catalogConfig.edit" />}
      onClose={close}
      dismissible
    >
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
        fieldMapping={fieldMap}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.catalogConfig.edit.success" />}
      />
    </Pane>
  );
};

export default EditCatalogConfigRoute;
