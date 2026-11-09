import { useMemo } from 'react';
import { CONFIG_SECTIONS, configSection } from '../config/configSections';
import { hostProfileChoices, vendorFieldMappingForVendor } from '../config/vendorFieldMapping';
import useHostProfiles from './useHostProfiles';

const lmsFields = configSection('lmsConfig').fieldMap;
const catalogFields = configSection('catalogConfig').fieldMap;

const withChoices = (fields, fieldName, validChoices) => fields.map(field => (
  field.fieldName === fieldName ? { ...field, validChoices } : field
));

// Shared by search and editors. LMS and catalog maps require valid host-profile metadata.
const useEffectiveSections = entry => {
  const lms = useHostProfiles('lmsConfig', lmsFields);
  const catalog = useHostProfiles('catalogConfig', catalogFields);
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

  const sections = useMemo(() => CONFIG_SECTIONS.map(row => {
    if (row.configKey === 'lmsConfig') return { ...row, fieldMap: lmsMap };
    if (row.configKey === 'catalogConfig') return { ...row, fieldMap: catalogMap };
    return row;
  }), [lmsMap, catalogMap]);

  return { sections, hostProfiles: { lmsConfig: lms, catalogConfig: catalog } };
};

export default useEffectiveSections;
