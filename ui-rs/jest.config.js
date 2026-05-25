const path = require('path');
const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  setupFiles: [
    ...(config.setupFiles || []),
    path.join(__dirname, './test/jest/setupFiles.js'),
  ],
  // @projectreshare/stripes-reshare is installed straight from its git source
  // (no build step) and ships untranspiled ESM/JSX, so jest must transform it
  // rather than ignore it like the rest of node_modules. Add it to the existing
  // @folio whitelist in jest-config-stripes' transformIgnorePatterns.
  transformIgnorePatterns: (config.transformIgnorePatterns || []).map(
    (p) => p.replace('(?!@folio', '(?!@folio|@projectreshare')
  ),
};
