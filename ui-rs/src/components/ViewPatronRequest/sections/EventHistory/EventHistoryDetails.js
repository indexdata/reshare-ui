import { FormattedMessage } from 'react-intl';
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github as githubStyle } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import XmlBeautify from 'xml-beautify';
import { Accordion, AccordionSet, Col, KeyValue, Row } from '@folio/stripes/components';
import formattedDateTime from '../../../../util/formattedDateTime';

const formatPayloadString = (txt) => {
  if (!txt) return null;
  if (typeof txt === 'object') {
    return (
      <SyntaxHighlighter language="json" style={githubStyle} wrapLongLines>
        {JSON.stringify(txt, null, 2)}
      </SyntaxHighlighter>
    );
  }
  if (txt.startsWith('<')) {
    const formatted = new XmlBeautify().beautify(txt);
    return <SyntaxHighlighter language="xml" style={githubStyle} wrapLongLines>{formatted}</SyntaxHighlighter>;
  }
  if (txt.startsWith('{')) {
    try {
      const formatted = JSON.stringify(JSON.parse(txt), null, 2);
      return <SyntaxHighlighter language="json" style={githubStyle} wrapLongLines>{formatted}</SyntaxHighlighter>;
    } catch (e) {
      // fall through
    }
  }
  return <pre>{txt}</pre>;
};

const PayloadAccordion = ({ labelId, value }) => {
  if (!value) return null;
  return (
    <Accordion label={<FormattedMessage id={labelId} />}>
      {formatPayloadString(value)}
    </Accordion>
  );
};

const formatError = (err) => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (err.Message) {
    return err.Cause ? `${err.Message}: ${err.Cause}` : err.Message;
  }
  return JSON.stringify(err, null, 2);
};

const EventHistoryDetails = ({ event }) => {
  const { eventData = {}, resultData = {} } = event;

  const customData = eventData.customData || {};
  const resultCustomData = resultData.customData || {};
  const lmsOutgoing = customData.lmsOutgoingMessage || resultCustomData.lmsOutgoingMessage;
  const lmsIncoming = customData.lmsIncomingMessage || resultCustomData.lmsIncomingMessage;

  const isoIncoming = eventData.incomingMessage || resultData.incomingMessage;
  const isoOutgoing = eventData.outgoingMessage || resultData.outgoingMessage;

  const eventError = resultData.eventError || eventData.eventError;
  const problem = resultData.problem || eventData.problem;
  const note = resultData.note;

  const payloads = [
    ['ui-rs.eventHistory.isoIncoming', isoIncoming],
    ['ui-rs.eventHistory.isoOutgoing', isoOutgoing],
    ['ui-rs.eventHistory.lmsIncoming', lmsIncoming],
    ['ui-rs.eventHistory.lmsOutgoing', lmsOutgoing],
  ].filter(([, v]) => v);

  return (
    <div>
      {/* 1. Metadata */}
      <h4><FormattedMessage id="ui-rs.eventHistory.metadata" /></h4>
      <Row>
        <Col xs={2}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.eventHistory.timestamp" />}
            value={formattedDateTime(event.timestamp)}
          />
        </Col>
        <Col xs={2}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.eventHistory.eventName" />}
            value={event.eventName}
          />
        </Col>
        <Col xs={1}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.eventHistory.eventType" />}
            value={event.eventType}
          />
        </Col>
        <Col xs={1}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.eventHistory.eventStatus" />}
            value={event.eventStatus}
          />
        </Col>
        <Col xs={3}>
          <KeyValue
            label={<FormattedMessage id="ui-rs.eventHistory.eventId" />}
            value={event.id}
          />
        </Col>
        {event.parentID && (
          <Col xs={2}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.eventHistory.parentId" />}
              value={event.parentID}
            />
          </Col>
        )}
      </Row>

      {/* 2. Problem / Error */}
      {eventError && (
        <div>
          <h4><FormattedMessage id="ui-rs.eventHistory.error" /></h4>
          <pre style={{ textWrap: 'wrap' }}>{formatError(eventError)}</pre>
        </div>
      )}
      {problem && (
        <div>
          <h4><FormattedMessage id="ui-rs.eventHistory.problem" /></h4>
          <pre style={{ textWrap: 'wrap' }}>{formatError(problem)}</pre>
        </div>
      )}
      {note && !eventError && !problem && (
        <KeyValue
          label={<FormattedMessage id="ui-rs.eventHistory.note" />}
          value={note}
        />
      )}

      {/* 3. Action Info */}
      {event.eventName === 'invoke-action' && eventData.action && (
        <KeyValue
          label={<FormattedMessage id="ui-rs.eventHistory.action" />}
          value={eventData.action}
        />
      )}

      {/* 4. Message Payloads (open accordions) */}
      {payloads.length > 0 && (
        <AccordionSet>
          {payloads.map(([labelId, value]) => (
            <PayloadAccordion key={labelId} labelId={labelId} value={value} />
          ))}
        </AccordionSet>
      )}

      {/* 5. Raw Event (closed accordion) */}
      <AccordionSet>
        <Accordion
          closedByDefault
          label={<FormattedMessage id="ui-rs.eventHistory.rawEvent" />}
        >
          <SyntaxHighlighter language="json" style={githubStyle} wrapLongLines>
            {JSON.stringify(event, null, 2)}
          </SyntaxHighlighter>
        </Accordion>
      </AccordionSet>
    </div>
  );
};

export default EventHistoryDetails;
