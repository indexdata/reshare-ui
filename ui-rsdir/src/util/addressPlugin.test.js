import addressPluginBritishIsles from '@k-int/address-plugin-british-isles';
import addressPluginGeneric from '@k-int/address-plugin-generic';
import addressPluginNorthAmerica from '@k-int/address-plugin-north-america';
import { getAddressPlugin } from './addressPlugin';

describe('getAddressPlugin', () => {
  it.each([
    ['generic', addressPluginGeneric],
    ['north-america', addressPluginNorthAmerica],
    ['british-isles', addressPluginBritishIsles],
  ])('loads the %s plugin', (pluginName, plugin) => {
    expect(getAddressPlugin(pluginName)).toBe(plugin);
  });

  it.each([undefined, '', 'not-installed'])('falls back to generic for %p', pluginName => {
    expect(getAddressPlugin(pluginName)).toBe(addressPluginGeneric);
  });
});
