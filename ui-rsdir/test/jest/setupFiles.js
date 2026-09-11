// jsdom reports zero dimensions. Supply a size so MultiColumnList renders rows.
jest.mock('react-virtualized-auto-sizer', () => ({ children }) => children({ width: 1000, height: 600 }));

// currency-codes/data is a CJS array export. Jest's CJS/ESM interop exposes it
// as a namespace object, but stripes-components calls .filter() on the import
// at module load.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));

// Stripes core imports this build-generated module, which is absent in Jest.
jest.mock(
  'stripes-config',
  () => ({ modules: { app: [], settings: [], plugin: [] }, config: {}, metadata: {} }),
  { virtual: true }
);
