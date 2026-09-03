process.env.NODE_ENV = 'test';

const config = require('@folio/jest-config-stripes');

module.exports = {
  ...config,
  setupFiles: [
    ...(config.setupFiles || []),
    require.resolve('./testing/jest/globals'),
  ],
};
