import { FormattedMessage } from 'react-intl';
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import XmlBeautify from 'xml-beautify';
import { Accordion, AccordionSet, KeyValue, Layout } from '@folio/stripes/components';
import formattedDateTime from '../../util/formattedDateTime';
import formatError from './formatError';
import css from './EventLog.css';

const githubStyle = { ...github, hljs: { ...github.hljs, background: 'transparent' } };

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

const EventLogDetails = ({ event, filterQuery }) => {
  const { eventData = {}, resultData = {} } = event;

  // lineProps receives a usable line number only when line numbers are shown.
  const rawJson = JSON.stringify(event, null, 2);
  const rawLines = rawJson.split('\n');
  const matchLineProps = (lineNumber) => (
    rawLines[lineNumber - 1]?.toLowerCase().includes(filterQuery)
      ? { className: css.matchLine }
      : {}
  );

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

  const metadata = [
    ['timestamp', 'ui-rs.eventHistory.timestamp', formattedDateTime(event.timestamp)],
    ['eventName', 'ui-rs.eventHistory.eventName', event.eventName],
    ['eventType', 'ui-rs.eventHistory.eventType', event.eventType],
    ['eventStatus', 'ui-rs.eventHistory.eventStatus', event.eventStatus],
    ['eventId', 'ui-rs.eventHistory.eventId', event.id],
    event.parentID && ['parentId', 'ui-rs.eventHistory.parentId', event.parentID],
    eventData.user && ['actor', 'ui-rs.eventHistory.actor', eventData.user],
  ].filter(Boolean);

  return (
    <>
      {/* Metadata */}
      <Layout
        className="display-flex flex-wrap--wrap flex-align-items-start"
        style={{ columnGap: 'var(--gutter)' }}
      >
        {metadata.map(([key, labelId, value]) => (
          <KeyValue
            key={key}
            label={<FormattedMessage id={labelId} />}
            value={value}
          />
        ))}
      </Layout>

      {/* Errors and notes */}
      {eventError && (
        <div>
          <h4><FormattedMessage id="ui-rs.eventHistory.error" /></h4>
          <pre style={{ textWrap: 'wrap' }}>{formatError(eventError, true)}</pre>
        </div>
      )}
      {problem && (
        <div>
          <h4><FormattedMessage id="ui-rs.eventHistory.problem" /></h4>
          <pre style={{ textWrap: 'wrap' }}>{formatError(problem, true)}</pre>
        </div>
      )}
      {note && !eventError && !problem && (
        <KeyValue
          label={<FormattedMessage id="ui-rs.eventHistory.note" />}
          value={note}
        />
      )}

      {/* Action */}
      {event.eventName === 'invoke-action' && eventData.action && (
        <KeyValue
          label={<FormattedMessage id="ui-rs.eventHistory.action" />}
          value={eventData.action}
        />
      )}

      {/* Message payloads */}
      {payloads.length > 0 && (
        <AccordionSet>
          {payloads.map(([labelId, value]) => (
            <PayloadAccordion key={labelId} labelId={labelId} value={value} />
          ))}
        </AccordionSet>
      )}

      {/* Raw event */}
      <AccordionSet>
        <Accordion
          closedByDefault
          label={<FormattedMessage id="ui-rs.eventHistory.rawEvent" />}
        >
          <SyntaxHighlighter
            language="json"
            style={githubStyle}
            wrapLongLines
            showLineNumbers
            lineNumberStyle={{ color: '#707070' }}
            lineProps={filterQuery ? matchLineProps : undefined}
          >
            {rawJson}
          </SyntaxHighlighter>
        </Accordion>
      </AccordionSet>
    </>
  );
};

export default EventLogDetails;
