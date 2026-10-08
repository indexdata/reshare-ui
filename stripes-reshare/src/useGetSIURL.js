/** Returns a function that takes an item id and returns an SI URL or null if none configured.
 *  The configured `sharedIndex.item` is a template with an `{itemid}` placeholder. */
import { useStripes } from '@folio/stripes/core';

export default () => {
  const template = useStripes().config?.reshare?.sharedIndex?.item;

  return id => (id && template ? template.replace('{itemid}', id) : null);
};
