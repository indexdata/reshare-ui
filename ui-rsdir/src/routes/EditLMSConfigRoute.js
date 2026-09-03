import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.lmsConfig.${fieldName}`;
const fieldMap = [
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
    valueType: 'string'
  },
  {
    fieldName: 'toAgency',
    valueType: 'string'
  },
  {
    fieldName: 'lookupUserEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'acceptItemEnabled',
    valueType: 'boolean',
    defaultDesc: 'Is Accept Item Enabled?'
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
  },
  {
    fieldName: 'requestItemRequestType',
    valueType: 'string',
  },
  {
    fieldName: 'requestItemRequestScopeType',
    valueType: 'string',
  },
  {
    fieldName: 'requestItemPickupLocationEnabled',
    valueType: 'boolean',
  },
  {
    fieldName: 'requestItemBibIdCode',
    valueType: 'string',
  },
  {
    fieldName: 'requesterPickupLocation',
    valueType: 'string',
  },
  {
    fieldName: 'supplierPickupLocation',
    valueType: 'string',
  },
  {
    fieldName: 'requesterPatronPattern',
    valueType: 'string'
  }
];

const EditLMSConfigRoute = () => {
  const { id } = useParams();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  if (!entryQuery.isSuccess) return null;

  return (
    <EntryPane entry={entryQuery.data}>
      <SettingsConfigEditor
        configKey="lmsConfig"
        controlIdPrefix="lms-config"
        emptyMessage={
          <FormattedMessage
            id="ui-rsdir.lmsConfig.empty"
            defaultMessage="No LMS configuration has been saved for this entry."
          />
        }
        fieldLabelId={fieldLabelId}
        fieldMapping={fieldMap}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.lmsConfig.edit.success" />}
      />
    </EntryPane>
  );
};

export default EditLMSConfigRoute;
