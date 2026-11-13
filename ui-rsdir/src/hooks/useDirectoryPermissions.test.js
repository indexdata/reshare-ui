import { renderHook } from '@folio/jest-config-stripes/testing-library/react';
import useDirectoryPermissions from './useDirectoryPermissions';

let mockStripes;
jest.mock('@folio/stripes/core', () => ({
  useStripes: () => mockStripes,
}));

const setUser = (perms, tenant = 'inst1') => {
  mockStripes = {
    hasPerm: perm => perms.includes(perm),
    okapi: { tenant },
  };
};

const permsFor = entry => renderHook(() => useDirectoryPermissions(entry)).result.current;

describe('useDirectoryPermissions', () => {
  it('lets consortium admins edit any entry', () => {
    setUser(['directory.consortium.all']);
    expect(permsFor({ tenant: 'other' })).toEqual({ isConsortiumAdmin: true, canEditEntry: true });
  });

  it('lets institution admins edit only entries for their tenant', () => {
    setUser(['directory.institution.all']);
    expect(permsFor({ tenant: 'inst1' })).toEqual({ isConsortiumAdmin: false, canEditEntry: true });
    expect(permsFor({ tenant: 'other' }).canEditEntry).toBe(false);
    expect(permsFor({}).canEditEntry).toBe(false);
  });

  it('denies users without directory write permissions', () => {
    setUser([]);
    expect(permsFor({ tenant: 'inst1' })).toEqual({ isConsortiumAdmin: false, canEditEntry: false });
  });
});
