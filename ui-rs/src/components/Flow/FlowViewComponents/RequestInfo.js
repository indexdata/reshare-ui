import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Accordion, Col, Headline, KeyValue, Layout, NoValue, Row } from '@folio/stripes/components';

import formatCosts from '#/util/formatCosts';
import { findAgreedCost, formatConditionCost } from '#/util/formatCondition';
import { findMatchingTier } from '#/util/tiers';
import { useTiers } from '#/util/useOwnedEntries';
import { useNotificationList } from '../../chat/useNotifications';
import DueDate from '../../DueDate';

const RequestInfo = ({ request }) => {
  const intl = useIntl();
  const illRequest = request?.illRequest || {};
  const serviceInfo = illRequest?.serviceInfo || {};
  const bibliographicInfo = illRequest?.bibliographicInfo || {};

  const colKeyVal = (labelId, value, xs = 3) => {
    return (
      <Col xs={xs}>
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

  // Without a matching tier the level is shown instead. Cost is the maximum,
  // superseded by an accepted condition; a free tier sends none, so shows its zero.
  const { tiers, isSettled: tiersSettled } = useTiers();
  const tier = findMatchingTier(illRequest, tiers);
  const freeTier = tier?.cost === 0
    ? formatCosts({ monetaryValue: '0.00', currencyCode: { '#text': tier.currency } })
    : undefined;
  const cost = (agreedCost !== undefined ? formatConditionCost(agreedCost) : undefined)
    ?? maximumCost
    ?? freeTier;

  const onLoan = ['Loaned', 'Overdue', 'Recalled'].includes(request?.illResponse?.statusInfo?.status);

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
              ? <FormattedMessage id={`stripes-reshare.iso18626.ServiceType.${serviceType}`} defaultMessage={serviceType} />
              : <NoValue />
          )}
        </Row>
        {tiersSettled &&
          <Row>
            {tier
              ? colKeyVal('ui-rs.information.tier', tier.name, 6)
              : serviceLevel !== undefined && colKeyVal(
                'ui-rs.information.serviceLevel',
                <FormattedMessage id={`stripes-reshare.iso18626.ServiceLevel.${serviceLevel}`} defaultMessage={serviceLevel} />
              )}
            {cost !== undefined && colKeyVal('ui-rs.information.cost', cost)}
          </Row>
        }
        <Row>
          {colKeyVal(
            'ui-rs.flow.info.dueDate',
            (request.dueDate && <DueDate value={request.dueDate} />)
              || (onLoan && <FormattedMessage id="ui-rs.flow.info.dueDate.openEnded" />)
              || <NoValue />
          )}
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
