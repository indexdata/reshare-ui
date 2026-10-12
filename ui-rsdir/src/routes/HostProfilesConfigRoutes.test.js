import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import LMSConfigRoute from './LMSConfigRoute';
import CatalogConfigRoute from './CatalogConfigRoute';
import spec from '../../test/fixtures/directoryOpenApi';

const mockKy = jest.fn();
const mockEditor = jest.fn();
let mockEntry;

jest.mock('@folio/stripes/core', () => ({ useOkapiKy: () => mockKy }));
jest.mock('@projectreshare/stripes-reshare', () => ({
  useOkapiQuery: () => ({ isSuccess: true, data: mockEntry }),
}));
jest.mock('react-router-dom', () => ({ useParams: () => ({ id: 'entry-id' }) }));
jest.mock('react-intl', () => ({
  FormattedMessage: ({ defaultMessage, id }) => defaultMessage || id,
}));
jest.mock('@folio/stripes/components', () => ({
  Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
}));
jest.mock('../components/EntryPane', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
  EntryLoadingPane: () => <div>Loading settings</div>,
}));
jest.mock('../components/SettingsConfigEditor', () => ({
  __esModule: true,
  default: function MockSettingsConfigEditor(props) {
    // The real editor uses this same hook for descriptions.
    const useDirectoryOpenApi = require('../hooks/useDirectoryOpenApi').default;
    useDirectoryOpenApi(true);
    mockEditor(props);
    return <div>Settings editor</div>;
  },
}));

let queryClient;
const mount = Component => render(
  <QueryClientProvider client={queryClient}><Component /></QueryClientProvider>,
);
const editorProps = () => mockEditor.mock.calls.at(-1)[0];
const field = name => editorProps().fieldMapping.find(candidate => candidate.fieldName === name);

beforeEach(() => {
  mockKy.mockReset();
  mockEditor.mockClear();
  mockEntry = { id: 'entry-id', lmsConfig: { vendor: 'Koha' }, catalogConfig: {} };
  queryClient = new QueryClient();
  setLogger({ log: console.log, warn: console.warn, error: jest.fn() });
  mockKy.mockReturnValue({ json: () => Promise.resolve(spec) });
});

afterEach(() => {
  queryClient.clear();
  setLogger(console);
});

it.each([LMSConfigRoute, CatalogConfigRoute])('waits for metadata before mounting %p', async Component => {
  let resolveSpec;
  mockKy.mockReturnValue({ json: () => new Promise(resolve => { resolveSpec = resolve; }) });
  mount(Component);
  expect(screen.getByText('Loading settings')).toBeInTheDocument();
  expect(mockEditor).not.toHaveBeenCalled();
  await act(async () => resolveSpec(spec));
  expect(await screen.findByText('Settings editor')).toBeInTheDocument();
  expect(mockKy).toHaveBeenCalledTimes(1);
});

it.each([LMSConfigRoute, CatalogConfigRoute])('blocks %p on fetch failure and recovers through Retry', async Component => {
  mockKy.mockReturnValue({ json: () => Promise.reject(new Error('Offline')) });
  mount(Component);
  expect(await screen.findByRole('alert')).toHaveTextContent('information is unavailable');
  expect(mockEditor).not.toHaveBeenCalled();
  mockKy.mockReturnValue({ json: () => Promise.resolve(spec) });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Settings editor')).toBeInTheDocument();
  expect(mockKy).toHaveBeenCalledTimes(2);
});

it.each([{}, { 'x-host-profiles': { Bad: { lmsConfig: [] } } }])('blocks malformed metadata %j and retries', async invalid => {
  mockKy.mockReturnValue({ json: () => Promise.resolve(invalid) });
  mount(LMSConfigRoute);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(mockEditor).not.toHaveBeenCalled();
  mockKy.mockReturnValue({ json: () => Promise.resolve(spec) });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Settings editor')).toBeInTheDocument();
});

it('uses published choices and LMS overrides, including false-valued overrides', async () => {
  mount(LMSConfigRoute);
  await screen.findByText('Settings editor');
  expect(field('vendor').validChoices).toEqual(['Alma', 'FOLIO', 'Generic', 'Koha', 'Sierra']);
  expect(field('ncipNamespaceEnabled')).toMatchObject({
    disabled: true, overrideValue: false, overrideSource: { setting: 'lmsConfig.vendor', name: 'Koha' },
  });
  expect(field('address').disabled).toBe(false);
  const impact = editorProps().getSelectionChangeImpact({ fieldName: 'vendor', nextValue: 'Alma', resource: mockEntry });
  expect(impact.groups[0]).toMatchObject({ configKey: 'catalogConfig' });
  expect(impact.groups[0].paths).toContain('holdingsFormat.opac.allCirculations');
});

it.each([
  [undefined, 'Koha', 'marc', 'lmsConfig.vendor'],
  ['Alma', 'Alma', 'opac', 'catalogConfig.profile'],
])('respects catalog profile %p and otherwise falls back to LMS', async (profile, name, branch, setting) => {
  mockEntry.catalogConfig.profile = profile;
  mount(CatalogConfigRoute);
  await screen.findByText('Settings editor');
  expect(field('holdingsFormat')).toMatchObject({
    lockedSelection: branch, overrideSource: { setting, name },
  });
  if (!profile) {
    const marc = field('holdingsFormat').subMap.find(child => child.fieldName === 'marc');
    expect(marc.subMap.find(child => child.fieldName === 'shelvingLocationSubField').disabled).toBe(true);
  }
  const impact = editorProps().getSelectionChangeImpact({ fieldName: 'profile', nextValue: 'Sierra', resource: mockEntry });
  expect(impact.source).toEqual({ setting: 'catalogConfig.profile', name: 'Sierra' });
  expect(impact.groups.map(group => group.configKey)).toEqual(['catalogConfig']);
});

it.each([
  [LMSConfigRoute, 'lmsConfig', 'vendor'],
  [CatalogConfigRoute, 'catalogConfig', 'profile'],
])('retains an unpublished saved selection for %s', async (Component, configKey, selection) => {
  mockEntry[configKey][selection] = 'WMS';
  mount(Component);
  await screen.findByText('Settings editor');
  expect(field(selection).validChoices).toEqual(['Alma', 'FOLIO', 'Generic', 'Koha', 'Sierra', 'WMS']);
  expect(editorProps().fieldMapping.every(candidate => !candidate.overrideSource)).toBe(true);
});

it('accepts a newly published profile without UI code changes', async () => {
  mockEntry.lmsConfig.vendor = 'NewVendor';
  mockKy.mockReturnValue({ json: () => Promise.resolve({
    'x-host-profiles': { NewVendor: { lmsConfig: { address: 'fixed' } } },
  }) });
  mount(LMSConfigRoute);
  await screen.findByText('Settings editor');
  expect(field('vendor').validChoices).toEqual(['NewVendor']);
  expect(field('address')).toMatchObject({ disabled: true, overrideValue: 'fixed', overrideSource: { name: 'NewVendor' } });
});

it('shares cached metadata across routes and keeps editing available after a failed background refresh', async () => {
  const { rerender } = mount(LMSConfigRoute);
  await screen.findByText('Settings editor');
  rerender(<QueryClientProvider client={queryClient}><CatalogConfigRoute /></QueryClientProvider>);
  await screen.findByText('Settings editor');
  expect(mockKy).toHaveBeenCalledTimes(1);
  mockKy.mockReturnValue({ json: () => Promise.reject(new Error('Offline')) });
  await act(async () => queryClient.refetchQueries(['directory/openapi.json']));
  await waitFor(() => expect(mockKy).toHaveBeenCalledTimes(2));
  expect(screen.getByText('Settings editor')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([{ rules: [null] }, { rules: [false] }, { rules: ['bad'] }])(
  'shows a recoverable error for malformed availability rules %j', ({ rules }) => {
    queryClient.setQueryData(['directory/openapi.json'], { 'x-host-profiles': { Koha: {
      catalogConfig: { holdingsFormat: { marc: { availability: rules } } },
    } } });
    mount(CatalogConfigRoute);
    expect(screen.getByRole('alert')).toHaveTextContent('information is unavailable');
    expect(mockEditor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    return screen.findByText('Settings editor');
  },
);
