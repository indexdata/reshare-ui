global.$RefreshReg$ = () => {};
global.$RefreshSig$ = () => type => type;

// MultiColumnList wraps its rows in react-virtualized-auto-sizer, which measures
// its parent's height/width — both 0 under jsdom, so it renders no rows. Hand the
// children fixed dimensions so MCL rows render and can be asserted.
jest.mock('react-virtualized-auto-sizer', () => ({ children }) => children({ width: 1000, height: 600 }));

// jsdom doesn't implement ResizeObserver; Stripes' TextArea constructs one to
// auto-grow on input. Minimal no-op stub so forms with a TextArea can render.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
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

// currency-codes/data is a CJS array export. Jest's CJS/ESM interop exposes it
// as a namespace object, but stripes-components calls .filter() on the import
// at module load. Revisit if Stripes changes that import or Jest interop changes.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));

// `stripes-config` is a virtual module the app build injects; it only exists at
// webpack build time. @folio/stripes-core (pulled in transitively by
// @folio/stripes/smart-components) does `import { config } from 'stripes-config'`
// at module load, so any test rendering smart-components needs this stub.
jest.mock(
  'stripes-config',
  () => ({ modules: { app: [], settings: [], plugin: [] }, config: {}, metadata: {} }),
  { virtual: true }
);
