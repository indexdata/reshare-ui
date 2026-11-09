import { createIntl } from 'react-intl';
import { CONFIG_SECTIONS, configSection } from '../config/configSections';
import { applyDisabledPaths } from '../config/vendorFieldMapping';
import { flattenSection, foldForHighlight, matchedCards, matchSettings, settingsIndex } from './settingsIndex';
import translations from '../../translations/ui-rsdir/en';

const messages = Object.fromEntries(Object.entries(translations).map(([key, value]) => [`ui-rsdir.${key}`, value]));
const intlFor = (extra = {}) => createIntl({ locale: 'en', messages: { ...messages, ...extra }, onError: () => {} });
const intl = intlFor();

const institution = { type: 'Institution' };
const marcSaved = { ...institution, catalogConfig: { holdingsFormat: { marc: { mainField: '852' } } } };

const paths = matches => matches.map(entry => `${entry.configKey}.${entry.path}`);
const search = (query, { entry = institution, sections = CONFIG_SECTIONS, searchIntl = intl } = {}) => (
  matchSettings(settingsIndex(sections, entry, searchIntl), query, searchIntl.locale)
);

describe('flattenSection', () => {
  const entries = flattenSection(configSection('catalogConfig'), marcSaved.catalogConfig, intl);
  const entry = path => entries.find(candidate => candidate.path === path);

  it('indexes nested fields with their card and ancestor labels', () => {
    expect(entry('sru.address')).toEqual({
      configKey: 'catalogConfig',
      path: 'sru.address',
      card: 'sru',
      labels: ['SRU', 'Address'],
    });
  });

  it('indexes array labels without table columns', () => {
    expect(entry('holdingsFormat.marc.availability')).toBeDefined();
    expect(entries.some(candidate => candidate.path.startsWith('holdingsFormat.marc.availability.'))).toBe(false);
  });
});

describe('matchSettings', () => {
  it('requires every query word to match a field or ancestor label', () => {
    expect(paths(search('SRU address'))).toEqual(['catalogConfig.sru.address']);
    expect(paths(search('address'))).toEqual(expect.arrayContaining([
      'lmsConfig.address', 'catalogConfig.sru.address', 'catalogConfig.zoom.address',
    ]));
  });

  it('ignores case and accents on both sides', () => {
    const searchIntl = intlFor({ 'ui-rsdir.catalogConfig.sru': 'Catálogo SRU' });
    expect(paths(search('CATALOGO', { searchIntl }))).toEqual(['catalogConfig.sru', 'catalogConfig.sru.address', 'catalogConfig.sru.recordSchema']);
    expect(paths(search('catálogo address', { searchIntl }))).toEqual(['catalogConfig.sru.address']);
  });

  it('skips sections unavailable for the entry type', () => {
    expect(paths(search('address', { entry: { type: 'Consortium' } }))).toEqual(['catalogConfig.sru.address', 'catalogConfig.zoom.address']);
    expect(paths(search('address', { entry: { type: 'Branch' } }))).toEqual(['lmsConfig.address']);
  });

  it('skips sections without field maps', () => {
    const sections = CONFIG_SECTIONS.map(row => (row.configKey === 'lmsConfig' ? { ...row, fieldMap: undefined } : row));
    expect(paths(search('address', { sections }))).toEqual(['catalogConfig.sru.address', 'catalogConfig.zoom.address']);
  });
});

describe('visible settings', () => {
  it('matches empty settings', () => {
    expect(paths(search('agency auth'))).toEqual(['lmsConfig.fromAgencyAuthentication']);
  });

  it('matches only the parent label when no branch is selected', () => {
    expect(paths(search('holdings format'))).toEqual(['catalogConfig.holdingsFormat']);
  });

  it('skips unselected branches', () => {
    expect(paths(search('availability rule', { entry: marcSaved }))).toEqual([]);
    expect(paths(search('main field', { entry: marcSaved }))).toEqual(['catalogConfig.holdingsFormat.marc.mainField']);
  });

  it('uses profile locks over saved branch selections', () => {
    const sections = CONFIG_SECTIONS.map(row => (row.configKey === 'catalogConfig' ? {
      ...row,
      fieldMap: applyDisabledPaths(row.fieldMap, ['holdingsFormat.opac.includeItemId'], { setting: 'lmsConfig.vendor', name: 'Locked' }),
    } : row));
    expect(paths(search('include item id', { entry: marcSaved, sections }))).toEqual(['catalogConfig.holdingsFormat.opac.includeItemId']);
    expect(paths(search('availability rule', { entry: marcSaved, sections }))).toEqual(['catalogConfig.holdingsFormat.opac.availabilityRule']);
    expect(paths(search('main field', { entry: marcSaved, sections }))).toEqual([]);
  });

  it('matches a disabled field but nothing beneath it', () => {
    const sections = CONFIG_SECTIONS.map(row => (row.configKey === 'catalogConfig' ? {
      ...row,
      fieldMap: applyDisabledPaths(row.fieldMap, ['sru'], { setting: 'lmsConfig.vendor', name: 'Locked' }),
    } : row));
    expect(paths(search('sru', { sections }))).toEqual(['catalogConfig.sru']);
    expect(paths(search('sru address', { sections }))).toEqual([]);
  });
});

describe('matchedCards', () => {
  it('groups unique cards by section', () => {
    expect(matchedCards(search('address'))).toEqual({
      lmsConfig: ['address'],
      catalogConfig: ['sru', 'zoom'],
    });
    expect(matchedCards(search('sru'))).toEqual({ catalogConfig: ['sru'] });
  });
});

describe('foldForHighlight', () => {
  it('folds case and accents without changing the text length', () => {
    expect(foldForHighlight('Catálogo', 'en')).toBe('catalogo');
    expect(foldForHighlight('Café', 'en')).toHaveLength(5);
  });
});
