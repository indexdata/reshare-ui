import { makeQueryFunction } from '@folio/stripes/smart-components';
import queryString from 'query-string';

export const MAX_RECORDS_PER_PDF = 100;

export const filterConfig = [
  { name: 'state', cql: 'state', values: [] },
  { name: 'needsAttention', cql: 'needs_attention', operator: '=', values: [] },
  { name: 'hasCost', cql: 'has_cost', operator: '=', values: [] },
  { name: 'hasUnread', cql: 'has_unread_notification', operator: '=', values: [] },
  { name: 'terminal', cql: 'terminal_state', operator: '=', values: [] },
  { name: 'serviceType', cql: 'service_type', operator: '=', values: [] },
  { name: 'serviceLevel', cql: 'service_level', operator: '=', values: [] },
  { name: 'createdAt', cql: 'created_at', parse: (values) => values.join(' and '), values: [] },
  { name: 'neededAt', cql: 'needed_at', parse: (values) => values.join(' and '), values: [] },
];

export const sortMap = {
  dateCreated: 'created_at',
  lastUpdated: 'updated_at',
  neededAt: 'needed_at',
  title: 'title',
  patron: 'patron',
  state: 'state',
  serviceType: 'service_type',
  requesterSymbol: 'requester_symbol',
  supplierSymbol: 'supplier_symbol',
  hrid: 'requester_req_id',
};

export const buildPatronRequestsCql = (location) => {
  const urlParams = queryString.parse(location.search);
  const queryParams = {
    query: urlParams.query || '',
    qindex: urlParams.qindex || '',
    filters: urlParams.filters || '',
    sort: urlParams.sort || '',
  };
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',
    'cql.serverChoice="%{query.query}"',
    sortMap,
    filterConfig,
    0,
    undefined,
    { rightTrunc: false, escape: true },
  );
  return getCQL(queryParams, {}, { query: queryParams }, console);
};

