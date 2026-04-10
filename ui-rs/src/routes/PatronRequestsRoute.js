import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useOkapiKy } from '@folio/stripes/core';
import { makeQueryFunction } from '@folio/stripes/smart-components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import PatronRequests from '../components/PatronRequests';
import { ServiceType, ServiceLevel } from '../constants/iso18626';

const PER_PAGE = 100;

const filterConfig = [
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

const PatronRequestsRoute = ({ appName, children }) => {
  const intl = useIntl();
  const ky = useOkapiKy();
  const location = useLocation();
  const side = appName === 'supply' ? 'lending' : 'borrowing';
  const stateSide = appName === 'supply' ? 'SUPPLIER' : 'REQUESTER';

  // Read query params from URL
  const urlParams = queryString.parse(location.search);
  const queryParams = {
    query: urlParams.query || '',
    qindex: urlParams.qindex || '',
    filters: urlParams.filters || '',
    sort: urlParams.sort || '',
  };

  const sortMap = {
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

  const getCQL = makeQueryFunction(
    'cql.allRecords=1',
    'cql.serverChoice="%{query.query}"',
    sortMap,
    filterConfig,
    0,
    undefined,
    { rightTrunc: false, escape: true },
  );
  const cql = getCQL(queryParams, {}, { query: queryParams }, console);

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
      useErrorBoundary: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  const stateModelQuery = useOkapiQuery('broker/state_model/models/returnables', {
    staleTime: 30 * 60 * 1000,
    cacheTime: 8 * 60 * 60 * 1000,
  });

  const filterOptions = {
    needsAttention: [{ label: intl.formatMessage({ id: 'ui-rs.needsAttention' }), value: 'true' }],
    hasCost: [{ label: intl.formatMessage({ id: 'ui-rs.hasCost' }), value: 'true' }],
    hasUnread: [{ label: intl.formatMessage({ id: 'ui-rs.unread' }), value: 'true' }],
    terminal: [{ label: intl.formatMessage({ id: 'ui-rs.hideComplete' }), value: 'false' }],
    serviceType: ServiceType.map(v => ({ label: intl.formatMessage({ id: `ui-rs.information.serviceType.${v}` }), value: v })),
    serviceLevel: ServiceLevel.map(v => ({ label: intl.formatMessage({ id: `ui-rs.refdata.serviceLevel.${v}` }), value: v })),
    state: (stateModelQuery.data?.states || [])
      .filter(s => s.side === stateSide)
      .map(s => ({ label: s.display, value: s.name })),
  };

  return (
    <PatronRequests
      requestsQuery={prQuery}
      perPage={PER_PAGE}
      filterOptions={filterOptions}
    >
      {children}
    </PatronRequests>
  );
};

export default PatronRequestsRoute;
