import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';
import PatronRequests from '../components/PatronRequests';

const PER_PAGE = 100;

const PatronRequestsRoute = ({ appName, children }) => {
  const ky = useOkapiKy();

  const prQuery = useInfiniteQuery(
    {
      queryKey: ['broker/patron_requests', `@projectreshare/${appName}`],
      queryFn: ({ pageParam = 0 }) => {
        const params = new URLSearchParams();
        params.append('limit', PER_PAGE);
        params.append('offset', pageParam);
        params.append('side', appName === 'supply' ? 'lending' : 'borrowing');
        return ky(`broker/patron_requests?${params.toString()}`).json();
      },
      useErrorBoundary: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  return (
    <PatronRequests
      requestsQuery={prQuery}
      perPage={PER_PAGE}
    >
      {children}
    </PatronRequests>
  );
};

export default PatronRequestsRoute;
