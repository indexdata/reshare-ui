import { useMutation, useQueryClient } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

const useNotificationList = (request) => {
  return useOkapiQuery(
    `broker/patron_requests/${request?.id}/notifications`,
    {
      searchParams: { side: request?.side },
      staleTime: 30 * 1000,
      enabled: Boolean(request?.id && request?.side),
    }
  );
};

const unseenFromItems = (items) => (items || []).filter(
  (n) => n.direction === 'received' && n.receipt !== 'SEEN'
);

const useUnseenCount = (request) => {
  const { data } = useNotificationList(request);
  return unseenFromItems(data?.items).length;
};

const useNotificationMutations = (request) => {
  const ky = useOkapiKy();
  const queryClient = useQueryClient();
  const path = `broker/patron_requests/${request?.id}/notifications`;

  const invalidate = () => queryClient.invalidateQueries(path);
  const putSeenReceipt = (notificationId) => ky.put(
    `broker/patron_requests/${request.id}/notifications/${notificationId}/receipt`,
    { json: { receipt: 'SEEN' } }
  );

  const post = useMutation(async ({ note }) => {
    await ky.post(`broker/patron_requests/${request.id}/notifications`, {
      json: { note },
    }).json();
    invalidate();
  });

  const markSeen = useMutation(async (notificationId) => {
    await putSeenReceipt(notificationId);
    invalidate();
  });

  const markSeenMany = useMutation(async (notificationIds = []) => {
    const ids = [...new Set(notificationIds)].filter(Boolean);
    if (ids.length === 0) return;
    await Promise.all(ids.map((notificationId) => putSeenReceipt(notificationId)));
  });

  return { post, markSeen, markSeenMany };
};

export { useNotificationList, useUnseenCount, useNotificationMutations };
