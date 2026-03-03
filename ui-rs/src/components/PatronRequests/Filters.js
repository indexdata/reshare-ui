import React from 'react';
import { FormattedMessage } from 'react-intl';
import { MultiSelectionFilter } from '@folio/stripes/smart-components';
import {
  Accordion,
  AccordionSet,
  FilterAccordionHeader,
} from '@folio/stripes/components';

const Filters = ({ activeFilters, filterHandlers, options }) => {
  const onChangeHandler = (group) => {
    filterHandlers.state({
      ...activeFilters,
      [group.name]: group.values
    });
  };

  return (
    <AccordionSet>
      <Accordion
        label={<FormattedMessage id="ui-rs.filter.state" />}
        id="state"
        name="state"
        separator={false}
        header={FilterAccordionHeader}
        displayClearButton={activeFilters?.state?.length > 0}
        onClearFilter={() => filterHandlers.clearGroup('state')}
      >
        <MultiSelectionFilter
          name="state"
          dataOptions={options.state}
          selectedValues={activeFilters?.state}
          onChange={onChangeHandler}
        />
      </Accordion>
    </AccordionSet>
  );
};

export default Filters;
