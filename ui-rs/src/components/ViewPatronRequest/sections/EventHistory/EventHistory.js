import { useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { Accordion, Loading } from '@folio/stripes/components';
import EventLog from '../../../EventLog';

const EventHistory = ({ record }) => {
  const location = useLocation();
  const scrollToEventHistory = location?.state?.scrollToEventHistory;

  const scrollRef = (node) => {
    if (scrollToEventHistory && node) {
      node.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  const { data: events = [], isLoading } = useOkapiQuery(
    `broker/patron_requests/${record.id}/events`,
    {
      enabled: !!record?.id,
      staleTime: 2 * 60 * 1000,
      notifyOnChangeProps: 'tracked',
    }
  );

  const eventList = (Array.isArray(events?.items) ? events.items : [])
    .slice()
    .reverse();

  return (
    <div ref={scrollRef}>
      <Accordion label={<FormattedMessage id="ui-rs.information.heading.eventHistory" />}>
        {isLoading ? <Loading /> : (
          <EventLog
            key={record.id}
            cardId="event-history-card"
            header={<FormattedMessage id="ui-rs.reverseChronological" />}
            events={eventList}
            emptyMessageId="ui-rs.eventHistory.empty"
          />
        )}
      </Accordion>
    </div>
  );
};

export default EventHistory;
