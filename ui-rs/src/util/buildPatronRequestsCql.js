import { makeQueryFunction } from '@folio/stripes/smart-components';
import queryString from 'query-string';

export const MAX_RECORDS_PER_PDF = 100;

export const filterConfig = [
  { name: 'state', cql: 'state', values: [] },
  { name: 'needsAttention', cql: 'needs_attention', operator: '=', values: [] },
  { name: 'hasCost', cql: 'has_cost', operator: '=', values: [] },
  { name: 'hasInternalNote', cql: 'has_internal_note', operator: '=', values: [] },
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

// The "requester_name" index is not a real CQL field. Treat the whole query as a
// surname, unless a comma indicates "Surname, Given" (e.g. "Smith, John"), and emit
// CQL against the real surname/given_name indexes.
const buildRequesterNameCql = (raw) => {
  const commaIdx = raw.indexOf(',');
  if (commaIdx === -1) {
    return `surname="${raw.trim()}"`;
  }
  const surname = raw.slice(0, commaIdx).trim();
  const givenName = raw.slice(commaIdx + 1).trim();
  const clauses = [];
  if (surname) clauses.push(`surname="${surname}"`);
  if (givenName) clauses.push(`given_name="${givenName}"`);
  return clauses.length ? clauses.join(' and ') : `surname="${raw.trim()}"`;
};

export const buildPatronRequestsCql = (location) => {
  const urlParams = queryString.parse(location.search);
  const requesterName = urlParams.qindex === 'requester_name';
  // The "cql" index lets power users type a raw CQL query that we pass through
  // verbatim (filters/sort still compose on top).
  const rawCql = urlParams.qindex === 'cql';
  const queryParams = {
    query: urlParams.query || '',
    // Blank the qindex for our synthetic indexes so makeQueryFunction routes through
    // the function query template below rather than emitting <qindex>="...".
    qindex: (requesterName || rawCql) ? '' : (urlParams.qindex || ''),
    filters: urlParams.filters || '',
    sort: urlParams.sort || '',
  };
  let queryTemplate = 'cql.serverChoice="%{query.query}"';
  if (requesterName) {
    queryTemplate = (_parms, _path, res) => buildRequesterNameCql(res.query.query);
  } else if (rawCql) {
    // Use the original, unescaped query — escapeCqlValue would mangle the user's
    // own quotes/operators.
    queryTemplate = () => (urlParams.query || '');
  }
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',
    queryTemplate,
    sortMap,
    filterConfig,
    0,
    undefined,
    { rightTrunc: false, escape: true },
  );
  return getCQL(queryParams, {}, { query: queryParams }, console);
};

