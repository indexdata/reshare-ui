import React from 'react';
// Provided by the shared Stripes test environment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from '@testing-library/react';
import CatalogConfigRoute from './CatalogConfigRoute';
import LMSConfigRoute from './LMSConfigRoute';
import SettingsConfigEditor from '../components/SettingsConfigEditor';

let mockResource;

jest.mock('react-router-dom', () => ({ useParams: () => ({ id: 'entry-id' }) }));
jest.mock('react-intl', () => ({ FormattedMessage: () => null }));
jest.mock('@projectreshare/stripes-reshare', () => ({
  useOkapiQuery: () => ({ isSuccess: true, data: mockResource }),
}));
jest.mock('../components/EntryPane', () => ({
  __esModule: true,
  default: ({ children }) => children,
  EntryLoadingPane: () => null,
}));
jest.mock('../components/SettingsConfigEditor', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mapping = () => SettingsConfigEditor.mock.calls[SettingsConfigEditor.mock.calls.length - 1][0].fieldMapping;
const holdingsSource = () => mapping().find(field => field.fieldName === 'holdingsFormat').overrideSource;

beforeEach(() => SettingsConfigEditor.mockClear());

it('attributes LMS overrides to the LMS vendor setting', () => {
  mockResource = { lmsConfig: { vendor: 'Generic' }, catalogConfig: { profile: 'Alma' } };
  render(<LMSConfigRoute />);
  expect(mapping().find(field => field.fieldName === 'ncipNamespaceEnabled').overrideSource)
    .toEqual({ setting: 'lmsConfig.vendor', name: 'Generic' });
  const { getSelectionChangeImpact } = SettingsConfigEditor.mock.calls[0][0];
  expect(getSelectionChangeImpact({ fieldName: 'vendor', nextValue: 'Koha', resource: mockResource }).groups)
    .toEqual([{ configKey: 'lmsConfig', paths: ['ncipNamespaceEnabled'] }]);
  expect(getSelectionChangeImpact({ fieldName: 'vendor', nextValue: 'Alma', resource: mockResource }))
    .toMatchObject({ groups: [], catalogProfile: 'Alma' });
  expect(getSelectionChangeImpact({ fieldName: 'address', nextValue: 'changed', resource: mockResource })).toBeUndefined();
  expect(getSelectionChangeImpact({ fieldName: 'vendor', nextValue: '', resource: mockResource })).toBeUndefined();
});

it('uses an explicit catalog profile, falls back to the vendor, and updates identical-name attribution', () => {
  mockResource = { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile: 'Koha' } };
  const { rerender } = render(<CatalogConfigRoute />);
  expect(holdingsSource()).toEqual({ setting: 'catalogConfig.profile', name: 'Koha' });
  const { getSelectionChangeImpact } = SettingsConfigEditor.mock.calls[0][0];
  expect(getSelectionChangeImpact({ fieldName: 'profile', nextValue: 'Alma', resource: mockResource }).groups
    .map(group => group.configKey)).toEqual(['catalogConfig']);
  expect(getSelectionChangeImpact({ fieldName: 'holdingsFormat', nextValue: {}, resource: mockResource })).toBeUndefined();
  expect(getSelectionChangeImpact({ fieldName: 'profile', nextValue: '', resource: mockResource })).toBeUndefined();
  mockResource = { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile: 'Alma' } };
  rerender(<CatalogConfigRoute />);
  expect(holdingsSource()).toEqual({ setting: 'catalogConfig.profile', name: 'Alma' });
  mockResource = { lmsConfig: { vendor: 'Alma' }, catalogConfig: { profile: null } };
  rerender(<CatalogConfigRoute />);
  expect(holdingsSource()).toEqual({ setting: 'lmsConfig.vendor', name: 'Alma' });
  mockResource = { lmsConfig: {}, catalogConfig: {} };
  rerender(<CatalogConfigRoute />);
  expect(holdingsSource()).toBeUndefined();
});
