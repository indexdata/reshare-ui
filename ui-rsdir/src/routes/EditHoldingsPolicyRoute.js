import { useLocation, useParams } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { FormattedMessage } from 'react-intl';
import { useCloseDirect, useOkapiQuery } from '@projectreshare/stripes-reshare';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

const CREATE = 'create';
const EDIT = 'edit';
const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.holdingsPolicy.${fieldName}`;
const fieldMap = [
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

const EditHoldingsPolicyRoute = () => {
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
      paneTitle={<FormattedMessage id="ui-rsdir.holdingsPolicy.edit" />}
      onClose={close}
      dismissible
    >
      <SettingsConfigEditor
        configKey="holdingsPolicy"
        controlIdPrefix="holdings-policy"
        emptyMessage={
          <FormattedMessage
            id="ui-rsdir.holdingsPolicy.empty"
            defaultMessage="No holdings policy has been saved for this entry."
          />
        }
        fieldLabelId={fieldLabelId}
        fieldMapping={fieldMap}
        initialResource={entryQuery.data}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.holdingsPolicy.edit.success" />}
      />
    </Pane>
  );
};

export default EditHoldingsPolicyRoute;
