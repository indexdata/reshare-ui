export const hasOwnValue = (source, fieldName) => source?.[fieldName] != null;

// Profile locks take precedence; otherwise retain all saved branches for validation.
export const selectedBranches = (field, value) => (field.lockedSelection !== undefined ?
  field.subMap.filter(child => child.fieldName === field.lockedSelection) :
  field.subMap.filter(child => hasOwnValue(value, child.fieldName)));
