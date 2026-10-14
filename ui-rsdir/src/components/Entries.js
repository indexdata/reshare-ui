import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { matchPath, useHistory, useRouteMatch, useLocation } from 'react-router-dom';
import {
  Paneset,
  Pane,
  MultiColumnList,
  MCLPagingTypes,
  Button,
  PaneMenu,
} from '@folio/stripes/components';
import { DirectLink } from '@projectreshare/stripes-reshare';
import SearchAndFilter from './SearchAndFilter';

const Entries = ({
  entriesQuery,
  searchQuery,
  searchValue,
  getSearchHandlers,
  onSubmitSearch,
  activeFilters,
  getFilterHandlers,
  resetAll,
  perPage,
  children,
}) => {
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const intl = useIntl();
  const [pagination, setPagination] = useState({ query: searchQuery, offset: 0 });
  const offset = pagination.query === searchQuery ? pagination.offset : 0;

  useEffect(() => {
    setPagination({ query: searchQuery, offset: 0 });
  }, [searchQuery]);

  const cachedPageAtOffset = pageOffset => {
    const pageIndex = entriesQuery?.data?.pageParams?.findIndex(pageParam => (pageParam ?? 0) === pageOffset);
    return entriesQuery?.data?.pages?.[pageIndex];
  };

  const entries = cachedPageAtOffset(offset)?.items || [];
  const openEntry = matchPath(location.pathname, { path: `${match.path}/:id` })?.params;
  const sparseEntries = (new Array(offset)).concat(entries);
  const totalCount = entriesQuery?.data?.pages?.[0]?.about?.count || 0;

  const fetchMore = (_askAmount, index) => {
    // fetchNextPage appends even if this offset already exists in the cache.
    if (!cachedPageAtOffset(index)) {
      entriesQuery.fetchNextPage({ pageParam: index });
    }
    setPagination({ query: searchQuery, offset: index });
  };

  const resultsFormatter = {
    name: (entry) => entry.name,
    type: (entry) => entry.type,
    symbols: (entry) => {
      if (!entry.symbols || entry.symbols.length === 0) return '';
      return entry.symbols
        .map(s => `${s.authority}:${s.symbol}`)
        .join(', ');
    },
  };

  return (
    <Paneset>
      <Pane
        defaultWidth="20%"
        paneTitle={<FormattedMessage id="stripes-smart-components.searchAndFilter" />}
      >
        <form onSubmit={onSubmitSearch}>
          <SearchAndFilter
            searchHandlers={getSearchHandlers()}
            searchValue={searchValue}
            activeFilters={activeFilters.state}
            filterHandlers={getFilterHandlers()}
            resetAll={resetAll}
          />
        </form>
      </Pane>

      <Pane
        defaultWidth="fill"
        noOverflow
        padContent={false}
        paneTitle={intl.formatMessage({ id: 'ui-rsdir.entries.resultsCount' }, { count: totalCount })}
        lastMenu={
          <PaneMenu>
            <DirectLink
              component={Button}
              id="clickable-new-entry"
              to={`${match.url}/create`}
              preserveSearch
              buttonStyle="primary paneHeaderNewButton"
              marginBottom0
            >
              <FormattedMessage id="ui-rsdir.new" />
            </DirectLink>
          </PaneMenu>
        }
      >
        <MultiColumnList
          key={searchQuery}
          autosize
          id="entries-list"
          contentData={sparseEntries}
          visibleColumns={['name', 'type', 'symbols']}
          columnMapping={{
            name: intl.formatMessage({ id: 'ui-rsdir.entry.name' }),
            type: intl.formatMessage({ id: 'ui-rsdir.entry.type' }),
            symbols: intl.formatMessage({ id: 'ui-rsdir.entry.symbols' }),
          }}
          formatter={resultsFormatter}
          isEmptyMessage={intl.formatMessage({ id: 'stripes-smart-components.sas.noResults.noTerms' })}
          isSelected={({ item, criteria }) => !!criteria && item?.id === criteria.id}
          loading={entriesQuery.isFetching}
          onNeedMoreData={fetchMore}
          onRowClick={(_e, rowData) => history.push(`${match.url}/${rowData.id}${location.search}`)}
          pageAmount={perPage}
          pagingType={MCLPagingTypes.PREV_NEXT}
          selectedRow={openEntry}
          totalCount={totalCount}
        />
      </Pane>
      {children}
    </Paneset>
  );
};

export default Entries;
