import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { Pane, PaneMenu } from '@folio/stripes/components';
import { upNLevels } from '@projectreshare/stripes-reshare';
import EntrySections, { sectionAt } from './EntrySections';
import css from './EntryPane.css';

// Sections are flat leaf routes, so their own match is below the entry; this is
// the entry's, whichever section is showing. The module's route is fixed.
const ENTRY_PATH = '/directory/entries/:id';

// The pane every section of an entry renders into: the entry's title and close,
// the section's own actions, and the section beside the list of sections.
const EntryPane = ({ entry, actions, children, ...paneProps }) => {
  const history = useHistory();
  const location = useLocation();
  const { url: entryUrl } = useRouteMatch(ENTRY_PATH);
  const section = sectionAt(location.pathname, entryUrl);

  // A push rather than useCloseDirect: the edit form is reached by a direct
  // link, and closing the entry from there must still land on the list.
  const close = () => history.push(upNLevels({ pathname: entryUrl, search: location.search }, 1));

  return (
    <Pane
      defaultWidth="fill"
      dismissible
      onClose={close}
      padContent={false}
      paneTitle={entry.name}
      paneSub={<FormattedMessage id={section.labelId} />}
      lastMenu={actions && <PaneMenu>{actions}</PaneMenu>}
      {...paneProps}
    >
      <div className={css.row}>
        <div className={css.section}>{children}</div>
        <EntrySections className={css.sections} entryUrl={entryUrl} active={section} />
      </div>
    </Pane>
  );
};

export default EntryPane;
