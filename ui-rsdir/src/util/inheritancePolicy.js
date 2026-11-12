import { metadataAtPath } from './configFieldDescription';

// Mirrors crosslink/directory/policy: x-inheritance-root and x-editable-on are
// declared on EntryProperties' configuration containers and their direct
// children. A child without its own annotation takes the container's value.

export const EDITABLE = 'editable';
export const READ_ONLY = 'readOnly';
export const HIDDEN = 'hidden';

// Entry types from the bottom of the hierarchy to the top.
const RANK = { Branch: 0, Institution: 1, Consortium: 2 };

const policyValue = (spec, configKey, fieldName, extension) => {
  const entrySchema = spec?.components?.schemas?.EntryProperties;
  const read = schema => schema[extension];

  return metadataAtPath(spec, entrySchema, [configKey, fieldName], read) ??
    metadataAtPath(spec, entrySchema, [configKey], read);
};

// Whether an entry type has an ancestor that a field with this root consults.
const canInherit = (root, entryType) => (
  root in RANK && entryType in RANK && RANK[entryType] < RANK[root]
);

// Whether an entry of entryType would inherit this field when it stores no value.
export const fieldCanInherit = (spec, configKey, fieldName, entryType) => (
  canInherit(policyValue(spec, configKey, fieldName, 'x-inheritance-root'), entryType)
);

// Missing metadata leaves the field editable; Directory still rejects invalid writes.
export const fieldAccess = (spec, configKey, fieldName, entryType) => {
  const editableOn = policyValue(spec, configKey, fieldName, 'x-editable-on');
  if (!Array.isArray(editableOn) || !(entryType in RANK) || editableOn.includes(entryType)) return EDITABLE;

  return fieldCanInherit(spec, configKey, fieldName, entryType) ? READ_ONLY : HIDDEN;
};

// Inherited-only fields become read-only; fields the type can neither store nor inherit are removed.
export const applyInheritancePolicy = (fieldMap, spec, configKey, entryType) => fieldMap.flatMap(field => {
  const access = fieldAccess(spec, configKey, field.fieldName, entryType);
  if (access === HIDDEN) return [];
  return access === READ_ONLY ? [{ ...field, readOnly: true }] : [field];
});
