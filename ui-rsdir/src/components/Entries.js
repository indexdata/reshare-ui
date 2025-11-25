import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useRouteMatch, useLocation } from 'react-router-dom';
import {
  Paneset,
  Pane,
  MultiColumnList,
  MCLPagingTypes,
  Button,
  PaneMenu,
} from '@folio/stripes/components';
import SearchAndFilter from './SearchAndFilter';

const Entries = ({
  entriesQuery,
  searchValue,
  getSearchHandlers,
  onSubmitSearch,
  resetAll,
  searchChanged,
  perPage,
  children,
}) => {
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const intl = useIntl();
  const [offset, setOffset] = useState(0);

  const entries = entriesQuery?.data?.pages?.[offset / perPage]?.items || [];
  const sparseEntries = (new Array(offset)).concat(entries);
  const totalCount = entriesQuery?.data?.pages?.[0]?.about?.count || 0;

  const fetchMore = (_askAmount, index) => {
    entriesQuery.fetchNextPage({ pageParam: index });
    setOffset(index);
  };

  const resultsFormatter = {
    name: (entry) => entry.name,
    symbols: (entry) => {
      if (!entry.symbols || entry.symbols.length === 0) return '';
      return entry.symbols
        .map(s => `${s.authority}:${s.symbol}`)
        .join(', ');
    },
  };

  const handleNew = () => {
    history.push(`${match.url}/create${location.search}`);
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
            resetAll={resetAll}
            searchChanged={searchChanged}
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
            <Button
              id="clickable-new-entry"
              onClick={handleNew}
              buttonStyle="primary paneHeaderNewButton"
              marginBottom0
            >
              <FormattedMessage id="ui-rsdir.new" />
            </Button>
          </PaneMenu>
        }
      >
        <MultiColumnList
          autosize
          id="entries-list"
          contentData={sparseEntries}
          visibleColumns={['name', 'symbols']}
          columnMapping={{
            name: intl.formatMessage({ id: 'ui-rsdir.entry.name' }),
            symbols: intl.formatMessage({ id: 'ui-rsdir.entry.symbols' }),
          }}
          formatter={resultsFormatter}
          isEmptyMessage={intl.formatMessage({ id: 'stripes-smart-components.sas.noResults.noTerms' })}
          loading={entriesQuery.isFetching}
          onNeedMoreData={fetchMore}
          onRowClick={(_e, rowData) => history.push(`${match.url}/view/${rowData.id}${location.search}`)}
          pageAmount={perPage}
          pagingType={MCLPagingTypes.PREV_NEXT}
          totalCount={totalCount}
        />
      </Pane>
      {children}
    </Paneset>
  );
};

export default Entries;
