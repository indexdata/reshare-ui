import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { FormattedMessage, useIntl } from 'react-intl';

import { Button, Layout, Pane, Spinner, TextArea } from '@folio/stripes/components';
import { useIntlCallout } from '@projectreshare/stripes-reshare';
import { ChatMessage } from './components';
import css from './ChatPane.css';
import { useInvalidateNotifications, useNotificationList, useNotificationMutations } from './useNotifications';

const ENTER_KEY = 'Enter';
const AUTO_MARK_SEEN_DELAY_MS = 1500;

const normalise = (n) => ({
  id: n.id,
  messageContent: n.note ?? '',
  timestamp: n.createdAt ? new Date(n.createdAt).getTime() : 0,
  isSender: n.direction === 'sent',
  seen: n.direction === 'sent' ? true : n.receipt === 'SEEN',
  sendFailed: n.receipt === 'FAILED_TO_SEND',
  senderSymbol: n.fromSymbol,
  receiverSymbol: n.toSymbol,
  kind: n.kind,
  condition: n.condition,
  cost: n.cost,
  currency: n.currency,
});

const ChatPane = ({ onToggle, request }) => {
  const { id: reqId, side } = request || {};
  const latestMessage = useRef();
  const seenAttemptedIds = useRef(new Set());
  const autoMarkTimeouts = useRef(new Set());
  const intl = useIntl();
  const sendCallout = useIntlCallout();

  const { data, isLoading } = useNotificationList(reqId);
  const { post, markSeen, markSeenMany } = useNotificationMutations(reqId);
  const invalidateNotifications = useInvalidateNotifications(reqId);
  const handleClose = () => { invalidateNotifications(); onToggle(); };
  const markSeenManyMutate = markSeenMany.mutate;

  const notifications = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].map(normalise).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);
  const loadedUnseenIds = useMemo(() => [...new Set(
    notifications
      .filter((notification) => !notification.isSender && !notification.seen && Boolean(notification.id))
      .map((notification) => notification.id)
  )], [notifications]);

  const scrollToLatestMessage = () => {
    latestMessage?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToLatestMessage = () => {
    latestMessage?.current?.scrollIntoView({ block: 'end' });
  };

  useEffect(() => {
    jumpToLatestMessage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [notificationCount, setNotificationCount] = useState(notifications.length);
  useEffect(() => {
    if (notificationCount !== notifications.length) {
      scrollToLatestMessage();
      setNotificationCount(notifications.length);
    }
  }, [notificationCount, notifications.length]);

  useEffect(() => {
    seenAttemptedIds.current = new Set();
    autoMarkTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
    autoMarkTimeouts.current = new Set();

    return () => {
      autoMarkTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
      autoMarkTimeouts.current = new Set();
      seenAttemptedIds.current = new Set();
    };
  }, [reqId, side]);

  useEffect(() => {
    const idsToMark = loadedUnseenIds.filter((id) => !seenAttemptedIds.current.has(id));
    if (idsToMark.length === 0) return;

    idsToMark.forEach((id) => seenAttemptedIds.current.add(id));

    const timeoutId = setTimeout(() => {
      autoMarkTimeouts.current.delete(timeoutId);
      markSeenManyMutate(idsToMark);
    }, AUTO_MARK_SEEN_DELAY_MS);

    autoMarkTimeouts.current.add(timeoutId);
  }, [loadedUnseenIds, markSeenManyMutate]);

  const handleMessageRead = (notification) => {
    if (!notification.seen && !notification.isSender) {
      markSeen.mutate(notification.id);
    }
  };

  const submit = async (payload) => {
    const note = payload?.note?.trim();
    if (!note) return;
    try {
      await post.mutateAsync({ note });
    } catch (e) {
      sendCallout('ui-rs.actions.message.error', 'error');
    }
  };

  const renderPaneFooter = () => (
    <Form
      onSubmit={submit}
      render={({ form, handleSubmit, pristine }) => {
        const onEnterPress = async (e) => {
          if (e.key === ENTER_KEY && e.shiftKey === false) {
            e.preventDefault();
            if (!pristine) {
              await handleSubmit();
              form.reset();
            }
          }
        };
        return (
          <form
            id="chatPaneMessageForm"
            onSubmit={async (event) => {
              await handleSubmit(event);
              form.reset();
            }}
            autoComplete="off"
          >
            <Layout className="flex full">
              <div className={css.messageFieldContainer}>
                <Field
                  className={css.messageField}
                  name="note"
                  component={TextArea}
                  onKeyDown={onEnterPress}
                  autoFocus
                  placeholder={intl.formatMessage(
                    { id: 'ui-rs.view.chatPane.placeholder' },
                    { chatOtherParty: side === 'borrowing' ? 'supplier' : 'requester' }
                  )}
                />
              </div>
              <Button
                buttonClass={css.sendButton}
                buttonStyle="primary"
                onClick={async (event) => {
                  await handleSubmit(event);
                  form.reset();
                }}
                disabled={pristine || post.isLoading}
              >
                <FormattedMessage id="ui-rs.view.chatPane.sendMessage" />
              </Button>
            </Layout>
          </form>
        );
      }}
    />
  );

  const displayMessages = () => {
    if (isLoading) {
      return <Layout className="padding-all-gutter flex centerContent"><Spinner /></Layout>;
    }
    return (
      <div className={css.noTopMargin}>
        {notifications.length === 0 && (
          <Layout className={`padding-all-gutter flex ${css.noMessages}`}>
            <FormattedMessage id="ui-rs.view.chatPane.noMessages" />
          </Layout>
        )}
        {notifications.map((notification, index) => (
          <ChatMessage
            key={notification.id ?? `msg-${index}`}
            notification={notification}
            ref={index === notifications.length - 1 ? latestMessage : null}
            handleMessageRead={handleMessageRead}
          />
        ))}
      </div>
    );
  };

  return (
    <Pane
      defaultWidth="30%"
      dismissible
      onClose={handleClose}
      paneTitle={
        <FormattedMessage
          id="ui-rs.view.chatPane"
          values={{ chatOtherParty: side === 'borrowing' ? 'supplier' : 'requester' }}
        />
      }
      footer={reqId ? renderPaneFooter() : null}
      id="chat-pane"
    >
      {displayMessages()}
    </Pane>
  );
};

export default ChatPane;
