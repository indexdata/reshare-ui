import { useMutation, useQueryClient } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

const notificationListPath = (requestId) => `broker/patron_requests/${requestId}/notifications`;

const useNotificationList = (requestId) => {
  return useOkapiQuery(
    notificationListPath(requestId),
    {
      searchParams: { limit: 1000 },
      staleTime: 30 * 1000,
      enabled: Boolean(requestId),
    }
  );
};

const unseenFromItems = (items) => (items || []).filter(
  (n) => n.direction === 'received' && n.receipt !== 'SEEN'
);

const useNotificationCounts = (requestId) => {
  const { data, isSuccess } = useNotificationList(requestId);
  const notifications = data?.items || [];

  return {
    isSuccess: Boolean(requestId && isSuccess),
    unseen: unseenFromItems(notifications).length,
    total: notifications.length,
  };
};

const useInvalidateNotifications = (requestId) => {
  const queryClient = useQueryClient();

  return () => {
    if (!requestId) return Promise.resolve();
    return queryClient.invalidateQueries(notificationListPath(requestId));
  };
};

const useNotificationMutations = (requestId) => {
  const ky = useOkapiKy();
  const invalidateNotifications = useInvalidateNotifications(requestId);

  const putSeenReceipt = (notificationId) => ky.put(
    `broker/patron_requests/${requestId}/notifications/${notificationId}/receipt`,
    { json: { receipt: 'SEEN' } }
  );

  const post = useMutation(async ({ note }) => {
    await ky.post(notificationListPath(requestId), {
      json: { note },
    }).json();
    invalidateNotifications();
  });

  const markSeen = useMutation(async (notificationId) => {
    await putSeenReceipt(notificationId);
    invalidateNotifications();
  });

  const markSeenMany = useMutation(async (notificationIds = []) => {
    const ids = [...new Set(notificationIds)].filter(Boolean);
    if (ids.length === 0) return;
    await Promise.all(ids.map((notificationId) => putSeenReceipt(notificationId)));
  });

  return { post, markSeen, markSeenMany };
};

export {
  useInvalidateNotifications,
  useNotificationList,
  useNotificationCounts,
  useNotificationMutations,
};
