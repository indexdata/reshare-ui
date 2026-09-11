const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  setupFiles: [
    ...(config.setupFiles || []),
    require.resolve('@projectreshare/stripes-reshare/testing/jest/globals'),
    require.resolve('./test/jest/setupFiles'),
  ],
  transformIgnorePatterns: (config.transformIgnorePatterns || []).map(
    pattern => pattern.replace('(?!@folio', '(?!@folio|@k-int|@projectreshare')
  ),
};
