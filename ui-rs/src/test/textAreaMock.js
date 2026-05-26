import React from 'react';

// Stripes' TextArea lets its `onClearField` prop (defaulted to a noop) fall through
// into the props spread onto the underlying <textarea>, so React logs
// "Unknown event handler property `onClearField`" on every render — a stripes-
// components bug, not ours. Swap in a pass-through. Mock the deep module path like
// iconMock — internal stripes imports bypass the @folio/stripes/components barrel:
//   jest.mock('@folio/stripes-components/lib/TextArea', () => require('../test/textAreaMock').default);
// Note this module path is the final-form-aware (formField-wrapped) export, so the
// stub receives final-form's `input`/`meta` and wires the input handlers itself.
const TextArea = ({ input = {}, id, label }) => (
  <textarea
    id={id}
    name={input.name}
    aria-label={typeof label === 'string' ? label : undefined}
    value={input.value ?? ''}
    onChange={input.onChange}
    onBlur={input.onBlur}
    onFocus={input.onFocus}
  />
);

export default TextArea;
