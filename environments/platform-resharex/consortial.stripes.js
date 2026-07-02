module.exports = {
  okapi: { 'url':'https://reshare-2-okapi.folio-dev-us-east-1-1.folio-dev.indexdata.com', 'tenant':'consortial' },
  config: {
    showHomeLink: true,
    welcomeMessage: 'ReShare X Consortial Tenant',
    platformName: 'ReShare',
    platformDescription: 'ReShare platform',
    hasAllPerms: false,
    showDevInfo: true,
    staleBundleWarning: { path: '/index.html', header: 'last-modified', interval: 5 },
  },
  modules: {
    "@folio/calendar": {},
    "@folio/checkin": {},
    "@folio/checkout": {},
    "@folio/circulation": {},
    "@folio/developer": {},
    "@folio/handler-stripes-registry": {},
    "@folio/inventory": {},
    "@folio/myprofile": {},
    "@folio/notes": {},
    "@folio/plugin-create-inventory-records": {},
    "@folio/plugin-find-instance": {},
    "@folio/plugin-find-interface": {},
    "@folio/plugin-find-user": {},
    "@folio/requests": {},
    "@folio/servicepoints": {},
    "@folio/stripes-inventory-components": {},
    "@folio/tags": {},
    "@folio/tenant-settings": {},
    "@folio/users": {},
    "@projectreshare/rsdir": {}
  },
  branding: {
    style: {},
    logo: {
      src: './tenant-assets/reshare-logo.png',
      alt: 'ReShare 2',
    },
    favicon: {
      src: './tenant-assets/reshare-favicon.jpg',
    },
  },
};
