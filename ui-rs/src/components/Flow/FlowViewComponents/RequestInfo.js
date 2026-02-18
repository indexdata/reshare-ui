import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Col, Headline, KeyValue, Layout, NoValue, Row } from '@folio/stripes/components';

const RequestInfo = ({ request }) => {
  const intl = useIntl();
  const illRequest = request?.illRequest || {};
  const serviceInfo = illRequest?.serviceInfo || {};
  const bibliographicInfo = illRequest?.bibliographicInfo || {};

  const colKeyVal = (labelId, value) => {
    return (
      <Col xs={3}>
        <KeyValue
          label={<FormattedMessage id={`ui-rs.flow.info.${labelId}`} />}
          value={value}
        />
      </Col>
    );
  };

  const location = useLocation();
  const [showStateCode, setShowStateCode] = useState(false);

  return (
    <Accordion
      id="requestInfo"
      label={<FormattedMessage id="ui-rs.flow.sections.requestInfo" />}
    >
      <Layout className="padding-top-gutter" onClick={e => (e.altKey || e.ctrlKey || e.shiftKey) && setShowStateCode(true)}>
        <Headline margin="none" size="large">
          <FormattedMessage id={`stripes-reshare.states.${request.state}`} defaultMessage={request.state} />
          {showStateCode && <span> ({request.state})</span>}
        </Headline>
        {`${intl.formatMessage({ id: 'ui-rs.flow.info.updated' }, { date: intl.formatDate(request.timestamp) })} `}
        <Link to={{
          pathname: location?.pathname?.replace('flow', 'details'),
          search: location?.search,
          state: {
            scrollToAuditTrail: true
          }
        }}
        >
          <FormattedMessage id="ui-rs.flow.info.viewAuditLog" />
        </Link>
      </Layout>
      <Layout className="padding-top-gutter">
        <Row>
          {colKeyVal('requester', request.requesterSymbol || <NoValue />)}
          {colKeyVal('supplier', request.supplierSymbol || <NoValue />)}
          {colKeyVal('volumesNeeded', bibliographicInfo.volume || <NoValue />)}
        </Row>
        <Row>
          {serviceInfo.note &&
            <Col xs={6}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.information.notes" />}
                value={serviceInfo.note}
              />
            </Col>
          }
        </Row>
      </Layout>
    </Accordion>
  );
};

export default RequestInfo;
