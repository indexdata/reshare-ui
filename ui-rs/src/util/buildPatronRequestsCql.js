import { makeQueryFunction } from '@folio/stripes/smart-components';
import queryString from 'query-string';

export const MAX_RECORDS_PER_PDF = 100;

export const DEFAULT_SEARCH = '?filters=terminal.false&sort=-dateCreated';

export const filterConfig = [
  { name: 'state', cql: 'state', values: [] },
  { name: 'needsAttention', cql: 'needs_attention', operator: '=', values: [] },
  { name: 'hasCost', cql: 'has_cost', operator: '=', values: [] },
  { name: 'hasInternalNote', cql: 'has_internal_note', operator: '=', values: [] },
  { name: 'hasUnread', cql: 'has_unread_notification', operator: '=', values: [] },
  { name: 'terminal', cql: 'terminal_state', operator: '=', values: [] },
  { name: 'serviceType', cql: 'service_type', operator: '=', values: [] },
  { name: 'serviceLevel', cql: 'service_level', operator: '=', values: [] },
  { name: 'supplier', cql: 'supplier_symbol', operator: '=', values: [] },
  { name: 'requester', cql: 'requester_symbol', operator: '=', values: [] },
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

const silentLogger = { log: () => {} };

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

export const escapeCqlTerm = (raw) => (raw || '').replace(/[\\"*?^]/g, (ch) => `\\${ch}`);

// Parse the URL into the queryParams makeQueryFunction consumes, plus the matching
// query template. Shared so the facet-options query below applies the exact same
// search-string and synthetic-qindex handling as the main list query.
const queryContextFromLocation = (location) => {
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
  return { queryParams, queryTemplate };
};

const runCql = (queryParams, queryTemplate) => {
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',
    queryTemplate,
    sortMap,
    filterConfig,
    0,
    undefined,
    { rightTrunc: false, escape: true },
  );
  return getCQL(queryParams, {}, { query: queryParams }, silentLogger);
};

// Drop a single filter group (by filterConfig name) from the comma-separated
// `name.value` filters string, leaving every other group intact.
const dropFilterGroup = (filters, excludeName) => (
  (filters || '')
    .split(',')
    .filter((pair) => pair && pair.slice(0, pair.indexOf('.')) !== excludeName)
    .join(',')
);

export const buildPatronRequestsCql = (location) => {
  const { queryParams, queryTemplate } = queryContextFromLocation(location);
  return runCql(queryParams, queryTemplate);
};

// CQL for a facet's option list. Drops the facet's own selection so it never constrains its
// own aggregation — otherwise selecting a value would leave it the only option — while other
// filters and the search query still apply, and drops sort, since only the aggregation is
// read. `narrow` is `{ nameField, symbolField, term }`; a non-empty term becomes a prefix
// match on both fields.
export const buildFacetOptionsCql = (location, excludeName, narrow) => {
  const { queryParams, queryTemplate } = queryContextFromLocation(location);
  const base = runCql(
    { ...queryParams, filters: dropFilterGroup(queryParams.filters, excludeName), sort: '' },
    queryTemplate,
  );
  if (!narrow?.term) return base;
  const term = `${escapeCqlTerm(narrow.term)}*`;
  const clause = `${narrow.nameField} = "${term}" or ${narrow.symbolField} = "${term}"`;
  // makeQueryFunction returns null when there is no search query and no remaining
  // filters; in that case the narrow clause stands alone rather than being `and`-ed
  // onto a literal "null". Otherwise both sides are parenthesised: the base can be a
  // raw user CQL query containing `or`, which an unbracketed `and` would rebind.
  if (!base) return `(${clause})`;
  return `(${base}) and (${clause})`;
};
