// Browser APIs jsdom does not implement, stubbed for any package whose tests
// render or exercise browser-ish code. Module mocks belong to the app, not here:
// everything below is unconditional and names no dependency.

global.$RefreshReg$ = () => {};
global.$RefreshSig$ = () => type => type;

// jsdom doesn't implement ResizeObserver; Stripes' TextArea constructs one to
// auto-grow on input. Minimal no-op stub so forms with a TextArea can render.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

// jsdom exposes neither TextDecoder nor TextEncoder; BrokerEvents constructs a
// TextDecoder to read the event stream.
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// jsdom doesn't implement matchMedia; Stripes' responsive components
// (MultiColumnList, MultiSelection) call it at render. Minimal no-match stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
