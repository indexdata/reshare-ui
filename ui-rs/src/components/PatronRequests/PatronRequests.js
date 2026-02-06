import React, { useContext, useEffect, useState } from 'react';
import {
  FormattedDate,
  FormattedMessage,
  FormattedTime,
  useIntl
} from 'react-intl';
import { Link, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import queryString from 'query-string';
import {
  Badge,
  Button,
  Icon,
  IconButton,
  Loading,
  LoadingPane,
  MCLPagingTypes,
  MultiColumnList,
  Pane,
  PaneMenu,
} from '@folio/stripes/components';
import { AppIcon, IfPermission, useStripes } from '@folio/stripes/core';
import { SearchAndSortQuery, PersistedPaneset } from '@folio/stripes/smart-components';
import AppNameContext from '../../AppNameContext';
import Filters from './Filters';
import Search from './Search';

const appDetails = {
  request: {
    title: 'Requests',
    visibleColumns: [
      'flags', 'hrid',
      'dateCreated', 'lastUpdated', 'selectedItemBarcode', 'patron', 'state', 'serviceType',
      'supplierSymbol', 'pickupLocation',
      'title',
    ],
    extraFilter: 'r.true',
    intlId: 'supplier',
    institutionFilterId: 'supplier',
    statePrefix: 'REQ',
    createPerm: 'ui-request.create',
  },
  supply: {
    title: 'Supply',
    visibleColumns: [
      'flags', 'hrid',
      'dateCreated', 'lastUpdated', 'state', 'serviceType',
      'requesterSymbol', 'selectedItemBarcode', 'pickLocation',
      'pickShelvingLocation', 'title'
    ],
    extraFilter: 'r.false',
    intlId: 'requester',
    institutionFilterId: 'requester',
    statePrefix: 'RES',
    createPerm: 'ui-supply.create',
  },
};

const PatronRequests = ({ requestsQuery, perPage, children }) => {
  const appName = useContext(AppNameContext);
  const history = useHistory();
  const intl = useIntl();
  const location = useLocation();
  const match = useRouteMatch();
  const stripes = useStripes();
  const [offset, setOffset] = useState(0);

  const pageData = requestsQuery?.data?.pages?.[offset / perPage];
  const requests = Array.isArray(pageData)
    ? pageData
    : pageData?.items || [];
  const sparseRequests = (new Array(offset)).concat(requests);
  const totalCount = requestsQuery?.data?.pages?.[0]?.about?.count || 0;
  const parsedParams = queryString.parse(location.search);
  const sortOrder = parsedParams.sort || '';
  const fetchMore = (_askAmount, index) => {
    requestsQuery.fetchNextPage({ pageParam: index });
    setOffset(index);
  };
  const initialSearch = '?filters=terminal.false&sort=-dateCreated';

  useEffect(() => {
    // Update the search criteria to default if none found in location search
    if (!location.search || location.search === '') {
      history.push(location.pathname + initialSearch);
    }
  });


  const { title, visibleColumns, createPerm } = appDetails[appName];


  return (
    <SearchAndSortQuery
      initialSearch={initialSearch}
      initialSearchState={{ query: '' }}
      key={location.search}
    >
      {
        ({
          onSort,
        }) => (
          <div>
            <PersistedPaneset
              appId={`@projectreshare/${appName}`}
              id="requests"
            >
              {requestsQuery.isSuccess ?
                <Pane
                  appIcon={<AppIcon app={appName} iconKey="app" size="small" />}
                  defaultWidth="fill"
                  firstMenu={(
                    <>
                      {stripes.config?.reshare?.showRefresh &&
                        <PaneMenu>
                          { requestsQuery?.isRefetching ? <Loading /> : <IconButton icon="refresh" onClick={() => requestsQuery?.refetch()} /> }
                        </PaneMenu>
                      }
                    </>
                  )}
                  lastMenu={(
                    <PaneMenu>
                      {(appName === 'request') &&
                        <IfPermission perm={createPerm}>
                          <Button
                            buttonStyle="primary"
                            id="clickable-new-patron-request"
                            marginBottom0
                            to={`requests/create${location.search}`}
                          >
                            <FormattedMessage id="ui-rs.createPatronRequest" />
                          </Button>
                        </IfPermission>
                      }
                    </PaneMenu>
                  )}
                  noOverflow
                  padContent={false}
                  paneSub={requestsQuery?.isSuccess ?
                    <FormattedMessage
                      id="ui-rs.patronrequests.found"
                      values={{ number: totalCount }}
                    /> : ''}
                  paneTitle={title}
                >
                  <MultiColumnList
                    autosize
                    columnMapping={{
                      flags: '',
                      hrid: <FormattedMessage id="ui-rs.patronrequests.id" />,
                      dateCreated: <FormattedMessage id="ui-rs.patronrequests.dateCreated" />,
                      lastUpdated: <FormattedMessage id="ui-rs.patronrequests.lastUpdated" />,
                      title: <FormattedMessage id="ui-rs.patronrequests.title" />,
                      patron: <FormattedMessage id="ui-rs.patronrequests.patronIdentifier" />,
                      state: <FormattedMessage id="ui-rs.patronrequests.state" />,
                      serviceType: <FormattedMessage id="ui-rs.patronrequests.serviceType" />,
                      requesterSymbol: <FormattedMessage id="ui-rs.patronrequests.requestingInstitutionSymbol" />,
                      supplierSymbol: <FormattedMessage id="ui-rs.patronrequests.supplyingInstitutionSymbol" />,
                      selectedItemBarcode: <FormattedMessage id="ui-rs.patronrequests.selectedItemBarcode" />,
                      pickLocation: <FormattedMessage id="ui-rs.patronrequests.pickLocation" />,
                      pickShelvingLocation: <FormattedMessage id="ui-rs.patronrequests.pickShelvingLocation" />,
                      pickupLocation: <FormattedMessage id="ui-rs.patronrequests.pickupLocation" />,
                    }}
                    columnWidths={{
                      flags: '60px',
                      dateCreated: '96px',
                      lastUpdated: '96px',
                      state: { min: 84 },
                      serviceType: { max: 80 },
                      selectedItemBarcode: '130px',
                    }}
                    contentData={sparseRequests}
                    formatter={{
                      hrid: a => a.id,
                      dateCreated: a => (new Date(a.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
                        ? <FormattedTime value={a.timestamp} />
                        : <FormattedDate value={a.timestamp} />),
                      lastUpdated: a => (new Date(a.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
                        ? <FormattedTime value={a.timestamp} />
                        : <FormattedDate value={a.timestamp} />),
                      patron: a => {
                        const p = a.illRequest?.patronInfo;
                        if (p?.givenName && p?.surname) return `${p.surname}, ${p.givenName}`;
                        return p?.surname ?? p?.givenName ?? p?.patronId ?? a.patron;
                      },
                      serviceType: a => a.illRequest?.serviceInfo?.serviceType,
                      title: a => a.illRequest?.bibliographicInfo?.title,
                    }}
                    hasMargin
                    isEmptyMessage={
                      <>
                        <FormattedMessage id="ui-rs.patronrequests.notFound" /><br />
                        {location?.search?.includes('filter') &&
                          <Link to={queryString.exclude(`${location.pathname}${location.search}`, ['filters'])}>
                            <FormattedMessage id="ui-rs.patronrequests.withoutFilter" />
                          </Link>
                        }
                      </>
                    }
                    key={requestsQuery?.dataUpdatedAt}
                    loading={requestsQuery?.isFetching}
                    onHeaderClick={onSort}
                    onNeedMoreData={fetchMore}
                    onRowClick={(_e, rowData) => history.push(`${match.url}/${rowData.id}${location.search}`)}
                    pageAmount={perPage}
                    pagingType={MCLPagingTypes.PREV_NEXT}
                    sortOrder={sortOrder.replace(/^-/, '').replace(/,.*/, '')}
                    sortDirection={sortOrder.startsWith('-') ? 'descending' : 'ascending'}
                    totalCount={totalCount}
                    visibleColumns={visibleColumns}
                  />
                </Pane>
                : <LoadingPane />
              }
              {children}
            </PersistedPaneset>
          </div>
        )
      }
    </SearchAndSortQuery>
  );
};

export default PatronRequests;
