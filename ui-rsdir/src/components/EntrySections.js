import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { NavList, NavListItem, NavListSection } from '@folio/stripes/components';

// `segment` is the path below the entry. The entry itself has none, so anything
// under the entry that is not another section (its edit form) counts as it.
export const SECTIONS = [
  { key: 'entry', segment: '', labelId: 'ui-rsdir.entry.section.entry' },
  { key: 'lmsconfig', segment: 'lmsconfig', labelId: 'ui-rsdir.entry.section.lmsConfig' },
  { key: 'catalogconfig', segment: 'catalogconfig', labelId: 'ui-rsdir.entry.section.catalogConfig' },
  { key: 'holdingspolicy', segment: 'holdingspolicy', labelId: 'ui-rsdir.entry.section.holdingsPolicy' },
  { key: 'illconfig', segment: 'illconfig', labelId: 'ui-rsdir.entry.section.illConfig' },
  { key: 'tiers', segment: 'tiers', labelId: 'ui-rsdir.entry.section.tiers' },
  { key: 'networks', segment: 'networks', labelId: 'ui-rsdir.entry.section.networks' },
];

// The section showing at `pathname`, given the entry's url.
export const sectionAt = (pathname, entryUrl) => {
  const segment = pathname.slice(entryUrl.length).split('/')[1] || '';
  return SECTIONS.find(s => s.segment === segment) || SECTIONS[0];
};

const EntrySections = ({ className, entryUrl, active }) => {
  const intl = useIntl();
  const location = useLocation();
  const linkTo = ({ segment }) => `${entryUrl}${segment && `/${segment}`}${location.search}`;

  return (
    <NavList className={className} aria-label={intl.formatMessage({ id: 'ui-rsdir.entry.sections' })}>
      <NavListSection>
        {SECTIONS.map(section => (
          <NavListItem
            key={section.key}
            id={`clickable-entry-section-${section.key}`}
            isActive={section === active}
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
