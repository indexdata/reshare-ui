import React from 'react';
import { AccordionSet } from '@folio/stripes/components';

import SECTIONS from './sections';

const ViewPatronRequest = ({ record, actions = [] }) => {
  const sectionProps = { record, actions };

  return (
    <AccordionSet>
      {SECTIONS.map(S => <S key={S.name} {...sectionProps} />)}
    </AccordionSet>
  );
};

export default ViewPatronRequest;
