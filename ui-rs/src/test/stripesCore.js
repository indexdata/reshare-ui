import { makeStripesCoreMock as makeSharedMock } from '@projectreshare/stripes-reshare/testing/stripesCore';

// ReShare app-shell flags ui-rs routes read via useStripes().config.reshare.
// One stub serves every route test; a test's own overrides layer over it.
const reshareConfigStub = {
  showCost: true,
  sharedIndex: { type: 'folio', ui: 'https://shared-index.example' },
  patronURL: '/users?qindex=barcode&query={patronid}',
};

// Both arguments stay getters, read at render — see the shared mock.
const makeStripesCoreMock = (getOkapiKy, getReshareOverrides = () => ({})) => makeSharedMock(
  getOkapiKy,
  () => ({ ...reshareConfigStub, ...getReshareOverrides() }),
);

export { makeStripesCoreMock };
