/** Returns a function that takes an item id and returns an SI URL or null if none configured.
 *  The owned institution's discovery `itemLinkTemplate` has an `{itemid}` placeholder. */
import { useTenantInstitution } from './useOwnedEntries';

export default () => {
  const template = useTenantInstitution().institution?.discoveryConfig?.itemLinkTemplate;

  return id => (id && template ? template.replace('{itemid}', id) : null);
};
