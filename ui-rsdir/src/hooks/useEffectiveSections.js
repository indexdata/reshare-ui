import { useMemo } from 'react';
import { CONFIG_SECTIONS, configSection } from '../config/configSections';
import { hostProfileChoices, vendorFieldMappingForVendor } from '../config/vendorFieldMapping';
import { applyInheritancePolicy } from '../util/inheritancePolicy';
import useDirectoryOpenApi from './useDirectoryOpenApi';
import useHostProfiles from './useHostProfiles';

const lmsFields = configSection('lmsConfig').fieldMap;
const catalogFields = configSection('catalogConfig').fieldMap;

const withChoices = (fields, fieldName, validChoices) => fields.map(field => (
  field.fieldName === fieldName ? { ...field, validChoices } : field
));

// Shared by search, section navigation and editors. LMS and catalog maps
// require valid host-profile metadata. The OpenAPI inheritance policy hides
// fields the entry type can neither store nor inherit, and marks inherited-only
// fields read-only. A section applies when any of its fields remain.
const useEffectiveSections = entry => {
  const lms = useHostProfiles('lmsConfig', lmsFields);
  const catalog = useHostProfiles('catalogConfig', catalogFields);
  const openApiQuery = useDirectoryOpenApi(true);
  const spec = openApiQuery.data;
  const entryType = entry?.type;
  const lmsMetadata = lms.metadata;
  const catalogMetadata = catalog.metadata;
  const vendor = entry?.lmsConfig?.vendor;
  const profile = entry?.catalogConfig?.profile;

  const lmsMap = useMemo(() => lmsMetadata && vendorFieldMappingForVendor(
    withChoices(lmsFields, 'vendor', hostProfileChoices(lmsMetadata.names, vendor)),
    vendor, 'lmsConfig', lmsMetadata.vendorFieldMapping, 'lmsConfig.vendor', lmsMetadata.vendorFieldValues,
  ), [lmsMetadata, vendor]);

  const catalogMap = useMemo(() => catalogMetadata && vendorFieldMappingForVendor(
    withChoices(catalogFields, 'profile', hostProfileChoices(catalogMetadata.names, profile)),
    profile || vendor, 'catalogConfig', catalogMetadata.vendorFieldMapping,
    profile ? 'catalogConfig.profile' : 'lmsConfig.vendor', catalogMetadata.vendorFieldValues,
  ), [catalogMetadata, profile, vendor]);

  // Editors reset local state when their field map changes identity, so keep it stable.
  const sections = useMemo(() => {
    const hostProfileMaps = { lmsConfig: lmsMap, catalogConfig: catalogMap };

    return CONFIG_SECTIONS.map(row => {
      const fieldMap = row.configKey in hostProfileMaps ? hostProfileMaps[row.configKey] : row.fieldMap;
      const withPolicy = map => map && applyInheritancePolicy(map, spec, row.configKey, entryType);

      return { ...row, fieldMap: withPolicy(fieldMap), applies: withPolicy(row.fieldMap).length > 0 };
    });
  }, [lmsMap, catalogMap, spec, entryType]);

  return {
    sections,
    hostProfiles: { lmsConfig: lms, catalogConfig: catalog },
    policyReady: openApiQuery.isSuccess || openApiQuery.isError,
  };
};

export default useEffectiveSections;
