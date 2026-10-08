import { useOkapiKy } from '@folio/stripes/core';
import { useQuery } from 'react-query';

const CACHE_TIME = 30 * 60 * 1000;

const useDirectoryOpenApi = enabled => {
  const ky = useOkapiKy();

  return useQuery(
    ['directory/openapi.json'],
    ({ signal }) => ky('directory/openapi.json', { signal }).json(),
    {
      enabled,
      staleTime: CACHE_TIME,
      cacheTime: CACHE_TIME,
      retry: false,
      useErrorBoundary: false,
      refetchOnWindowFocus: false,
    },
  );
};

export default useDirectoryOpenApi;
