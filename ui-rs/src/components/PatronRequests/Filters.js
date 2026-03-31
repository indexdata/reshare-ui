import React from 'react';
import { FormattedMessage } from 'react-intl';
import { CheckboxFilter, MultiSelectionFilter } from '@folio/stripes/smart-components';
import {
  Accordion,
  AccordionSet,
  FilterAccordionHeader,
} from '@folio/stripes/components';
import DateFilter from './DateFilter';

const Filters = ({ activeFilters, filterHandlers, options }) => {
  const onChangeHandler = (group) => {
    filterHandlers.state({
      ...activeFilters,
      [group.name]: group.values
    });
  };

  return (
    <>
      <CheckboxFilter
        name="needsAttention"
        dataOptions={options.needsAttention}
        selectedValues={activeFilters?.needsAttention}
        onChange={onChangeHandler}
      />
      <CheckboxFilter
        name="hasCost"
        dataOptions={options.hasCost}
        selectedValues={activeFilters?.hasCost}
        onChange={onChangeHandler}
      />
      <CheckboxFilter
        name="hasUnread"
        dataOptions={options.hasUnread}
        selectedValues={activeFilters?.hasUnread}
        onChange={onChangeHandler}
      />
      <CheckboxFilter
        name="terminal"
        dataOptions={options.terminal}
        selectedValues={activeFilters?.terminal}
        onChange={onChangeHandler}
      />
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
        <Accordion
          label={<FormattedMessage id="ui-rs.patronrequests.serviceType" />}
          id="serviceType"
          name="serviceType"
          separator={false}
          header={FilterAccordionHeader}
          displayClearButton={activeFilters?.serviceType?.length > 0}
          onClearFilter={() => filterHandlers.clearGroup('serviceType')}
        >
          <MultiSelectionFilter
            name="serviceType"
            dataOptions={options.serviceType}
            selectedValues={activeFilters?.serviceType}
            onChange={onChangeHandler}
          />
        </Accordion>
        <Accordion
          label={<FormattedMessage id="ui-rs.filter.serviceLevel" />}
          id="serviceLevel"
          name="serviceLevel"
          separator={false}
          header={FilterAccordionHeader}
          displayClearButton={activeFilters?.serviceLevel?.length > 0}
          onClearFilter={() => filterHandlers.clearGroup('serviceLevel')}
        >
          <MultiSelectionFilter
            name="serviceLevel"
            dataOptions={options.serviceLevel}
            selectedValues={activeFilters?.serviceLevel}
            onChange={onChangeHandler}
          />
        </Accordion>
      </AccordionSet>
      <DateFilter
        accordionLabel={<FormattedMessage id="ui-rs.filter.dateSubmitted" />}
        activeFilters={activeFilters}
        filterHandlers={filterHandlers}
        hideNoDateSetCheckbox
        name="created_at"
      />
      <DateFilter
        accordionLabel={<FormattedMessage id="ui-rs.filter.dateNeeded" />}
        activeFilters={activeFilters}
        filterHandlers={filterHandlers}
        hideNoDateSetCheckbox
        name="needed_at"
      />
    </>
  );
};

export default Filters;
