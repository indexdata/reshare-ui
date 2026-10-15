import React, { useEffect, useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';

import { useOkapiKy } from '@folio/stripes/core';
import { SearchAndSortQuery, makeQueryFunction } from '@folio/stripes/smart-components';

import Entries from '../components/Entries';

const PER_PAGE = 100;
const FILTER_CONFIG = [{
  name: 'type',
  cql: 'type',
  values: ['Consortium', 'Institution', 'Branch'],
  operator: '==',
},
{
  name: 'isPickupLocation',
  cql: 'isPickupLocation',
  values: ['true'],
  restrictWhenAllSelected: true,
  parse: values => `isPickupLocation=${values[0]}`,
},
];

const EntriesRoute = ({ children }) => {
  const ky = useOkapiKy();
  const history = useHistory();
  const location = useLocation();
  const [initializingFilters, setInitializingFilters] = useState(
    () => !queryString.parse(location.search).filters
  );

  useEffect(() => {
    if (initializingFilters) {
      const params = queryString.parse(location.search);
      if (Object.prototype.hasOwnProperty.call(params, 'filters')) {
        // An explicit empty value means all types. Remove it before the filter
        // parser can turn it into an empty-name filter.
        delete params.filters;
      } else {
        params.filters = 'type.Institution';
      }
      history.replace({
        ...location,
        search: queryString.stringify(params),
      });
      setInitializingFilters(false);
    }
  }, [history, location, initializingFilters]);

  // Read query params from URL (SearchAndSortQuery manages the URL, we just read it)
  const urlParams = queryString.parse(location.search);
  const queryParams = {
    query: urlParams.query || '',
    // Use our index-specific templates rather than makeQueryFunction's index shortcut.
    qindex: '',
    filters: urlParams.filters || '',
    sort: ''
  };

  const queryTemplates = {
    // When qindex is empty string (All fields)
    '': 'cql.serverChoice="%{query.query}"',
    'name': 'name="*%{query.query}*"',
    'description': 'description="*%{query.query}*"',
    'symbol': 'symbol="%{query.query}"',
  };

  const selectedTemplate = queryTemplates[urlParams.qindex] || queryTemplates[''];

  // Create CQL query builder using makeQueryFunction with selected template
  const getCQL = makeQueryFunction(
    'cql.allRecords=1',  // fallback when no search/filters
    selectedTemplate,
    {},  // sortMap (empty for now)
    FILTER_CONFIG,
    0,   // don't fail on empty query
    undefined,
    { rightTrunc: false, escape: true },
  );
  const cql = getCQL(queryParams, {}, { query: queryParams }, console);

  const entriesQuery = useInfiniteQuery(
    {
      queryKey: ['directory/entries', cql, '@projectreshare/rsdir'],
      enabled: !initializingFilters,
      queryFn: ({ pageParam = 0 }) => {
        const params = new URLSearchParams();
        if (cql) params.append('cql', cql);
        params.append('limit', PER_PAGE);
        params.append('offset', pageParam);
        const url = `directory/entries?${params.toString()}`;
        return ky(url).json();
      },
      useErrorBoundary: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // Mount the controls after the URL default is available to SearchAndSortQuery.
  if (initializingFilters) return null;

  return (
    <SearchAndSortQuery
      initialSearchState={{ query: '', qindex: '' }}
      searchParamsMapping={{
        query: value => ({ query: value }),
        qindex: value => ({ qindex: value }),
      }}
    >
      {({
        searchValue,
        getSearchHandlers,
        onSubmitSearch,
        activeFilters,
        getFilterHandlers,
        resetAll,
      }) => (
        <Entries
          searchQuery={cql || ''}
          entriesQuery={entriesQuery}
          searchValue={searchValue}
          getSearchHandlers={getSearchHandlers}
          onSubmitSearch={onSubmitSearch}
          activeFilters={activeFilters}
          getFilterHandlers={getFilterHandlers}
          resetAll={resetAll}
          perPage={PER_PAGE}
        >
          {children}
        </Entries>
      )}
    </SearchAndSortQuery>
  );
};

export default EntriesRoute;
