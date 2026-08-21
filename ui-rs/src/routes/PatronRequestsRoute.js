import React, { useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { Redirect, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useOkapiKy, useOkapiQuery } from '@projectreshare/stripes-reshare';
import PatronRequests from '../components/PatronRequests';
import { ServiceType, ServiceLevel } from '../constants/iso18626';
import { buildPatronRequestsCql, buildFacetOptionsCql, DEFAULT_SEARCH } from '../util/buildPatronRequestsCql';

const PER_PAGE = 100;

// The meaningful peer axis is the opposite side: in the request (borrowing) app you
// filter by who is supplying you; in the supply (lending) app, by who is requesting.
const PEER_FACET = {
  request: { filterName: 'supplier', symbolField: 'supplier_symbol', nameField: 'supplier_name' },
  supply: { filterName: 'requester', symbolField: 'requester_symbol', nameField: 'requester_name' },
};

// Selected values for one filter group, read straight off the URL.
const selectedFilterValues = (location, filterName) => {
  const filters = queryString.parse(location.search).filters || '';
  const prefix = `${filterName}.`;
  return filters
    .split(',')
    .filter((pair) => pair.startsWith(prefix))
    .map((pair) => pair.slice(prefix.length));
};

const PatronRequestsQueries = ({ appName, children }) => {
  const intl = useIntl();
  const ky = useOkapiKy();
  const location = useLocation();
  const side = appName === 'supply' ? 'lending' : 'borrowing';
  const stateSide = appName === 'supply' ? 'SUPPLIER' : 'REQUESTER';

  const cql = buildPatronRequestsCql(location);

  const { filterName: peerFilterName, symbolField, nameField } = PEER_FACET[appName];
  const selectedPeers = selectedFilterValues(location, peerFilterName);

  // Typeahead text for the peer facet, which narrows the options query server-side (the
  // debounce is MultiSelection's, see Filters). The filter subtree is keyed on
  // location.search, so any search or filter change remounts the input empty; the term is
  // stamped with the location it was typed at and dropped when that no longer matches, so
  // it can't go on narrowing off text nothing on screen shows. Setting state during render
  // is the React-blessed way to do this; the stale render is discarded before commit.
  const [peer, setPeer] = useState({ search: location.search, term: '' });
  if (peer.search !== location.search) setPeer({ search: location.search, term: '' });
  const trimmedTerm = peer.term.trim();
  // location.search here is the one this render closed over, not the current one:
  // MultiSelection captures the callback at mount, so a debounced call landing after a
  // navigation stamps the old location and the check above discards it.
  const setPeerTerm = (term) => setPeer((current) => {
    // Bail out unchanged: MultiSelection re-reports the same term on every render, and a
    // fresh object each time would loop through the debounce forever.
    if (current.search === location.search && current.term === term) return current;
    return { search: location.search, term };
  });

  const prQuery = useInfiniteQuery(
    {
      queryKey: ['broker/patron_requests', `@projectreshare/${appName}`, cql],
      queryFn: ({ pageParam = 0 }) => {
        const params = new URLSearchParams();
        params.append('limit', PER_PAGE);
        params.append('offset', pageParam);
        params.append('side', side);
        if (cql) params.append('cql', cql);
        return ky(`broker/patron_requests?${params.toString()}`).json();
      },
      // Surface query failures (e.g. malformed CQL) inline via MessageBanner rather
      // than crashing into the error boundary.
      useErrorBoundary: false,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // The peer option list, narrowed by the typeahead term when there is one. Keyed (via
  // useOkapiQuery's searchParams) on the CQL, so react-query's cache does the bookkeeping:
  // each term is its own entry, and clearing the term or selecting a peer returns to the
  // untyped entry already in cache rather than refetching.
  // useOkapiQuery (not raw ky) so a failed facet load hits the error boundary: an
  // unreachable facet service means the broker is down, not a facet with no values.
  const facetCql = buildFacetOptionsCql(
    location,
    peerFilterName,
    { nameField, symbolField, term: trimmedTerm },
  );
  const peerFacetQuery = useOkapiQuery(
    'broker/patron_requests',
    {
      searchParams: { limit: 0, side, facets: symbolField, ...(facetCql ? { cql: facetCql } : {}) },
      // Hold the previous key's rows while the next request is in flight. MultiSelection
      // renders its empty message and its spinner off the same `renderedItems.length === 0`
      // (MultiSelectOptionsList), so an empty list mid-request would read as "no matches".
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  );

  const stateModelQuery = useOkapiQuery('broker/state_model/models/default', {
    staleTime: 30 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
  });

  const facetValues = peerFacetQuery.data?.about?.facets
    ?.find((f) => f.name === symbolField)?.values || [];

  // Facet row -> option. `value` stays the raw symbol (URL/CQL state); `label` is the
  // unambiguous display string. Every active selection missing from the current source
  // (ranked beyond the server's top-N, or a narrowed-away value) is appended so its
  // chip still renders.
  const peerOptions = facetValues.map((row) => {
    const name = row.label ?? '';
    const symbol = row.value;
    const label = name ? `${name} (${symbol})` : `(${symbol})`;
    return { value: symbol, name, symbol, label, count: row.count };
  });
  const knownSymbols = new Set(peerOptions.map((o) => o.value));
  selectedPeers
    .filter((v) => !knownSymbols.has(v))
    .forEach((v) => peerOptions.push({ value: v, name: '', symbol: v, label: `(${v})` }));

  const filterOptions = {
    needsAttention: [{ label: intl.formatMessage({ id: 'ui-rs.needsAttention' }), value: 'true' }],
    hasCost: [{ label: intl.formatMessage({ id: 'ui-rs.hasCost' }), value: 'true' }],
    hasInternalNote: [{ label: intl.formatMessage({ id: 'ui-rs.hasInternalNote' }), value: 'true' }],
    hasUnread: [{ label: intl.formatMessage({ id: 'ui-rs.unread' }), value: 'true' }],
    terminal: [{ label: intl.formatMessage({ id: 'ui-rs.hideComplete' }), value: 'false' }],
    serviceType: ServiceType.map(v => ({ label: intl.formatMessage({ id: `ui-rs.information.serviceType.${v}` }), value: v })),
    serviceLevel: ServiceLevel.map(v => ({ label: intl.formatMessage({ id: `ui-rs.refdata.serviceLevel.${v}` }), value: v })),
    state: (stateModelQuery.data?.states || [])
      .filter(s => s.side === stateSide)
      .map(s => ({ label: s.display, value: s.name })),
    [peerFilterName]: peerOptions,
  };

  return (
    <PatronRequests
      requestsQuery={prQuery}
      perPage={PER_PAGE}
      filterOptions={filterOptions}
      peerFacet={{
        name: peerFilterName,
        ready: peerFacetQuery.isSuccess,
        loading: peerFacetQuery.isFetching,
        onType: setPeerTerm,
      }}
    >
      {children}
    </PatronRequests>
  );
};

const PatronRequestsRoute = ({ appName, children }) => {
  const location = useLocation();

  // Normalize the clean URL before the queries mount, so no unfiltered list and facet
  // fetch goes out only to be discarded a tick later.
  if (!location.search) {
    return <Redirect to={`${location.pathname}${DEFAULT_SEARCH}`} />;
  }

  return <PatronRequestsQueries appName={appName}>{children}</PatronRequestsQueries>;
};

export default PatronRequestsRoute;
