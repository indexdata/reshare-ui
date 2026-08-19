const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  transformIgnorePatterns: (config.transformIgnorePatterns || []).map(
    pattern => pattern.replace('(?!@folio', '(?!@folio|@k-int')
  ),
};
