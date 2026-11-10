import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';

import { SearchAndSortQuery, makeQueryFunction } from '@folio/stripes/smart-components';
import { useOkapiQuery } from '@projectreshare/stripes-reshare';

import Entries from '../components/Entries';

const PER_PAGE = 100;
// makeQueryFunction logs every query it builds to the logger it is given.
const silentLogger = { log: () => {} };
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
  const history = useHistory();
  const location = useLocation();
  const urlParams = queryString.parse(location.search);
  const needsFilterNormalization = urlParams.filters === undefined;
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
  const cql = getCQL(queryParams, {}, { query: queryParams }, silentLogger);

  // One query per page, keyed on its offset, so a revisited page comes from the cache and
  // a refetch reloads only the page on screen. A search change resets the offset during
  // render so no render pairs the new search with the old page.
  const [paging, setPaging] = useState({ cql, offset: 0 });
  if (paging.cql !== cql) setPaging({ cql, offset: 0 });
  const offset = paging.cql === cql ? paging.offset : 0;
  const setOffset = (next) => setPaging({ cql, offset: next });

  const entriesQuery = useOkapiQuery('directory/entries', {
    searchParams: { ...(cql ? { cql } : {}), limit: PER_PAGE, offset },
    enabled: !needsFilterNormalization,
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // The pager moves to the new offset only once that page has loaded.
  const [shownOffset, setShownOffset] = useState(offset);
  if (entriesQuery.isSuccess && !entriesQuery.isPreviousData && shownOffset !== offset) setShownOffset(offset);

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
          entriesQuery={entriesQuery}
          offset={shownOffset}
          onPageChange={setOffset}
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
