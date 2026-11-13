import { useStripes } from '@folio/stripes/core';

// Mirrors the directory backend's write checks:
// - consortium admins may change anything;
// - institution admins may PATCH an entry whose tenant matches the
//   X-Okapi-Tenant header (stripes.okapi.tenant), but not its tenant field;
// - creating entries and changing tiers, networks or closures is consortium-only.
const useDirectoryPermissions = (entry) => {
  const stripes = useStripes();
  // hasPerm returns undefined until the user's permissions load.
  const isConsortiumAdmin = !!stripes.hasPerm('directory.consortium.all');
  const ownsEntry = !!entry?.tenant && entry.tenant === stripes.okapi?.tenant;
  const canEditEntry = isConsortiumAdmin ||
    (!!stripes.hasPerm('directory.institution.all') && ownsEntry);

  return { isConsortiumAdmin, canEditEntry };
};

export default useDirectoryPermissions;
