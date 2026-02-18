import React from 'react';
import { AccordionSet } from '@folio/stripes/components';
import SECTIONS from '../components/Flow/FlowViewComponents';

const FlowRoute = ({ request, actions = [] }) => {
  if (!request) return null;
  const sectionProps = { request, actions };

  return (
    <AccordionSet>
      {SECTIONS.map(S => <S key={S.name} {...sectionProps} />)}
    </AccordionSet>
  );
};

export default FlowRoute;
