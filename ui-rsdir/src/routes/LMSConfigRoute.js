import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { vendorFieldMappingForVendor } from '../config/vendorFieldMapping';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.lmsConfig.${fieldName}`;
const fieldMap = [
  {
    fieldName: 'vendor',
    valueType: 'string',
    nullOnEmpty: true,
    validChoices: ['Alma', 'Sierra', 'Koha', 'WMS', 'Aleph', 'FOLIO', 'Generic']
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

const LMSConfigRoute = () => {
  const { id } = useParams();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });
  const vendor = entryQuery.data?.lmsConfig?.vendor;
  const mappedFields = useMemo(
    () => vendorFieldMappingForVendor(fieldMap, vendor, 'lmsConfig'),
    [vendor],
  );

  if (!entryQuery.isSuccess) return <EntryLoadingPane />;

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
        fieldMapping={mappedFields}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.lmsConfig.edit.success" />}
      />
    </EntryPane>
  );
};

export default LMSConfigRoute;
