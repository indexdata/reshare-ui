import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Checkbox, Icon, SearchField, Select } from '@folio/stripes/components';

const defaultSearchableIndexes = [
  { label: 'allFields', value: '' },
  { label: 'name', value: 'name' },
  { label: 'description', value: 'description' },
  { label: 'symbol', value: 'symbol' },
];

const entryTypeOptions = [
  { label: '', value: '' },
  { label: 'Consortium', value: 'Consortium' },
  { label: 'Institution', value: 'Institution' },
  { label: 'Branch', value: 'Branch' },
];

const SearchAndFilter = ({
  resetAll,
  searchHandlers,
  searchValue,
  activeFilters,
  filterHandlers,
  searchableIndexes = defaultSearchableIndexes,
}) => {
  const intl = useIntl();

  const indexes = searchableIndexes.map(x => ({
    label: intl.formatMessage({ id: `ui-rsdir.index.${x.label}` }),
    value: x.value,
  }));
  const hasActiveFilters = Object.values(activeFilters).some(values => values.some(Boolean));
  const canReset = Boolean(searchValue.query || searchValue.qindex || hasActiveFilters);

  const onChangeType = (event) => {
    const nextFilters = { ...activeFilters };
    if (event.target.value) {
      nextFilters.type = [event.target.value];
    } else {
      delete nextFilters.type;
    }
    filterHandlers.state(nextFilters);
  };

  return (
    <>
      <SearchField
        autoFocus
        name="query"
        indexName="qindex"
        onChange={searchHandlers.query}
        onClear={() => {
          // SearchField emits a native input change after onClear. Reset last so
          // that event cannot restore the previous index from batched state.
          Promise.resolve().then(() => searchHandlers.reset());
        }}
        searchableIndexes={indexes}
        selectedIndex={searchValue.qindex || ''}
        onChangeIndex={searchHandlers.query}
        value={searchValue.query || ''}
      />
      <Checkbox
        name="isPickupLocation.true"
        label={<FormattedMessage id="ui-rsdir.filter.pickupLocation" />}
        checked={activeFilters.isPickupLocation?.includes('true') || false}
        onChange={filterHandlers.checkbox}
      />
      <Select
        name="type"
        label={<FormattedMessage id="ui-rsdir.entry.type" />}
        dataOptions={entryTypeOptions}
        value={activeFilters.type?.[0] || ''}
        onChange={onChangeType}
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
        disabled={!canReset}
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
