import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Badge, Icon } from '@folio/stripes/components';
import formattedDateTime from '../../util/formattedDateTime';
import formatError from './formatError';
import EventLogDetails from './EventLogDetails';
import css from './EventLog.css';

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
  'invoke-batch-action': 'ui-rs.eventHistory.event.invokeBatchAction',
  'invoke-background-action': 'ui-rs.eventHistory.event.invokeBackgroundAction',
  'patron-request-message': 'ui-rs.eventHistory.event.patronRequestMessage',
  'lms-requester-message': 'ui-rs.eventHistory.event.lmsRequesterMessage',
  'lms-supplier-message': 'ui-rs.eventHistory.event.lmsSupplierMessage',
};

const ACTION_IN_TITLE = ['invoke-action', 'invoke-background-action'];

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
  if (ACTION_IN_TITLE.includes(eventName) && action) {
    return `${base}: ${action}`;
  }
  return base;
};

const getStatusLabel = (intl, status) => {
  const id = STATUS_LABEL_IDS[status];
  return id ? intl.formatMessage({ id }) : status;
};

// Summarize the most substantive ISO 18626 message among an event's payload
// slots, preferring actual messages over their confirmations. Which slot
// (incoming vs outgoing) carries the substantive message varies by event —
// e.g. patron-request-message receives it, message-supplier sends it — so we
// rank by message type across all slots rather than by direction.
const summarizeIso18626 = (fmt, messages) => {
  const present = messages.filter(Boolean);
  if (present.some((m) => m.request)) return fmt('eventHistory.summary.request');
  const ram = present.find((m) => m.requestingAgencyMessage);
  if (ram) return fmt('eventHistory.summary.requesterMessage', { action: ram.requestingAgencyMessage.action || '' });
  const sam = present.find((m) => m.supplyingAgencyMessage);
  if (sam) {
    return fmt('eventHistory.summary.supplierMessage', {
      reason: sam.supplyingAgencyMessage.messageInfo?.reasonForMessage || sam.supplyingAgencyMessage.status || '',
    });
  }
  if (present.some((m) => m.requestConfirmation)) return fmt('eventHistory.summary.requestConfirmation');
  if (present.some((m) => m.requestingAgencyMessageConfirmation)) return fmt('eventHistory.summary.requesterMessageConfirmation');
  if (present.some((m) => m.supplyingAgencyMessageConfirmation)) return fmt('eventHistory.summary.supplierMessageConfirmation');
  return null;
};

const getEventSummary = (intl, event) => {
  const { eventData = {}, resultData = {}, eventStatus } = event;
  const fmt = (id, values) => intl.formatMessage({ id: `ui-rs.${id}` }, values);

  if (eventStatus === 'ERROR' || eventStatus === 'PROBLEM') {
    const err = resultData.eventError || eventData.eventError || resultData.problem || eventData.problem
      || find18626ErrorValue(resultData) || find18626ErrorValue(eventData);
    if (err) return formatError(err);
  }

  const iso = summarizeIso18626(fmt, [
    eventData.incomingMessage, eventData.outgoingMessage,
    resultData.incomingMessage, resultData.outgoingMessage,
  ]);
  if (iso) return iso;

  if (resultData.note) return resultData.note;
  return null;
};

const EventLogRow = ({ event, filterQuery }) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const title = getEventTitle(intl, event);
  const statusLabel = getStatusLabel(intl, event.eventStatus);
  const summary = getEventSummary(intl, event);
  const badgeColor = STATUS_BADGE_COLOR[event.eventStatus] || 'default';
  const actor = event.eventData?.user;
  const bodyId = `event-log-body-${event.id}`;

  return (
    <div className={css.entry}>
      <button
        type="button"
        className={css.entryHeader}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={css.entryCaret}>
          <Icon size="small" icon={open ? 'caret-up' : 'caret-down'} />
        </span>
        <span className={css.entryTitle}>{title}</span>
        <span className={css.entrySummary}>
          {summary}
          {summary && actor && ' · '}
          {actor && (
            <FormattedMessage id="ui-rs.eventHistory.summary.byActor" values={{ actor }} />
          )}
        </span>
        <span className={css.entryTime}>{formattedDateTime(event.timestamp)}</span>
        <Badge color={badgeColor} size="small">
          {statusLabel}
        </Badge>
      </button>
      {open && (
        <div id={bodyId} className={css.entryBody}>
          <EventLogDetails event={event} filterQuery={filterQuery} />
        </div>
      )}
    </div>
  );
};

export default EventLogRow;
