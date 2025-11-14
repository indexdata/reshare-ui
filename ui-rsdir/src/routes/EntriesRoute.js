import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';

import { useOkapiKy } from '@folio/stripes/core';
import { SearchAndSortQuery, makeQueryFunction } from '@folio/stripes/smart-components';

import Entries from '../components/Entries';

const EntriesRoute = ({ children }) => {
  const ky = useOkapiKy();
  const location = useLocation();

  // Create CQL query builder using makeQueryFunction
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',  // fallback when no search/filters
    '(name="*%{query.query}*" or description="*%{query.query}*")',  // search template for entries
    {},  // sortMap (empty for now)
    [],  // filterConfig (empty for now)
    0,   // don't fail on empty query
  );

  // Read query params from URL (SearchAndSortQuery manages the URL, we just read it)
  const urlParams = queryString.parse(location.search);
  const queryParams = { query: urlParams.query || '', filters: '', sort: '' };
  const cql = getCQL(queryParams, {}, { query: queryParams }, console);

  const entriesQuery = useInfiniteQuery(
    {
      queryKey: ['rsdir/entries', cql, '@projectreshare/rsdir'],
      queryFn: ({ pageParam = 0 }) => {
        const url = cql ? `rsdir/entries?q=${encodeURIComponent(cql)}` : 'rsdir/entries';
        return ky(url).json();
      },
      useErrorBoundary: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  if (!entriesQuery.isSuccess) {
    return null;
  }

  return (
    <SearchAndSortQuery
      initialSearchState={{ query: '' }}
    >
      {({
        searchValue,
        getSearchHandlers,
        onSubmitSearch,
        activeFilters,
        getFilterHandlers,
        resetAll,
        searchChanged,
      }) => (
        <Entries
          entriesQuery={entriesQuery}
          searchValue={searchValue}
          getSearchHandlers={getSearchHandlers}
          onSubmitSearch={onSubmitSearch}
          activeFilters={activeFilters}
          getFilterHandlers={getFilterHandlers}
          resetAll={resetAll}
          searchChanged={searchChanged}
        >
          {children}
        </Entries>
      )}
    </SearchAndSortQuery>
  );
};

export default EntriesRoute;
