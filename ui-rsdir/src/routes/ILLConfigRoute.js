import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useQueryClient } from 'react-query';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { configSection } from '../config/configSections';
import useEffectiveSections from '../hooks/useEffectiveSections';
import useDirectoryPermissions from '../hooks/useDirectoryPermissions';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const { controlIdPrefix, fieldLabelId } = configSection('illConfig');

const ILLConfigRoute = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  const { sections, policyReady } = useEffectiveSections(entryQuery.data);
  const { canEditEntry } = useDirectoryPermissions(entryQuery.data);
  const fieldMap = sections.find(row => row.configKey === 'illConfig').fieldMap;

  if (!entryQuery.isSuccess || !policyReady) return <EntryLoadingPane />;

  return (
    <EntryPane entry={entryQuery.data}>
      {({ shownFields, searchWords }) => (
        <SettingsConfigEditor
          configKey="illConfig"
          controlIdPrefix={controlIdPrefix}
          emptyMessage={
            <FormattedMessage
              id="ui-rsdir.illConfig.empty"
              defaultMessage="No ILL configuration has been saved for this entry."
            />
          }
          fieldLabelId={fieldLabelId}
          fieldMapping={fieldMap}
          initialResource={entryQuery.data}
          readOnly={!canEditEntry}
          onSave={() => queryClient.invalidateQueries('directory/entries/owned')}
          resourcePath={entryPath(id)}
          searchWords={searchWords}
          shownFields={shownFields}
          successMessage={<FormattedMessage id="ui-rsdir.illConfig.edit.success" />}
        />
      )}
    </EntryPane>
  );
};

export default ILLConfigRoute;
