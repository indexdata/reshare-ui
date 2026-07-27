import React from 'react';
import { FormattedMessage } from 'react-intl';
import { CheckboxFilter, DateRangeFilter, MultiSelectionFilter } from '@folio/stripes/smart-components';
import {
  Accordion,
  AccordionSet,
  FilterAccordionHeader,
  Loading,
} from '@folio/stripes/components';
import css from './Filters.css';

// Extract dates from stored CQL fragment, e.g. "created_at>=2024-01-01 and created_at<=2024-12-31"
const parseDateValues = (filterStrings) => {
  const str = filterStrings?.[0] || '';
  return {
    startDate: str.match(/>=([\d-]+)/)?.[1] || '',
    endDate: str.match(/<=([\d-]+)/)?.[1] || '',
  };
};

// The server prefix-matches name and symbol independently, so marking exactly the matched
// prefix means an unmarked field is the signal that it isn't why the row came back. Stripes'
// Highlighter can't express that, since it marks every occurrence and cannot anchor. The
// term is trimmed the same way the route trims it before putting it in the CQL.
const markPrefix = (text, term) => {
  const trimmed = term.trim();
  if (!trimmed || !text.toLowerCase().startsWith(trimmed.toLowerCase())) return text;
  return <><mark className={css.mark}>{text.slice(0, trimmed.length)}</mark>{text.slice(trimmed.length)}</>;
};

// Peer option row: name (when known) followed inline by the muted parenthesised symbol,
// with the facet count right-aligned. With no name only the symbol shows, so duplicate
// names stay unambiguous.
const peerOptionFormatter = ({ option, searchTerm }) => {
  const mark = (text) => markPrefix(text, searchTerm || '');
  return (
    <span className={css.peerOption}>
      <span>
        {option.name && <>{mark(option.name)} </>}
        <span className={option.name ? css.peerSymbol : undefined}>({mark(option.symbol)})</span>
      </span>
      {option.count != null && <span>{option.count}</span>}
    </span>
  );
};

const Filters = ({ activeFilters, filterHandlers, options, peerFacet = {} }) => {
  const { name: peerFilterName, ready: peerFacetReady, loading: peerFacetLoading, onType: onPeerFilterType } = peerFacet;

  const onChangeHandler = (group) => {
    filterHandlers.state({
      ...activeFilters,
      [group.name]: group.values
    });
  };

  // Under asyncFiltering this is a notification, not a filter: MultiSelection ignores the
  // return value and renders dataOptions as given, so all it does is report the typed text
  // (debounced by 300ms on its side) so the route can requery.
  const asyncPeerFilter = (filterText) => onPeerFilterType(filterText || '');

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
        name="hasInternalNote"
        dataOptions={options.hasInternalNote}
        selectedValues={activeFilters?.hasInternalNote}
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
            ariaLabelledBy="accordion-toggle-button-state"
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
            ariaLabelledBy="accordion-toggle-button-serviceType"
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
            ariaLabelledBy="accordion-toggle-button-serviceLevel"
            name="serviceLevel"
            dataOptions={options.serviceLevel}
            selectedValues={activeFilters?.serviceLevel}
            onChange={onChangeHandler}
          />
        </Accordion>
        {peerFilterName && (
          <Accordion
            label={<FormattedMessage id={`ui-rs.filter.${peerFilterName}`} />}
            id={peerFilterName}
            name={peerFilterName}
            separator={false}
            header={FilterAccordionHeader}
            displayClearButton={activeFilters?.[peerFilterName]?.length > 0}
            onClearFilter={() => filterHandlers.clearGroup(peerFilterName)}
          >
            {/* Wait for the first option list before mounting the select: with no options
                to show, MultiSelection renders its empty message and a spinner together
                (MultiSelectOptionsList), so an open menu would read "no matching options"
                for the whole initial load. */}
            {peerFacetReady ? (
              <MultiSelectionFilter
                ariaLabelledBy={`accordion-toggle-button-${peerFilterName}`}
                name={peerFilterName}
                dataOptions={options[peerFilterName]}
                selectedValues={activeFilters?.[peerFilterName]}
                onChange={onChangeHandler}
                formatter={peerOptionFormatter}
                valueFormatter={({ option }) => option.label}
                showLoading={peerFacetLoading}
                asyncFiltering
                filter={asyncPeerFilter}
              />
            ) : (
              <Loading />
            )}
          </Accordion>
        )}
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
