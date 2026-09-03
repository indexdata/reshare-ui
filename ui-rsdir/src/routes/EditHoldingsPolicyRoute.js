import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

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

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  if (!entryQuery.isSuccess) return null;

  return (
    <EntryPane entry={entryQuery.data}>
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
    </EntryPane>
  );
};

export default EditHoldingsPolicyRoute;
