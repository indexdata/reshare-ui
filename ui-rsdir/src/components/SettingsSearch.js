import React, { useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, SearchField } from '@folio/stripes/components';
import css from './EntryPane.css';

export const SETTINGS_QUERY_PARAM = 'settingsQuery';

const summary = (query, count) => {
  if (!query.trim()) return null;
  if (count === undefined) return <FormattedMessage id="ui-rsdir.entry.settingsSearch.notHere" />;
  if (count === 0) return <FormattedMessage id="ui-rsdir.entry.settingsSearch.noMatch" />;
  return <FormattedMessage id="ui-rsdir.entry.settingsSearch.summary" values={{ count }} />;
};

// Undefined count means the section is not searched.
const SettingsSearch = ({ query, onChange, count }) => {
  const intl = useIntl();
  const inputRef = useRef();

  return (
    <div className={css.search}>
      <SearchField
        id="entry-settings-search"
        aria-label={intl.formatMessage({ id: 'ui-rsdir.entry.settingsSearch.label' })}
        placeholder={intl.formatMessage({ id: 'ui-rsdir.entry.settingsSearch.label' })}
        inputRef={inputRef}
        onChange={event => onChange(event.target.value)}
        onClear={() => onChange('')}
        value={query}
      />
      <div className={css.searchSummary}>
        <span role="status">{summary(query, count)}</span>
        {query &&
          <Button
            buttonStyle="link"
            id="clickable-clear-settings-search"
            marginBottom0
            onClick={() => {
              // Restore input focus before this button unmounts.
              inputRef.current?.focus();
              onChange('');
            }}
          >
            <FormattedMessage id="ui-rsdir.entry.settingsSearch.clear" />
          </Button>
        }
      </div>
    </div>
  );
};

export const SettingsNoMatch = ({ query }) => (
  <p className={css.noMatch}>
    <FormattedMessage id="ui-rsdir.entry.settingsSearch.noMatchHere" values={{ query }} />
  </p>
);

export default SettingsSearch;
