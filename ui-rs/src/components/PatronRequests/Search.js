import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useQIndex } from '@k-int/stripes-kint-components';
import { Button, Icon, SearchField } from '@folio/stripes/components';

const Search = ({ resetAll, searchHandlers, searchValue, searchChanged, filterChanged }) => {
  const intl = useIntl();
  const [qIndex, setQIndex] = useQIndex();
  const searchableIndexes = [
    { label: 'allFields', value: '' },
    { label: 'hrid', value: 'hrid' },
    { label: 'title', value: 'title' },
    { label: 'requesterIdentifier', value: 'patron' },
  ].map(x => ({
    label: intl.formatMessage({ id: `ui-rs.index.${x.label}` }),
    value: x.value,
  }));

  return (
    <>
      <SearchField
        autoFocus
        name="query"
        onChange={searchHandlers.query}
        onClear={searchHandlers.reset}
        searchableIndexes={searchableIndexes}
        selectedIndex={qIndex}
        onChangeIndex={e => setQIndex(e?.target?.value)}
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
