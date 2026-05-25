import React from 'react';

// Real @folio/stripes/core transitively requires the virtual `stripes-config`
// module, which only exists when the app is running. Route tests mock the module
// with `makeStripesCoreMock`, covering only the named exports our routes touch.

// ReShare app-shell flags read via useStripes().config.reshare.
const reshareConfigStub = {
  showCost: true,
  useTiers: true,
  sharedIndex: { type: 'folio', ui: 'https://shared-index.example' },
};

// `getOkapiKy` is a getter, not the ky mock itself: the jest.mock factory that
// calls this is hoisted above the test's module-scope `const mockOkapi = ...`, so
// the value must be read lazily (at render) rather than captured here.
const makeStripesCoreMock = (getOkapiKy, { config = reshareConfigStub } = {}) => ({
  useStripes: () => ({
    currency: 'USD',
    hasPerm: () => true,
    config: { reshare: config },
  }),
  useOkapiKy: () => getOkapiKy(),
  CalloutContext: React.createContext(null),
  // Permission gate → always render children (test grants all perms).
  IfPermission: ({ children }) => children,
  // AppIcon reaches a webpack asset registry that jest doesn't provide; stub it out.
  AppIcon: () => null,
});

export { reshareConfigStub, makeStripesCoreMock };
