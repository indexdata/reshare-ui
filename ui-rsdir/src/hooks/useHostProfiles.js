import { useMemo } from 'react';
import { hostProfilesFromOpenApi, vendorFieldMappingForVendor } from '../config/vendorFieldMapping';
import useDirectoryOpenApi from './useDirectoryOpenApi';

const useHostProfiles = (configKey, fieldMapping) => {
  const query = useDirectoryOpenApi(true);
  const metadata = useMemo(() => {
    if (!query.data) return undefined;
    try {
      const profiles = hostProfilesFromOpenApi(query.data);
      // Validate typed values and branch locks before mounting the editor so
      // malformed metadata uses the same recoverable error as a failed fetch.
      profiles.names.forEach(name => {
        vendorFieldMappingForVendor(fieldMapping, name, configKey,
          profiles.vendorFieldMapping, undefined, profiles.vendorFieldValues);
      });
      return profiles;
    } catch (error) {
      return undefined;
    }
  }, [query.data, configKey, fieldMapping]);

  return {
    metadata,
    isError: !metadata && (query.isError || query.isSuccess),
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

export default useHostProfiles;
