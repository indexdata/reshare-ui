import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useParams, useRouteMatch } from 'react-router-dom';
import { Button } from '@folio/stripes/components';
import { DirectLink, useOkapiQuery } from '@projectreshare/stripes-reshare';
import EntryPane from '../components/EntryPane';
import ViewEntry from '../components/ViewEntry';

const ViewEntryRoute = () => {
  const { id } = useParams();
  const match = useRouteMatch();

  const entryQuery = useOkapiQuery(`directory/entries/by-id/${id}`, {
    staleTime: 2 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
    keepPreviousData: true,
  });

  if (!entryQuery.isSuccess) return null;

  return (
    <EntryPane
      entry={entryQuery.data}
      actions={
        <DirectLink
          component={Button}
          id="clickable-edit-entry"
          to={`${match.url}/edit`}
          preserveSearch
          buttonStyle="primary paneHeaderNewButton"
          marginBottom0
        >
          <FormattedMessage id="ui-rsdir.edit" />
        </DirectLink>
      }
    >
      <ViewEntry entry={entryQuery.data} />
    </EntryPane>
  );
};

export default ViewEntryRoute;
