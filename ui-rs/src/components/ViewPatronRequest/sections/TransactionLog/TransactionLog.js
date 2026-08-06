import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import { Accordion, Col, KeyValue, Loading, Row } from '@folio/stripes/components';
import EventLog from '../../../EventLog';
import formattedDateTime from '../../../../util/formattedDateTime';

// The transaction and its events are fetched lazily when the accordion opens.
// The broker exposes transactions only to the requesting tenant, so this
// section is limited to borrowing requests.
const TransactionLog = ({ record = {} }) => {
  const requesterRequestId = record.requesterRequestId;
  const [opened, setOpened] = useState(false);

  const txnQuery = useOkapiQuery('broker/ill_transactions', {
    searchParams: { requester_req_id: requesterRequestId },
    enabled: opened && !!requesterRequestId,
    staleTime: 2 * 60 * 1000,
    useErrorBoundary: false,
    notifyOnChangeProps: 'tracked',
  });
  const transaction = Array.isArray(txnQuery.data?.items) ? txnQuery.data.items[0] : undefined;

  // Fetch events after the transaction lookup supplies its id.
  const eventsQuery = useOkapiQuery(`broker/ill_transactions/${transaction?.id}/events`, {
    enabled: opened && !!transaction?.id,
    staleTime: 2 * 60 * 1000,
    useErrorBoundary: false,
    notifyOnChangeProps: 'tracked',
  });
  const events = (Array.isArray(eventsQuery.data?.items) ? eventsQuery.data.items : [])
    .slice()
    .reverse();

  const handleToggle = ({ open }) => {
    if (open) setOpened(true);
  };

  // Keep the hook order stable if navigation changes the request side.
  if (record.side !== 'borrowing') return null;

  // Do not render the card until both dependent queries have resolved.
  let body = <Loading />;
  if (txnQuery.isError || eventsQuery.isError) {
    body = <FormattedMessage id="ui-rs.transactionLog.error" />;
  } else if (!requesterRequestId || (txnQuery.isSuccess && !transaction)) {
    body = <FormattedMessage id="ui-rs.transactionLog.noTransaction" />;
  } else if (transaction && eventsQuery.isSuccess) {
    body = (
      <EventLog
        key={transaction.id}
        cardId="transaction-log-card"
        header={transaction.id}
        events={events}
        emptyMessageId="ui-rs.transactionLog.empty"
      >
        <Row>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.timestamp" />}
              value={transaction.timestamp ? formattedDateTime(transaction.timestamp) : ''}
            />
          </Col>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.requesterSymbol" />}
              value={transaction.requesterSymbol}
            />
          </Col>
          <Col xs={4}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.supplierSymbol" />}
              value={transaction.supplierSymbol}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.requesterRequestId" />}
              value={transaction.requesterRequestID}
            />
          </Col>
          <Col xs={6}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.supplierRequestId" />}
              value={transaction.supplierRequestID}
            />
          </Col>
        </Row>
        <Row>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.lastRequesterAction" />}
              value={transaction.lastRequesterAction}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.prevRequesterAction" />}
              value={transaction.prevRequesterAction}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.lastSupplierStatus" />}
              value={transaction.lastSupplierStatus}
            />
          </Col>
          <Col xs={3}>
            <KeyValue
              label={<FormattedMessage id="ui-rs.transactionLog.prevSupplierStatus" />}
              value={transaction.prevSupplierStatus}
            />
          </Col>
        </Row>
      </EventLog>
    );
  }

  return (
    <Accordion
      id="transaction-log"
      closedByDefault
      label={<FormattedMessage id="ui-rs.information.heading.transactionLog" />}
      onClickToggle={handleToggle}
    >
      {body}
    </Accordion>
  );
};

export default TransactionLog;
