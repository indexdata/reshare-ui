import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { LoadingPane, Pane, PaneMenu } from '@folio/stripes/components';
import { upNLevels } from '@projectreshare/stripes-reshare';
import EntrySections, { sectionAt } from './EntrySections';
import css from './EntryPane.css';

// Match the entry URL independently of the current section route.
const ENTRY_PATH = '/directory/entries/:id';

// Reuse the ID so Paneset restores resized widths when a section remounts.
export const ENTRY_PANE_ID = 'entry-pane';

// Keep space for the entry pane while its data loads.
export const EntryLoadingPane = () => <LoadingPane id={ENTRY_PANE_ID} />;

const EntryPane = ({ entry, actions, children, ...paneProps }) => {
  const history = useHistory();
  const location = useLocation();
  const { url: entryUrl } = useRouteMatch(ENTRY_PATH);
  const section = sectionAt(location.pathname, entryUrl);

  // Close always opens the entries list, regardless of section or navigation history.
  const close = () => history.push(upNLevels({ pathname: entryUrl, search: location.search }, 1));

  return (
    <Pane
      id={ENTRY_PANE_ID}
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
