global.$RefreshReg$ = () => {};
global.$RefreshSig$ = () => type => type;

// currency-codes/data is a CJS array export. Jest's CJS/ESM interop exposes it
// as a namespace object, but stripes-components calls .filter() on the import
// at module load. Revisit if Stripes changes that import or Jest interop changes.
jest.mock('currency-codes/data', () => ({ filter: () => [] }));
