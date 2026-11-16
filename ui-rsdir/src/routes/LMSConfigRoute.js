import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { configSection } from '../config/configSections';
import HostProfilesError from '../components/HostProfilesError';
import useEffectiveSections from '../hooks/useEffectiveSections';
import useDirectoryPermissions from '../hooks/useDirectoryPermissions';
import { selectionChangeImpact } from '../config/vendorFieldMapping';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const { controlIdPrefix, fieldLabelId } = configSection('lmsConfig');

const LMSConfigRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });
  const { sections, hostProfiles: { lmsConfig: hostProfiles } } = useEffectiveSections(entryQuery.data);
  const { canEditEntry } = useDirectoryPermissions(entryQuery.data);
  const { metadata } = hostProfiles;
  const mappedFields = sections.find(row => row.configKey === 'lmsConfig').fieldMap;

  if (!entryQuery.isSuccess || (!metadata && !hostProfiles.isError)) return <EntryLoadingPane />;

  if (!metadata) {
    return (
      <EntryPane entry={entryQuery.data}>
        <HostProfilesError isFetching={hostProfiles.isFetching} refetch={hostProfiles.refetch} />
      </EntryPane>
    );
  }

  return (
    <EntryPane entry={entryQuery.data}>
      {({ shownFields, searchWords }) => (
        <SettingsConfigEditor
          configKey="lmsConfig"
          controlIdPrefix={controlIdPrefix}
          emptyMessage={
            <FormattedMessage
              id="ui-rsdir.lmsConfig.empty"
              defaultMessage="No LMS configuration has been saved for this entry."
            />
          }
          fieldLabelId={fieldLabelId}
          fieldMapping={mappedFields}
          getSelectionChangeImpact={({ fieldName, nextValue, resource }) => (
            fieldName === 'vendor' ? selectionChangeImpact({
              configKey: 'lmsConfig', nextValue, resource, vendorFieldMapping: metadata.vendorFieldMapping,
            }) : undefined
          )}
          initialResource={entryQuery.data}
          readOnly={!canEditEntry}
          resourcePath={entryPath(id)}
          searchWords={searchWords}
          shownFields={shownFields}
          successMessage={<FormattedMessage id="ui-rsdir.lmsConfig.edit.success" />}
        />
      )}
    </EntryPane>
  );
};

export default LMSConfigRoute;
