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
const { controlIdPrefix, fieldLabelId } = configSection('catalogConfig');

const CatalogConfigRoute = () => {
  const { id } = useParams();
  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });
  const { sections, hostProfiles: { catalogConfig: hostProfiles } } = useEffectiveSections(entryQuery.data);
  const { canEditEntry } = useDirectoryPermissions(entryQuery.data);
  const { metadata } = hostProfiles;
  const mappedFields = sections.find(row => row.configKey === 'catalogConfig').fieldMap;

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
          configKey="catalogConfig"
          controlIdPrefix={controlIdPrefix}
          emptyMessage={
            <FormattedMessage
              id="ui-rsdir.catalogConfig.empty"
              defaultMessage="No catalog configuration has been saved for this entry."
            />
          }
          fieldLabelId={fieldLabelId}
          fieldMapping={mappedFields}
          getSelectionChangeImpact={({ fieldName, nextValue, resource }) => (
            fieldName === 'profile' ? selectionChangeImpact({
              configKey: 'catalogConfig', nextValue, resource, vendorFieldMapping: metadata.vendorFieldMapping,
            }) : undefined
          )}
          initialResource={entryQuery.data}
          readOnly={!canEditEntry}
          resourcePath={entryPath(id)}
          searchWords={searchWords}
          shownFields={shownFields}
          successMessage={<FormattedMessage id="ui-rsdir.catalogConfig.edit.success" />}
        />
      )}
    </EntryPane>
  );
};

export default CatalogConfigRoute;
