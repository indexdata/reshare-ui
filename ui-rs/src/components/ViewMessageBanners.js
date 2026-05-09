import React from 'react';
import { FormattedMessage } from 'react-intl';
import { MessageBanner } from '@folio/stripes/components';
import { useStripes } from '@folio/stripes/core';
import { useNotificationList } from './chat/useNotifications';

const ViewMessageBanners = ({ request }) => {
  const stripes = useStripes();
  const { data } = useNotificationList(request?.id);

  const lastCostStates = ['RES_COPY_AWAIT_PICKING', 'RES_AWAIT_SHIP'];
  const lastChanceForCost = stripes.config?.reshare?.useTiers && stripes.config?.reshare?.showCost && lastCostStates.includes(request?.state?.code);

  const relevantConditions = (data?.items || [])
    .filter(n => n.kind === 'condition' && n.fromSymbol === request?.supplierSymbol);
  const pendingConditions = relevantConditions.filter(n => n.receipt !== 'ACCEPTED' && n.receipt !== 'REJECTED');
  const acceptedConditions = relevantConditions.filter(n => n.receipt === 'ACCEPTED');

  const cancellationRequested = request?.state?.code === 'RES_CANCEL_REQUEST_RECEIVED';

  const dueTooSoon = request.parsedDueDateRS
    && request?.state?.code === 'RES_AWAIT_SHIP'
    && new Date(request.parsedDueDateRS) - Date.now() < 1000 * 60 * 60 * 24 * 7;

  const renderConditionsBanner = () => {
    if (pendingConditions.length > 0) {
      return (
        <MessageBanner type="warning">
          <FormattedMessage id="ui-rs.actions.requestPendingLoanConditions" />
        </MessageBanner>
      );
    } else if (acceptedConditions.length > 0) {
      return (
        <MessageBanner type="success">
          <FormattedMessage id="ui-rs.actions.requestAcceptedLoanConditions" />
        </MessageBanner>
      );
    }
    return null;
  };

  return (
    <>
      {cancellationRequested &&
        <MessageBanner type="warning">
          <FormattedMessage id="ui-rs.actions.requesterRequestedCancellation" />
        </MessageBanner>
      }
      {dueTooSoon &&
        <MessageBanner type="warning">
          <FormattedMessage id="ui-rs.actions.checkIn.dueTooSoon" />
        </MessageBanner>
      }
      {lastChanceForCost &&
        <MessageBanner type="warning">
          <FormattedMessage id="ui-rs.view.banners.lastChanceCost" />
        </MessageBanner>
      }
      {renderConditionsBanner()}
    </>
  );
};

export default ViewMessageBanners;
