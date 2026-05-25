import React from 'react';

// Stripes Icon hits an icon registry that isn't set up under jest, producing
// console noise. Tiny API surface, so swap it for a pass-through. Mock the deep
// module path because internal stripes-components imports go directly to it,
// bypassing the @folio/stripes/components barrel:
//   jest.mock('@folio/stripes-components/lib/Icon', () => require('../test/iconMock').default);
// forwardRef and forward the DOM-safe props a caller might set on the icon —
// id and any aria-* (e.g. a Tooltip labelling its trigger) — while dropping
// Icon's own styling props so they don't leak onto the span as unknown DOM attrs.
const Icon = React.forwardRef(({ children, icon, id, ...rest }, ref) => {
  const aria = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key.startsWith('aria-'))
  );
  return (
    <span data-test-icon={icon} id={id} ref={ref} {...aria}>
      {children}
    </span>
  );
});

export default Icon;
