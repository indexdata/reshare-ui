import React, { useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { NavList, NavListItem, NavListSection } from '@folio/stripes/components';

export const SECTIONS = [
  { key: 'entry', segment: '', labelId: 'ui-rsdir.entry.section.entry' },
  { key: 'lmsconfig', segment: 'lmsconfig', labelId: 'ui-rsdir.entry.section.lmsConfig' },
  { key: 'catalogconfig', segment: 'catalogconfig', labelId: 'ui-rsdir.entry.section.catalogConfig' },
  { key: 'holdingspolicy', segment: 'holdingspolicy', labelId: 'ui-rsdir.entry.section.holdingsPolicy' },
  { key: 'illconfig', segment: 'illconfig', labelId: 'ui-rsdir.entry.section.illConfig' },
  { key: 'tiers', segment: 'tiers', labelId: 'ui-rsdir.entry.section.tiers' },
  { key: 'networks', segment: 'networks', labelId: 'ui-rsdir.entry.section.networks' },
  { key: 'closures', segment: 'closures', labelId: 'ui-rsdir.entry.section.closures' },
];

export const sectionAt = (pathname, entryUrl) => {
  const segment = pathname.slice(entryUrl.length).split('/')[1] || '';
  return SECTIONS.find(section => section.segment === segment) || SECTIONS[0];
};

const EntrySections = ({ className, entryUrl, entryType, active }) => {
  const intl = useIntl();
  const location = useLocation();
  const activeRef = useRef();
  const sections = SECTIONS.filter(section => (
    (entryType !== 'Branch' || section.key !== 'catalogconfig')
    && (entryType === 'Institution' || section.key !== 'lmsconfig')
  ));

  // Section navigation unmounts the focused link. Focus the active section
  // if nothing else has focus; leave focus on a results row or other control.
  useEffect(() => {
    if (document.activeElement === document.body) activeRef.current?.focus();
  }, []);
  const linkTo = ({ segment }) => `${entryUrl}${segment && `/${segment}`}${location.search}`;

  return (
    <NavList className={className} aria-label={intl.formatMessage({ id: 'ui-rsdir.entry.sections' })}>
      <NavListSection>
        {sections.map(section => (
          <NavListItem
            key={section.key}
            id={`clickable-entry-section-${section.key}`}
            isActive={section === active}
            aria-current={section === active ? 'page' : undefined}
            ref={section === active ? activeRef : undefined}
            to={linkTo(section)}
          >
            <FormattedMessage id={section.labelId} />
          </NavListItem>
        ))}
      </NavListSection>
    </NavList>
  );
};

export default EntrySections;
