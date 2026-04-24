import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, useIntl } from 'react-intl';
import classNames from 'classnames';

import { Layout, MessageBanner } from '@folio/stripes/components';

import ChatMessageHeader from './ChatMessageHeader';
import css from './ChatMessage.css';
import MessageDropdown from './MessageDropdown';

const ChatMessage = React.forwardRef((props, ref) => {
  const { notification } = props;
  const intl = useIntl();
  const read = notification?.seen;

  const cardClass = notification?.isSender
    ? null
    : (read ? css.read : css.unread);

  const renderConditionSummary = () => {
    if (notification?.kind !== 'condition') return null;
    const conditionLabel = notification.condition && intl.formatMessage({
      id: `ui-rs.settings.customiseListSelect.loanConditions.${notification.condition.toLowerCase()}`,
      defaultMessage: notification.condition,
    });
    return (
      <div className={css.actionText}>
        {conditionLabel && <FormattedMessage id="ui-rs.view.chatMessage.conditionSummary" values={{ condition: conditionLabel }} />}
        {conditionLabel && notification.cost != null && ' · '}
        {notification.cost != null && `${notification.cost}${notification.currency ? ` ${notification.currency}` : ''}`}
      </div>
    );
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
          {renderConditionSummary()}
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

ChatMessage.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.string,
    messageContent: PropTypes.string,
    timestamp: PropTypes.number,
    seen: PropTypes.bool,
    isSender: PropTypes.bool,
    sendFailed: PropTypes.bool,
    senderSymbol: PropTypes.string,
    receiverSymbol: PropTypes.string,
    kind: PropTypes.string,
    condition: PropTypes.string,
    cost: PropTypes.number,
    currency: PropTypes.string,
  }),
  handleMessageRead: PropTypes.func,
};

export default ChatMessage;
