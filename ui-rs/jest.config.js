const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  setupFiles: [
    ...(config.setupFiles || []),
    require.resolve('@projectreshare/stripes-reshare/testing/jest/globals'),
    require.resolve('./test/jest/setupFiles'),
  ],
  // @projectreshare/stripes-reshare and @k-int/stripes-kint-components are
  // installed straight from git source (no build step) and ship untranspiled
  // ESM/JSX, so jest must transform them rather than ignore them like the rest of
  // node_modules. Add them to the existing @folio whitelist in jest-config-stripes'
  // transformIgnorePatterns.
  transformIgnorePatterns: (config.transformIgnorePatterns || []).map(
    (p) => p.replace('(?!@folio', '(?!@folio|@projectreshare|@k-int')
  ),
};
