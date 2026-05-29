import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Icon, SearchField } from '@folio/stripes/components';

const Search = ({ resetAll, searchHandlers, searchValue, searchChanged, filterChanged }) => {
  const intl = useIntl();
  const searchableIndexes = [
    { label: 'allFields', value: '' },
    { label: 'hrid', value: 'requester_req_id' },
    { label: 'title', value: 'title' },
    { label: 'author', value: 'author' },
    { label: 'isbn', value: 'isbn' },
    { label: 'issn', value: 'issn' },
    { label: 'requesterIdentifier', value: 'patron' },
  ].map(x => ({
    label: intl.formatMessage({ id: `ui-rs.index.${x.label}` }),
    value: x.value,
  }));

  return (
    <>
      <SearchField
        autoFocus
        indexName="qindex"
        name="query"
        onChange={searchHandlers.query}
        onChangeIndex={searchHandlers.query}
        onClear={searchHandlers.reset}
        searchableIndexes={searchableIndexes}
        selectedIndex={searchValue.qindex || ''}
        value={searchValue.query}
      />
      <Button
        buttonStyle="primary"
        disabled={!searchValue.query || searchValue.query === ''}
        fullWidth
        type="submit"
      >
        <FormattedMessage id="stripes-smart-components.search" />
      </Button>
      <Button
        buttonStyle="none"
        disabled={!(filterChanged || searchChanged)}
        id="clickable-reset-all"
        fullWidth
        onClick={resetAll}
      >
        <Icon icon="times-circle-solid">
          <FormattedMessage id="stripes-smart-components.resetAll" />
        </Icon>
      </Button>
    </>
  );
};

export default Search;
