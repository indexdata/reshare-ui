// Mocks for packages that misbehave under jest.

// MultiColumnList measures its parent through react-virtualized-auto-sizer, which
// sees 0x0 under jsdom and renders no rows. Hand it fixed dimensions.
jest.mock('react-virtualized-auto-sizer', () => ({ children }) => children({ width: 1000, height: 600 }));

// Sunflower's stripes-components passes HotKeys a null ref on first render, which
// falls back to the deprecated ReactDOM.findDOMNode().
// TODO: drop with @folio/stripes-components >= 13.1.0 (Trillium).
jest.mock('@folio/stripes-components/lib/HotKeys', () => {
  const Passthrough = ({ children }) => children;

  return { HotKeys: Passthrough, FocusTrap: Passthrough };
});

// stripes-components calls .filter() on this CJS array export at module load,
// which jest's interop hands over as a namespace object.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));
