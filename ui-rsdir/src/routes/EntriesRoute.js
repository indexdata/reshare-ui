import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';

import { useOkapiKy } from '@folio/stripes/core';
import { SearchAndSortQuery, makeQueryFunction } from '@folio/stripes/smart-components';

import Entries from '../components/Entries';

const PER_PAGE = 100;

const EntriesRoute = ({ children }) => {
  const ky = useOkapiKy();
  const location = useLocation();

  // Read query params from URL (SearchAndSortQuery manages the URL, we just read it)
  const urlParams = queryString.parse(location.search);
  const queryParams = {
    query: urlParams.query || '',
    qindex: urlParams.qindex || '',
    filters: '',
    sort: ''
  };

  const queryTemplates = {
    // When qindex is empty string (All fields)
    '': '(name="*%{query.query}*" or description="*%{query.query}*")',
    'name': 'name="*%{query.query}*"',
  };

  const selectedTemplate = queryTemplates[queryParams.qindex] || queryTemplates[''];

  // Create CQL query builder using makeQueryFunction with selected template
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',  // fallback when no search/filters
    selectedTemplate,
    {},  // sortMap (empty for now)
    [],  // filterConfig (empty for now)
    0,   // don't fail on empty query
  );
  const cql = getCQL(queryParams, {}, { query: queryParams }, console);

  const entriesQuery = useInfiniteQuery(
    {
      queryKey: ['rsdir/entries', cql, '@projectreshare/rsdir'],
      queryFn: ({ pageParam = 0 }) => {
        const params = new URLSearchParams();
        if (cql) params.append('q', cql);
        params.append('limit', PER_PAGE);
        params.append('offset', pageParam);
        const url = `rsdir/entries?${params.toString()}`;
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
          perPage={PER_PAGE}
        >
          {children}
        </Entries>
      )}
    </SearchAndSortQuery>
  );
};

export default EntriesRoute;
