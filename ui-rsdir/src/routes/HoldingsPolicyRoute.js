import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane, { EntryLoadingPane } from '../components/EntryPane';
import SettingsConfigEditor from '../components/SettingsConfigEditor';
import { configSection } from '../config/configSections';
import useEffectiveSections from '../hooks/useEffectiveSections';

const STALE_QUERY_TIME = 2 * 60 * 1000;
const entryPath = id => `directory/entries/by-id/${id}`;
const { controlIdPrefix, fieldLabelId } = configSection('holdingsPolicy');

const HoldingsPolicyRoute = () => {
  const { id } = useParams();

  const entryQuery = useOkapiQuery(entryPath(id), {
    staleTime: STALE_QUERY_TIME,
  });

  const { sections, policyReady } = useEffectiveSections(entryQuery.data);
  const fieldMap = sections.find(row => row.configKey === 'holdingsPolicy').fieldMap;

  if (!entryQuery.isSuccess || !policyReady) return <EntryLoadingPane />;

  return (
    <EntryPane entry={entryQuery.data}>
      {({ shownFields, searchWords }) => (
        <SettingsConfigEditor
          configKey="holdingsPolicy"
          controlIdPrefix={controlIdPrefix}
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
          searchWords={searchWords}
          shownFields={shownFields}
          successMessage={<FormattedMessage id="ui-rsdir.holdingsPolicy.edit.success" />}
        />
      )}
    </EntryPane>
  );
};

export default HoldingsPolicyRoute;
