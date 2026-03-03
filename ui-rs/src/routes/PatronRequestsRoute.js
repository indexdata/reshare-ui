import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useOkapiKy } from '@folio/stripes/core';
import { makeQueryFunction } from '@folio/stripes/smart-components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import PatronRequests from '../components/PatronRequests';

const PER_PAGE = 100;

const filterConfig = [
  { name: 'state', cql: 'state', values: [] },
];

const PatronRequestsRoute = ({ appName, children }) => {
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
    sort: '',
  };

  const queryTemplates = {
    '': 'cql.serverChoice="%{query.query}*"',
    'hrid': 'requester_request_id="%{query.query}*"',
  };

  const selectedTemplate = queryTemplates[queryParams.qindex] || queryTemplates[''];

  const getCQL = makeQueryFunction(
    'cql.allRecords=1',
    selectedTemplate,
    {},
    filterConfig,
    0,
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
