import React, { useEffect, useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';

import { useOkapiKy } from '@folio/stripes/core';
import { SearchAndSortQuery, makeQueryFunction } from '@folio/stripes/smart-components';

import Entries from '../components/Entries';

const PER_PAGE = 100;
const FILTER_PARAMS_MAPPING = {
  filters: (value) => (value || '').split(',').filter(Boolean).reduce((filters, token) => {
    const [name, ...parts] = token.split('.');
    if (name) filters[name] = [...(filters[name] || []), parts.join('.')];
    return filters;
  }, {}),
};

const setDirectoryQuery = ({ location, history, nsValues }) => {
  const params = { filters: '', ...queryString.parse(location.search), ...nsValues };
  const pathname = params._path || location.pathname;
  delete params._path;
  // Keep the explicit all-types marker while clearing other empty parameters.
  params.filters = params.filters || '';
  Object.keys(params).forEach(key => {
    if (key !== 'filters' && !params[key]) delete params[key];
  });
  const url = `${pathname}?${queryString.stringify(params)}`;
  if (`${location.pathname}${location.search}` !== url) history.push(url);
};

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
  const urlParams = queryString.parse(location.search);
  const needsFilterNormalization = !Object.prototype.hasOwnProperty.call(urlParams, 'filters');
  const [initializingFilters, setInitializingFilters] = useState(needsFilterNormalization);

  useEffect(() => {
    if (needsFilterNormalization) {
      const params = queryString.parse(location.search);
      params.filters = 'type.Institution';
      history.replace({
        ...location,
        search: queryString.stringify(params),
      });
      setInitializingFilters(false);
    }
  }, [history, location, needsFilterNormalization]);

  // Read query params from URL (SearchAndSortQuery manages the URL, we just read it)
  const queryParams = {
    query: urlParams.query || '',
    // Use our index-specific templates rather than makeQueryFunction's index shortcut.
    qindex: '',
    filters: needsFilterNormalization ? 'type.Institution' : (urlParams.filters || ''),
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
      enabled: !needsFilterNormalization,
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

  // Wait only on initial entry; later normalization must preserve nested drafts.
  if (initializingFilters) return null;

  return (
    <SearchAndSortQuery
      filterParamsMapping={FILTER_PARAMS_MAPPING}
      querySetter={setDirectoryQuery}
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
          entriesQuery={{
            ...entriesQuery,
            fetchNextPage: (...args) => (needsFilterNormalization ? undefined : entriesQuery.fetchNextPage(...args)),
          }}
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
