import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Icon, SearchField } from '@folio/stripes/components';

const defaultSearchableIndexes = [
  { label: 'allFields', value: '' },
  { label: 'name', value: 'name' },
];

const SearchAndFilter = ({
  resetAll,
  searchHandlers,
  searchValue,
  searchChanged,
  searchableIndexes = defaultSearchableIndexes,
}) => {
  const intl = useIntl();

  const indexes = searchableIndexes.map(x => ({
    label: intl.formatMessage({ id: `ui-rsdir.index.${x.label}` }),
    value: x.value,
  }));

  return (
    <>
      <SearchField
        autoFocus
        name="query"
        indexName="qindex"
        onChange={searchHandlers.query}
        onClear={searchHandlers.reset}
        searchableIndexes={indexes}
        selectedIndex={searchValue.qindex}
        onChangeIndex={searchHandlers.query}
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
        disabled={!searchChanged}
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

export default SearchAndFilter;
