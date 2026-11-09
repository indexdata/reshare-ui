import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useQueryClient } from 'react-query';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { configSection } from '../config/configSections';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const { controlIdPrefix, fieldLabelId, fieldMap } = configSection('illConfig');

const ILLConfigRoute = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  if (!entryQuery.isSuccess) return <EntryLoadingPane />;

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
