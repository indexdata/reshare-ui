import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import classNames from 'classnames';

import { Layout, MessageBanner } from '@folio/stripes/components';

import { formatConditionCost, formatNotificationCode } from '#/util/formatCondition';

import ChatMessageHeader from './ChatMessageHeader';
import css from './ChatMessage.css';
import MessageDropdown from './MessageDropdown';

const codeSummaryIds = {
  condition: 'ui-rs.view.chatMessage.conditionSummary',
  cancellation_reason: 'ui-rs.view.chatMessage.cancellationReasonSummary',
  unfilled_reason: 'ui-rs.view.chatMessage.unfilledReasonSummary',
};

const ChatMessage = React.forwardRef((props, ref) => {
  const { notification } = props;
  const intl = useIntl();
  const read = notification?.seen;

  const cardClass = notification?.isSender
    ? null
    : (read ? css.read : css.unread);

  const renderCodeSummary = () => {
    const summaryId = codeSummaryIds[notification?.kind];
    if (!summaryId) return null;
    const codeLabel = formatNotificationCode(notification, intl.formatMessage);
    // Only conditions carry a cost; a cost-only condition is summarised by its cost.
    const costStr = notification.kind === 'condition' ? formatConditionCost(notification) : '';
    if (!codeLabel && !costStr) return null;
    const parts = [
      intl.formatMessage({ id: summaryId }, { code: codeLabel || costStr }),
      codeLabel && costStr,
    ].filter(Boolean);
    return <div className={css.actionText}>{parts.join(' · ')}</div>;
  };

  return (
    <div
      className={classNames(
        css.messageContainer,
        notification?.isSender ? css.sender : css.receiver
      )}
      ref={ref}
    >
      <div className={classNames(cardClass, css.displayFlex)}>
        <div className={css.leftHandSide}>
          <ChatMessageHeader notification={notification} />
          <div className={classNames(css.contents, css.displayFlex)}>
            {notification?.messageContent}
          </div>
          {renderCodeSummary()}
          {notification?.sendFailed && (
            <Layout className="padding-all-gutter">
              <MessageBanner type="error">
                <FormattedMessage id="ui-rs.actions.message.error" values={{ errMsg: '' }} />
              </MessageBanner>
            </Layout>
          )}
        </div>
        <div className={css.rightHandSide}>
          {!notification?.isSender && !notification?.seen && (
            <MessageDropdown
              actionItems={[
                {
                  label: <FormattedMessage id="ui-rs.view.chatMessage.actions.markAsRead" />,
                  onClick: () => props.handleMessageRead(notification),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatMessage;
