import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import queryString from 'query-string';
import { LoadingPane, Pane, PaneMenu } from '@folio/stripes/components';
import { upNLevels } from '@projectreshare/stripes-reshare';
import EntrySections, { sectionAt } from './EntrySections';
import SettingsSearch, { SETTINGS_QUERY_PARAM, SettingsNoMatch } from './SettingsSearch';
import useEffectiveSections from '../hooks/useEffectiveSections';
import { matchedCards, matchSettings, queryWords, settingsIndex } from '../util/settingsIndex';
import css from './EntryPane.css';

// Match the entry URL independently of the current section route.
const ENTRY_PATH = '/directory/entries/:id';

// Reuse the ID so Paneset restores resized widths when a section remounts.
export const ENTRY_PANE_ID = 'entry-pane';

// Keep space for the entry pane while its data loads.
export const EntryLoadingPane = () => <LoadingPane id={ENTRY_PANE_ID} />;

// Function children receive { shownFields, searchWords }.
// Undefined shownFields means all cards are visible.
const EntryPane = ({ entry, actions, children, ...paneProps }) => {
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const { url: entryUrl } = useRouteMatch(ENTRY_PATH);
  const section = sectionAt(location.pathname, entryUrl);

  const query = queryString.parse(location.search)[SETTINGS_QUERY_PARAM] || '';
  const searchWords = queryWords(query, intl.locale);
  const { sections } = useEffectiveSections(entry);
  const index = useMemo(() => settingsIndex(sections, entry, intl), [sections, entry, intl]);
  const cards = useMemo(() => matchedCards(matchSettings(index, query, intl.locale)), [index, query, intl.locale]);
  const searchable = sections.filter(row => row.fieldMap);
  const counts = Object.fromEntries(searchable.map(row => [row.segment, cards[row.configKey]?.length || 0]));
  const configRow = sections.find(row => row.segment === section.segment);
  const isSearchable = Boolean(configRow?.fieldMap);
  const sectionCards = isSearchable ? cards[configRow.configKey] || [] : undefined;
  const isFiltered = isSearchable && searchWords.length > 0;
  const shownFields = isFiltered ? sectionCards : undefined;
  const setQuery = value => {
    const params = queryString.parse(location.search);
    if (value) params[SETTINGS_QUERY_PARAM] = value;
    else delete params[SETTINGS_QUERY_PARAM];
    history.replace({ pathname: location.pathname, search: queryString.stringify(params) });
  };

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
        <div className={css.section}>
          {isFiltered && sectionCards.length === 0 && <SettingsNoMatch query={query} />}
          {typeof children === 'function' ? children({ shownFields, searchWords }) : children}
        </div>
        <div className={css.sections}>
          <SettingsSearch count={sectionCards?.length} onChange={setQuery} query={query} />
          <EntrySections entryUrl={entryUrl} effectiveSections={sections} active={section} counts={searchWords.length > 0 ? counts : undefined} />
        </div>
      </div>
    </Pane>
  );
};

export default EntryPane;
