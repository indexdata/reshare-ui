import addressPluginBritishIsles from '@k-int/address-plugin-british-isles';
import addressPluginGeneric from '@k-int/address-plugin-generic';
import addressPluginNorthAmerica from '@k-int/address-plugin-north-america';

const addressPlugins = {
  'british-isles': addressPluginBritishIsles,
  generic: addressPluginGeneric,
  'north-america': addressPluginNorthAmerica,
};

export const getAddressPlugin = pluginName => (
  addressPlugins[pluginName] || addressPluginGeneric
);
