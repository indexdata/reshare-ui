module.exports = {
  okapi: { url: 'https://zfldev-okapi.reshare-dev.indexdata.com', tenant: 'de468' },
  config: {
    showHomeLink: true,
    welcomeMessage: 'ZFL-DEV: ReShare',
    platformName: 'ReShare',
    platformDescription: 'ReShare platform',
    hasAllPerms: true,
    suppressIntlErrors: true,
    disableStrictMode: true,
    staleBundleWarning: { path: '/bundle.js', header: 'etag', interval: 2 },
    reshare: {
      maxDMSUpload: 250,
      showCost: true,
      showRefresh: true,
      showConditions: true,
      patronURL: '/users?qindex=barcode&query={patronid}',
    },
    showDevInfo: true,
  },
  modules: {
    '@folio/users': {},
    '@folio/developer': {},
    '@folio/tenant-settings': {},
    '@projectreshare/request': {},
    '@projectreshare/rs': {},
    '@projectreshare/supply': {},
  },
  branding: {
    style: {},
    logo: {
      src: './tenant-assets/reshare-logo.png',
      alt: 'ReShare',
    },
    favicon: {
      src: './tenant-assets/reshare-favicon.jpg',
    },
  },
};
