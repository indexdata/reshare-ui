import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Card, SearchField } from '@folio/stripes/components';
import EventLogRow from './EventLogRow';
import css from './EventLog.css';

// Shared broker event log. The filter searches the same JSON shown in each
// entry's raw-data accordion.
const EventLog = ({
  events = [],
  cardId,
  header,
  emptyMessageId = 'ui-rs.eventHistory.empty',
  children,
}) => {
  const intl = useIntl();
  const [query, setQuery] = useState('');

  // Avoid serializing every event again on each keystroke.
  const searchable = useMemo(
    () => events.map((event) => [event, JSON.stringify(event, null, 2).toLowerCase()]),
    [events]
  );
  const filterQuery = query.trim().toLowerCase();
  const visible = filterQuery
    ? searchable.filter(([, json]) => json.includes(filterQuery)).map(([event]) => event)
    : events;

  let content;
  if (events.length === 0) {
    content = <FormattedMessage id={emptyMessageId} />;
  } else if (visible.length === 0) {
    content = <FormattedMessage id="ui-rs.eventLog.noMatches" />;
  } else {
    content = (
      <div className={css.entryList}>
        {visible.map((event) => (
          <EventLogRow key={event.id} event={event} filterQuery={filterQuery} />
        ))}
      </div>
    );
  }

  const label = intl.formatMessage({ id: 'ui-rs.eventLog.filter' });
  const filter = events.length > 0 && (
    <div className={css.filter}>
      {filterQuery && (
        <span className={css.filterCount}>
          <FormattedMessage
            id="ui-rs.eventLog.matchCount"
            values={{ count: visible.length, total: events.length }}
          />
        </span>
      )}
      <SearchField
        id={`${cardId}-filter`}
        ariaLabel={label}
        placeholder={label}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        marginBottom0
      />
    </div>
  );

  return (
    <Card
      id={cardId}
      headerStart={header}
      headerEnd={filter}
      roundedBorder
      cardClass={css.eventCard}
      headerClass={css.eventCardHeader}
    >
      {children}
      {children && <div className={css.summaryDivider} />}
      {content}
    </Card>
  );
};

export default EventLog;
