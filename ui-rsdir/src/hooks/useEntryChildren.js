import { useQuery } from 'react-query';
import { useOkapiKy } from '@folio/stripes/core';

const pageSize = 1000;

const useEntryChildren = (entry, childType) => {
  const ky = useOkapiKy();
  const parentType = childType === 'Branch' ? 'Institution' : 'Consortium';
  const cql = `type=${childType} and parent=${entry.id}`;

  return useQuery(['directory/entries', { cql }, 'all-children'], async ({ signal }) => {
    const children = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await ky('directory/entries', {
        signal,
        searchParams: { cql, limit: pageSize, offset },
      }).json();
      const page = Array.isArray(data) ? data : data?.items || [];
      children.push(...page);
      offset += page.length;

      // Use the actual number returned in case the server caps page size.
      // Without a total, an empty page confirms that every child was fetched.
      hasMore = page.length > 0 &&
        (typeof data?.about?.count !== 'number' || offset < data.about.count);
    }

    return children;
  }, {
    enabled: entry.type === parentType && !!entry.id,
    staleTime: 2 * 60 * 1000,
    cacheTime: 32 * 60 * 1000,
    useErrorBoundary: true,
  });
};

export default useEntryChildren;
