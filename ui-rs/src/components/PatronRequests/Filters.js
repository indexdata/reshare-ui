import React from 'react';
import { FormattedMessage } from 'react-intl';
import { CheckboxFilter, DateRangeFilter, MultiSelectionFilter } from '@folio/stripes/smart-components';
import {
  Accordion,
  AccordionSet,
  FilterAccordionHeader,
} from '@folio/stripes/components';

// Extract dates from stored CQL fragment, e.g. "created_at>=2024-01-01 and created_at<=2024-12-31"
const parseDateValues = (filterStrings) => {
  const str = filterStrings?.[0] || '';
  return {
    startDate: str.match(/>=([\d-]+)/)?.[1] || '',
    endDate: str.match(/<=([\d-]+)/)?.[1] || '',
  };
};

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
      <Accordion
        closedByDefault
        displayClearButton={activeFilters?.createdAt?.length > 0}
        header={FilterAccordionHeader}
        id="createdAt"
        label={<FormattedMessage id="ui-rs.filter.dateSubmitted" />}
        onClearFilter={() => filterHandlers.clearGroup('createdAt')}
        separator={false}
      >
        <DateRangeFilter
          name="createdAt"
          selectedValues={parseDateValues(activeFilters?.createdAt)}
          makeFilterString={(s, e) => [s && `created_at>=${s}`, e && `created_at<=${e}`].filter(Boolean).join(' and ')}
          onChange={onChangeHandler}
          requiredFields={[]}
        />
      </Accordion>
      <Accordion
        closedByDefault
        displayClearButton={activeFilters?.neededAt?.length > 0}
        header={FilterAccordionHeader}
        id="neededAt"
        label={<FormattedMessage id="ui-rs.filter.dateNeeded" />}
        onClearFilter={() => filterHandlers.clearGroup('neededAt')}
        separator={false}
      >
        <DateRangeFilter
          name="neededAt"
          selectedValues={parseDateValues(activeFilters?.neededAt)}
          makeFilterString={(s, e) => [s && `needed_at>=${s}`, e && `needed_at<=${e}`].filter(Boolean).join(' and ')}
          onChange={onChangeHandler}
          requiredFields={[]}
        />
      </Accordion>
    </>
  );
};

export default Filters;
