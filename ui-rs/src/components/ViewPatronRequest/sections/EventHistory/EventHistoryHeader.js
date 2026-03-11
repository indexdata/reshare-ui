/*
 * Custom accordion header that replaces DefaultAccordionHeader.
 *
 * The default header renders the label and displayWhenClosed in two
 * sibling flex items. The right-hand sibling (headerDefaultContentRight)
 * has flex-shrink: 0, so its width equals its content's max-content
 * intrinsic size. That means long text inside displayWhenClosed
 * (e.g. error messages) can never be truncated by CSS — the container
 * just expands to fit, pushing the label off-screen.
 *
 * This header puts both the label and the summary content in a single
 * CSS Grid row: `grid-template-columns: auto minmax(0, 1fr)`.
 * The label column (auto) takes its natural width. The summary column
 * (minmax(0, 1fr)) gets the remaining space and is allowed to shrink
 * to zero, so children can use overflow/text-overflow to truncate.
 */

import { forwardRef } from 'react';
import { Headline, Icon } from '@folio/stripes/components';
import accordionCss from '@folio/stripes-components/lib/Accordion/Accordion.css';
import css from './EventHistory.css';

const EventHistoryHeader = forwardRef(({ headerProps = { headingLevel: 3 }, ...rest }, ref) => {
  const props = { headerProps, ...rest };

  function handleHeaderClick(e) {
    const { id, label } = props;
    props.onToggle({ id, label });
    e.stopPropagation();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { id, label } = props;
      props.onToggle({ id, label });
    }
  }

  const {
    label,
    open,
    displayWhenOpen,
    displayWhenClosed,
    labelId,
    headerProps: { headingLevel, ...restHeaderProps },
  } = props;

  const headerRightContent = open ? displayWhenOpen : displayWhenClosed;

  return (
    <div className={accordionCss.headerWrapper} ref={ref}>
      <div className={css.headerGrid}>
        <Headline size="medium" margin="none" tag={headingLevel ? `h${headingLevel}` : 'div'} block>
          <button
            type="button"
            onClick={handleHeaderClick}
            onKeyDown={handleKeyDown}
            className={accordionCss.defaultCollapseButton}
            ref={props.toggleRef}
            autoFocus={props.autoFocus}
            aria-expanded={open}
            aria-controls={props.contentId}
            id={labelId}
            {...restHeaderProps}
          >
            <span className={accordionCss.headerInner}>
              <span className={accordionCss.defaultHeaderIcon}>
                <Icon
                  size="small"
                  icon={open ? 'caret-up' : 'caret-down'}
                />
              </span>
              <div className={accordionCss.labelArea}>
                {label}
              </div>
            </span>
          </button>
        </Headline>
        {headerRightContent && (
          <div className={css.summaryArea}>
            {headerRightContent}
          </div>
        )}
      </div>
    </div>
  );
});

export default EventHistoryHeader;
