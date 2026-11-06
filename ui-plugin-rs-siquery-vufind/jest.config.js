const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  setupFiles: [
    ...(config.setupFiles || []),
    require.resolve('@projectreshare/stripes-reshare/testing/jest/globals'),
    require.resolve('./test/jest/setupFiles'),
  ],
  // @projectreshare/stripes-reshare ships untranspiled source, so jest must
  // transform it like the @folio packages jest-config-stripes already whitelists.
  transformIgnorePatterns: (config.transformIgnorePatterns || []).map(
    (p) => p.replace('(?!@folio', '(?!@folio|@projectreshare')
  ),
};
