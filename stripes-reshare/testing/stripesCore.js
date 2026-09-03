import React from 'react';

// Real @folio/stripes/core transitively requires the virtual `stripes-config`
// module, which only exists when the app is running. Route tests mock the module
// with `makeStripesCoreMock`, covering only the named exports our routes touch.

// Both arguments are getters, not values: the jest.mock factory that calls this
// is hoisted above the test's module-scope `const mockOkapi = ...`, so they must
// be read at render rather than captured here. `getReshareConfig` supplies the
// whole `useStripes().config.reshare` object, so an app layers its own defaults
// in a wrapper rather than finding them baked in here.
const makeStripesCoreMock = (getOkapiKy, getReshareConfig = () => ({})) => ({
  // Route maps are built from these, so keep the real implementations.
  ...jest.requireActual('@folio/stripes-core/src/components/NestedRouter'),
  useStripes: () => ({
    currency: 'USD',
    hasPerm: () => true,
    config: { reshare: getReshareConfig() },
  }),
  useOkapiKy: () => getOkapiKy(),
  CalloutContext: React.createContext(null),
  withStripes: (Component) => Component,
  // Permission gate → always render children (test grants all perms).
  IfPermission: ({ children }) => children,
  // AppIcon reaches a webpack asset registry that jest doesn't provide; stub it out.
  AppIcon: () => null,
  // Pluggable renders registered UI plugins via a webpack-time module registry the
  // app build provides; jest has none, so render nothing.
  Pluggable: () => null,
});

export { makeStripesCoreMock };
