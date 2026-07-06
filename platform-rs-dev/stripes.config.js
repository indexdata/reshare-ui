module.exports = {
  okapi: { url: 'https://rs1-okapi.reshare-dev.indexdata.com', tenant: 'rs1' },
  // okapi: { url: 'https://rs3-okapi.reshare-dev.indexdata.com', tenant: 'rs3' },
  config: {
    showHomeLink: true,
    welcomeMessage: 'ui-rs.front.welcome',
    platformName: 'ReShare',
    platformDescription: 'ReShare platform',
    hasAllPerms: true,
    suppressIntlErrors: true,
    disableStrictMode: true,
    staleBundleWarning: { path: '/bundle.js', header: 'etag', interval: 2 },
    reshare: {
      maxDMSUpload: 250,
      sharedIndex: {
        type: 'vufind',
        ui: 'https://borrowdirect.reshare.indexdata.com',
        query: 'https://borrowdirect.reshare.indexdata.com',
      },
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
      alt: 'Opentown Libraries',
    },
    favicon: {
      src: './tenant-assets/reshare-favicon.jpg',
    },
  },
};
