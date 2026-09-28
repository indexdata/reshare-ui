/**
 * The query keys a patron request occupies, and which requests an event names.
 *
 * Keys match element by element, so `broker/patron_requests` reaches the list
 * variants and none of the per-request queries: those are named one by one.
 */

const LIST_KEY = 'broker/patron_requests';
const RECORD_PREFIX = `${LIST_KEY}/`;
const SUPPLIERS_KEY = 'broker/located_suppliers';
const TRANSACTIONS_KEY = 'broker/ill_transactions';

const requestKeys = (id) => ({
  record: `${RECORD_PREFIX}${id}`,
  actions: `${RECORD_PREFIX}${id}/actions`,
  events: `${RECORD_PREFIX}${id}/events`,
  notifications: `${RECORD_PREFIX}${id}/notifications`,
  // Not a sub-resource but a search, so a key with params rather than a path.
  suppliers: [SUPPLIERS_KEY, { requester_req_id: id }],
  // Likewise the broker's transaction, which carries its own event log.
  transaction: [TRANSACTIONS_KEY, { requester_req_id: id }],
});

// The transaction's events are keyed by its id, which only a cached lookup
// holds. With no lookup cached there is no transaction log to refresh.
const transactionEventsKeys = (id, queryClient) => {
  const txnIds = queryClient.getQueryCache().findAll(requestKeys(id).transaction)
    .map(query => query.state.data?.items?.[0]?.id)
    .filter(Boolean);
  return [...new Set(txnIds)].map(txnId => `${TRANSACTIONS_KEY}/${txnId}/events`);
};

// Extra elements carry search params and options (see useOkapiQuery); the path
// is always first.
const keyPath = (queryKey) => (Array.isArray(queryKey) ? queryKey[0] : queryKey);

const isRequestKey = (queryKey) => {
  const path = keyPath(queryKey);
  return typeof path === 'string' && path.startsWith(RECORD_PREFIX);
};

const isTransactionKey = (queryKey) => {
  const path = keyPath(queryKey);
  return typeof path === 'string' && path.startsWith(TRANSACTIONS_KEY);
};

const isNotificationsKey = (queryKey) => isRequestKey(queryKey) &&
  keyPath(queryKey).endsWith('/notifications');

// The request itself, not a sub-resource, so `state.data` is the record.
const isRecordKey = (queryKey) => isRequestKey(queryKey) &&
  !keyPath(queryKey).slice(RECORD_PREFIX.length).includes('/');

const recordId = (queryKey) => keyPath(queryKey).slice(RECORD_PREFIX.length);

const eventHeader = (payload) => {
  const message = payload?.data;
  return message?.supplyingAgencyMessage?.header ?? message?.requestingAgencyMessage?.header;
};

/**
 * Resolves an event's agency request ids to local patron-request ids.
 *
 * The local id comes from the query key, so it is available before the record
 * loads. When available, cached `requesterRequestId` covers lending messages
 * that do not include `supplyingAgencyRequestId`.
 */
const requestIdsForEvent = (payload, queryClient) => {
  const header = eventHeader(payload);
  if (!header) return [];
  const peerIds = new Set(
    [header.requestingAgencyRequestId, header.supplyingAgencyRequestId].filter(Boolean)
  );
  if (!peerIds.size) return [];
  const ids = queryClient.getQueryCache().findAll()
    .filter(query => isRecordKey(query.queryKey))
    .filter(query => peerIds.has(recordId(query.queryKey)) ||
      peerIds.has(query.state.data?.requesterRequestId))
    .map(query => recordId(query.queryKey));
  // Query-key variants can refer to the same request.
  return [...new Set(ids)];
};

export {
  LIST_KEY,
  SUPPLIERS_KEY,
  isNotificationsKey,
  isRequestKey,
  isTransactionKey,
  keyPath,
  requestIdsForEvent,
  requestKeys,
  transactionEventsKeys,
};
