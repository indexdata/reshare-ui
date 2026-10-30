import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useQueryClient } from 'react-query';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const fieldLabelId = fieldName => `ui-rsdir.illConfig.${fieldName}`;
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

export const fieldMap = [
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

const ILLConfigRoute = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  if (!entryQuery.isSuccess) return <EntryLoadingPane />;

  return (
    <EntryPane entry={entryQuery.data}>
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
        onSave={() => queryClient.invalidateQueries('directory/entries/owned')}
        resourcePath={entryPath(id)}
        successMessage={<FormattedMessage id="ui-rsdir.illConfig.edit.success" />}
      />
    </EntryPane>
  );
};

export default ILLConfigRoute;
