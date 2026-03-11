import { useIntl } from 'react-intl';
import { Accordion, Badge, Layout } from '@folio/stripes/components';
import formattedDateTime from '../../../../util/formattedDateTime';
import EventHistoryDetails from './EventHistoryDetails';
import EventHistoryHeader from './EventHistoryHeader';
import css from './EventHistory.css';

const STATUS_BADGE_COLOR = {
  ERROR: 'red',
  PROBLEM: 'red',
  PROCESSING: 'primary',
  NEW: 'default',
  SUCCESS: 'default',
};

const STATUS_LABEL_IDS = {
  NEW: 'ui-rs.eventHistory.status.NEW',
  PROCESSING: 'ui-rs.eventHistory.status.PROCESSING',
  SUCCESS: 'ui-rs.eventHistory.status.SUCCESS',
  PROBLEM: 'ui-rs.eventHistory.status.PROBLEM',
  ERROR: 'ui-rs.eventHistory.status.ERROR',
};

const EVENT_TITLE_IDS = {
  'invoke-action': 'ui-rs.eventHistory.event.invokeAction',
  'patron-request-message': 'ui-rs.eventHistory.event.patronRequestMessage',
  'lms-requester-message': 'ui-rs.eventHistory.event.lmsRequesterMessage',
  'lms-supplier-message': 'ui-rs.eventHistory.event.lmsSupplierMessage',
};

const formatError = (err) => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (err.Message) return err.Cause ? `${err.Message}: ${err.Cause}` : err.Message;
  return JSON.stringify(err);
};

const find18626ErrorValue = (data) => {
  const msg = data?.incomingMessage;
  return msg?.requestConfirmation?.errorData?.errorValue
    ?? msg?.requestingAgencyMessageConfirmation?.errorData?.errorValue
    ?? msg?.supplyingAgencyMessageConfirmation?.errorData?.errorValue
    ?? null;
};

const getEventTitle = (intl, event) => {
  const { eventName, eventData = {} } = event;
  const action = eventData.action;
  const id = EVENT_TITLE_IDS[eventName];
  const base = id ? intl.formatMessage({ id }) : eventName;
  if (eventName === 'invoke-action' && action) {
    return `${base}: ${action}`;
  }
  return base;
};

const getStatusLabel = (intl, status) => {
  const id = STATUS_LABEL_IDS[status];
  return id ? intl.formatMessage({ id }) : status;
};

const getEventSummary = (intl, event) => {
  const { eventName, eventData = {}, resultData = {}, eventStatus } = event;
  const isError = eventStatus === 'ERROR' || eventStatus === 'PROBLEM';
  const fmt = (id, values) => intl.formatMessage({ id: `ui-rs.${id}` }, values);

  switch (eventName) {
    case 'invoke-action': {
      if (isError) {
        const err = resultData.eventError || eventData.eventError || resultData.problem || eventData.problem
          || find18626ErrorValue(resultData) || find18626ErrorValue(eventData);
        if (err) return formatError(err);
      }
      if (resultData.note) return resultData.note;
      return null;
    }
    case 'patron-request-message': {
      const msgs = [eventData.incomingMessage, eventData.outgoingMessage, resultData.incomingMessage, resultData.outgoingMessage];
      for (const msg of msgs) {
        if (!msg) continue;
        if (msg.request) return fmt('eventHistory.summary.request');
        if (msg.requestConfirmation) return fmt('eventHistory.summary.requestConfirmation');
        if (msg.requestingAgencyMessage) {
          return fmt('eventHistory.summary.requesterMessage', { action: msg.requestingAgencyMessage.action || '' });
        }
        if (msg.requestingAgencyMessageConfirmation) return fmt('eventHistory.summary.requesterMessageConfirmation');
        if (msg.supplyingAgencyMessage) {
          return fmt('eventHistory.summary.supplierMessage', { reason: msg.supplyingAgencyMessage.messageInfo?.reasonForMessage || msg.supplyingAgencyMessage.status || '' });
        }
        if (msg.supplyingAgencyMessageConfirmation) return fmt('eventHistory.summary.supplierMessageConfirmation');
      }
      return fmt('eventHistory.summary.patronRequestMessage');
    }
    case 'lms-requester-message':
    case 'lms-supplier-message': {
      if (isError) {
        const err = resultData.eventError || eventData.eventError || resultData.problem || eventData.problem;
        if (err) return formatError(err);
      }
      return null;
    }
    default:
      return fmt('eventHistory.summary.eventRecorded');
  }
};

const EventHistoryRow = ({ event }) => {
  const intl = useIntl();
  const title = getEventTitle(intl, event);
  const statusLabel = getStatusLabel(intl, event.eventStatus);
  const summary = getEventSummary(intl, event);
  const badgeColor = STATUS_BADGE_COLOR[event.eventStatus] || 'default';

  const summaryRow = (
    <>
      {summary && (
        <span className={css.summaryText}>
          {summary}
        </span>
      )}
      <Layout element="span" className="padding-end-gutter">
        {formattedDateTime(event.timestamp)}
      </Layout>
      <Badge color={badgeColor} size="small">
        {statusLabel}
      </Badge>
    </>
  );

  return (
    <Accordion
      closedByDefault
      header={EventHistoryHeader}
      label={title}
      displayWhenClosed={summaryRow}
    >
      <EventHistoryDetails event={event} />
    </Accordion>
  );
};

export default EventHistoryRow;
