// Built once per tenant by stack-up.sh, using PLATFORM_DIR's dependencies.
// Avoid autoLogin: Stripes 10 submits from LoginCtrl's constructor before
// React assigns this.context, crashing unauthenticated loads.
module.exports = {
  okapi: {
    url: process.env.E2E_BUNDLE_OKAPI_URL ?? 'http://localhost:9130',
    tenant: process.env.E2E_BUNDLE_TENANT ?? 'test1',
  },
  config: {
    showHomeLink: true,
    welcomeMessage: 'ui-rs.front.welcome',
    platformName: `ReShare E2E ${process.env.E2E_BUNDLE_TENANT ?? 'test1'}`,
    platformDescription: 'ReShare captive E2E platform',
    hasAllPerms: true,
    suppressIntlErrors: true,
    disableStrictMode: true,
    reshare: {
      liveUpdates: true,
      maxDMSUpload: 250,
      showCost: true,
      showRefresh: true,
      showConditions: true,
      patronURL: '/users?qindex=barcode&query={patronid}',
    },
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
      alt: 'ReShare E2E',
    },
    favicon: {
      src: './tenant-assets/reshare-favicon.jpg',
    },
  },
};
