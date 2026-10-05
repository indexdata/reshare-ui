import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Redirect, useHistory, useLocation, useParams, useRouteMatch } from 'react-router-dom';
import { Pane } from '@folio/stripes/components';
import { upNLevels, useOkapiQuery } from '@projectreshare/stripes-reshare';
import { ENTRY_PANE_ID, EntryLoadingPane } from '../components/EntryPane';

// Lets other apps link to an entry by the symbol they hold, as AUTHORITY:SYMBOL,
// by resolving it to the id that the entry view and its sections are keyed by.
const SymbolEntryRoute = () => {
  const { symbol } = useParams();
  const history = useHistory();
  const location = useLocation();
  const entriesUrl = upNLevels({ pathname: useRouteMatch().url, search: '' }, 2);

  // A peer outside the directory is an expected miss, so only other errors throw.
  const entryQuery = useOkapiQuery(`directory/entries/by-symbol/${symbol}`, {
    useErrorBoundary: err => err.status !== 404,
  });

  if (entryQuery.isSuccess) {
    return <Redirect to={{ pathname: `${entriesUrl}/${entryQuery.data.id}`, search: location.search }} />;
  }

  if (entryQuery.isError) {
    return (
      <Pane
        id={ENTRY_PANE_ID}
        defaultWidth="fill"
        dismissible
        onClose={() => history.push({ pathname: entriesUrl, search: location.search })}
        paneTitle={symbol}
      >
        <FormattedMessage id="ui-rsdir.entry.symbolNotFound" values={{ symbol }} />
      </Pane>
    );
  }

  return <EntryLoadingPane />;
};

export default SymbolEntryRoute;
