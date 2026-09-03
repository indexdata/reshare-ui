// Module mocks stay with the package whose tests need them; the shared shims in
// stripes-reshare's testing/jest/globals.js cover only globals.

// MultiColumnList wraps its rows in react-virtualized-auto-sizer, which measures
// its parent's height/width — both 0 under jsdom, so it renders no rows. Hand the
// children fixed dimensions so MCL rows render and can be asserted.
jest.mock('react-virtualized-auto-sizer', () => ({ children }) => children({ width: 1000, height: 600 }));

// currency-codes/data is a CJS array export. Jest's CJS/ESM interop exposes it
// as a namespace object, but stripes-components calls .filter() on the import
// at module load.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));

// `stripes-config` is a virtual module the app build injects. @folio/stripes-core
// (pulled in transitively by @folio/stripes/smart-components) imports it at
// module load, so any test rendering smart-components needs this stub.
jest.mock(
  'stripes-config',
  () => ({ modules: { app: [], settings: [], plugin: [] }, config: {}, metadata: {} }),
  { virtual: true }
);
