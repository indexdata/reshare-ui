import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { FormattedMessage } from 'react-intl';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

const CREATE = 'create';
const EDIT = 'edit';
const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.illConfig.${fieldName}`;
const fieldMap = [
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
    fieldName: 'lendersOfLastResort',
    valueType: 'symbolList',
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
    fieldName: 'noteFieldSeparator',
    valueType: 'string',
  },
  {
    fieldName: 'supplierPatronPattern',
    valueType: 'string',
  },
  {
    fieldName: 'duplicateCheckWindowHours',
    valueType: 'integer',
  },
];

const EditIllConfigRoute = () => {
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
      paneTitle={<FormattedMessage id="ui-rsdir.illConfig.edit" />}
      onClose={close}
      dismissible
    >
      <SettingsConfigEditor
        configKey="illConfig"
        controlIdPrefix="ill-config"
        emptyMessage={
          <FormattedMessage
            id="ui-rsdir.illConfig.empty"
            defaultMessage="No ILL configuration has been saved for this entry."
          />
        }
        fieldLabelId={fieldLabelId}
        fieldMapping={fieldMap}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.illConfig.edit.success" />}
      />
    </Pane>
  );
};

export default EditIllConfigRoute;
