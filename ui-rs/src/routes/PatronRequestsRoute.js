import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useOkapiKy } from '@folio/stripes/core';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';
import PatronRequests from '../components/PatronRequests';
import { ServiceType, ServiceLevel } from '../constants/iso18626';
import { buildPatronRequestsCql } from '../util/buildPatronRequestsCql';

const PER_PAGE = 100;

const PatronRequestsRoute = ({ appName, children }) => {
  const intl = useIntl();
  const ky = useOkapiKy();
  const location = useLocation();
  const side = appName === 'supply' ? 'lending' : 'borrowing';
  const stateSide = appName === 'supply' ? 'SUPPLIER' : 'REQUESTER';

  const cql = buildPatronRequestsCql(location);

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
