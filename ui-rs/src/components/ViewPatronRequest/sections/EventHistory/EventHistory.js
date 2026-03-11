import { useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { Accordion, AccordionSet, Card } from '@folio/stripes/components';
import EventHistoryRow from './EventHistoryRow';
import css from './EventHistory.css';

const EventHistory = ({ record }) => {
  const location = useLocation();
  const scrollToEventHistory = location?.state?.scrollToEventHistory;

  const scrollRef = (node) => {
    if (scrollToEventHistory && node) {
      node.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  const {
    data: events = [],
    isLoading,
    isSuccess,
  } = useOkapiQuery(
    `broker/patron_requests/${record.id}/events`,
    {
      enabled: !!record?.id,
      parseResponse: false,
      staleTime: 2 * 60 * 1000,
      notifyOnChangeProps: 'tracked',
    }
  );

  // TODO: Remove once broker fixes StructToMap to flatten Go embedded structs.
  // Wire shape is currently { CommonEventData: { action, incomingMessage, ... }, customData: {...} }
  // but should be flat: { action, incomingMessage, ..., customData: {...} }
  const flattenPayload = (data) => {
    if (!data) return {};
    const { CommonEventData, ...rest } = data;
    return { ...CommonEventData, ...rest };
  };
  const normalizeEvent = (event) => ({
    ...event,
    eventData: flattenPayload(event.eventData),
    resultData: flattenPayload(event.resultData),
  });

  const eventList = Array.isArray(events) ? [...events].reverse().map(normalizeEvent) : [];

  let content;
  if (isLoading) {
    content = <FormattedMessage id="ui-rs.eventHistory.loading" />;
  } else if (isSuccess && eventList.length === 0) {
    content = <FormattedMessage id="ui-rs.eventHistory.empty" />;
  } else {
    content = (
      <AccordionSet>
        {eventList.map((event) => (
          <EventHistoryRow key={event.id} event={event} />
        ))}
      </AccordionSet>
    );
  }

  return (
    <div ref={scrollRef}>
      <Accordion label={<FormattedMessage id="ui-rs.information.heading.eventHistory" />}>
        <Card
          id="event-history-card"
          headerStart={<FormattedMessage id="ui-rs.reverseChronological" />}
          roundedBorder
          cardClass={css.eventCard}
          headerClass={css.eventCardHeader}
        >
          {content}
        </Card>
      </Accordion>
    </div>
  );
};

export default EventHistory;
