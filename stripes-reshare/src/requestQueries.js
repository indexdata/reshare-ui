/**
 * The query keys a patron request occupies, and which requests an event names.
 *
 * Keys match element by element, so `broker/patron_requests` reaches the list
 * variants and none of the per-request queries: those are named one by one.
 */

const LIST_KEY = 'broker/patron_requests';
const RECORD_PREFIX = `${LIST_KEY}/`;

const requestKeys = (id) => ({
  record: `${RECORD_PREFIX}${id}`,
  actions: `${RECORD_PREFIX}${id}/actions`,
  events: `${RECORD_PREFIX}${id}/events`,
  notifications: `${RECORD_PREFIX}${id}/notifications`,
});

// Extra elements carry search params and options (see useOkapiQuery); the path
// is always first.
const keyPath = (queryKey) => (Array.isArray(queryKey) ? queryKey[0] : queryKey);

const isRequestKey = (queryKey) => {
  const path = keyPath(queryKey);
  return typeof path === 'string' && path.startsWith(RECORD_PREFIX);
};

const isNotificationsKey = (queryKey) => isRequestKey(queryKey) &&
  keyPath(queryKey).endsWith('/notifications');

// The request itself, not a sub-resource, so `state.data` is the record.
const isRecordKey = (queryKey) => isRequestKey(queryKey) &&
  !keyPath(queryKey).slice(RECORD_PREFIX.length).includes('/');

const eventHeader = (payload) => {
  const message = payload?.data;
  return message?.supplyingAgencyMessage?.header ?? message?.requestingAgencyMessage?.header;
};

/**
 * Which of our requests an event names, as ids we hold.
 *
 * A header carries whichever id the peer keeps: ours when borrowing, the
 * requester's when lending, where our own id is nowhere in the message. Cached
 * records carry both, so the match is made against them, and an event for a
 * request never fetched here yields nothing, there being no entry to mark. A
 * payload naming it in our own terms would be read straight off it instead.
 */
const requestIdsForEvent = (payload, queryClient) => {
  const header = eventHeader(payload);
  if (!header) return [];
  const peerIds = new Set(
    [header.requestingAgencyRequestId, header.supplyingAgencyRequestId].filter(Boolean)
  );
  if (!peerIds.size) return [];
  return queryClient.getQueryCache().findAll()
    .filter(query => isRecordKey(query.queryKey))
    .map(query => query.state.data)
    .filter(record => record?.id && (peerIds.has(record.id) || peerIds.has(record.requesterRequestId)))
    .map(record => record.id);
};

export {
  LIST_KEY,
  isNotificationsKey,
  isRequestKey,
  keyPath,
  requestIdsForEvent,
  requestKeys,
};
