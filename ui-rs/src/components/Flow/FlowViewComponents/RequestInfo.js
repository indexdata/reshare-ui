import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Col, FormattedUTCDate, Headline, KeyValue, Layout, NoValue, Row } from '@folio/stripes/components';

import formatCosts from '../../../util/formatCosts';
import { findAgreedCost, formatConditionCost } from '../../../util/formatCondition';
import { useNotificationList } from '../../chat/useNotifications';

const RequestInfo = ({ request }) => {
  const intl = useIntl();
  const illRequest = request?.illRequest || {};
  const serviceInfo = illRequest?.serviceInfo || {};
  const bibliographicInfo = illRequest?.bibliographicInfo || {};

  const colKeyVal = (labelId, value) => {
    return (
      <Col xs={3}>
        <KeyValue
          label={<FormattedMessage id={labelId} />}
          value={value}
        />
      </Col>
    );
  };

  const { serviceType } = serviceInfo;
  const serviceLevel = serviceInfo.serviceLevel?.['#text'];
  const maximumCost = formatCosts(illRequest.billingInfo?.maximumCosts);

  // Shares its query key with the chat badge ViewRoute already fetches.
  const { data: notifications } = useNotificationList(request?.id);
  const agreedCost = findAgreedCost(notifications?.items, request?.supplierSymbol);

  // The supplier's side of the exchange, as the last ISO 18626 response.
  const { statusInfo, deliveryInfo } = request?.illResponse ?? {};

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
        {`${intl.formatMessage({ id: 'ui-rs.flow.info.updated' }, { date: intl.formatDate(request.updatedAt) })} `}
        <Link to={{
          pathname: location?.pathname?.replace('flow', 'details'),
          search: location?.search,
          state: {
            scrollToEventHistory: true
          }
        }}
        >
          <FormattedMessage id="ui-rs.flow.info.viewAuditLog" />
        </Link>
      </Layout>
      <Layout className="padding-top-gutter">
        <Row>
          {colKeyVal('ui-rs.flow.info.requester', request.requesterSymbol || <NoValue />)}
          {colKeyVal('ui-rs.flow.info.supplier', request.supplierSymbol || <NoValue />)}
          {colKeyVal('ui-rs.flow.info.volumesNeeded', bibliographicInfo.volume || <NoValue />)}
          {colKeyVal(
            'ui-rs.information.serviceType',
            serviceType
              ? <FormattedMessage id={`ui-rs.information.serviceType.${serviceType}`} defaultMessage={serviceType} />
              : <NoValue />
          )}
        </Row>
        <Row>
          {serviceLevel !== undefined && colKeyVal(
            'ui-rs.information.serviceLevel',
            <FormattedMessage id={`ui-rs.refdata.serviceLevel.${serviceLevel}`} defaultMessage={serviceLevel} />
          )}
          {maximumCost !== undefined && colKeyVal('ui-rs.information.maximumCost', maximumCost)}
          {agreedCost !== undefined && colKeyVal('ui-rs.information.cost', formatConditionCost(agreedCost))}
        </Row>
        <Row>
          {colKeyVal(
            'ui-rs.flow.info.dueDate',
            statusInfo?.dueDate ? <FormattedUTCDate value={statusInfo.dueDate} /> : <NoValue />
          )}
          {colKeyVal('ui-rs.flow.info.itemBarcode', deliveryInfo?.itemId || <NoValue />)}
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
          {request.internalNote &&
            <Col xs={6}>
              <KeyValue
                label={<FormattedMessage id="ui-rs.information.internalNote" />}
                value={request.internalNote}
              />
            </Col>
          }
        </Row>
      </Layout>
    </Accordion>
  );
};

export default RequestInfo;
