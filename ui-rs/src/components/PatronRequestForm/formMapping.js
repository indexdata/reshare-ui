import { CREATE, EDIT } from './operations';

const ID_ARRAYS = {
  bibliographicItemId: {
    idKey: 'bibliographicItemIdentifier',
    codeKey: 'bibliographicItemIdentifierCode',
    codes: ['ISBN', 'ISSN'],
  },
  bibliographicRecordId: {
    idKey: 'bibliographicRecordIdentifier',
    codeKey: 'bibliographicRecordIdentifierCode',
    codes: ['OCLC'],
  },
};

// Entries for the codes the form exposes, with any other code left as it was, so
// identifiers we do not display survive a PUT.
const rebuildIds = (entries, { idKey, codeKey, codes }, identifiers) => [
  ...(entries ?? []).filter(e => !codes.includes(e?.[codeKey]?.['#text'])),
  ...codes.filter(code => identifiers[code]).map(code => ({
    [idKey]: identifiers[code],
    [codeKey]: { '#text': code },
  })),
];

// Lift the displayed codes into the form's `identifiers` fields, keeping the raw
// arrays in bibliographicInfo for rebuildIds to merge back into.
const brokerToForm = (request) => {
  const illRequest = request?.illRequest ?? {};
  const { supplierUniqueRecordId, ...bibliographicInfo } = illRequest.bibliographicInfo ?? {};

  const identifiers = {};
  Object.entries(ID_ARRAYS).forEach(([arrayKey, { idKey, codeKey, codes }]) => {
    codes.forEach(code => {
      const value = (bibliographicInfo[arrayKey] ?? [])
        .find(e => e?.[codeKey]?.['#text'] === code)?.[idKey];
      if (value) identifiers[code] = value;
    });
  });

  return {
    ...illRequest,
    bibliographicInfo,
    identifiers,
    ...(supplierUniqueRecordId && { systemInstanceIdentifier: supplierUniqueRecordId }),
    ...(request?.internalNote && { internalNote: request.internalNote }),
  };
};

const formToBroker = (submittedRecord, { operation = CREATE } = {}) => {
  const {
    internalNote,
    identifiers = {},
    systemInstanceIdentifier,
    ...illRequestFields
  } = submittedRecord;

  const bibliographicInfo = {
    ...illRequestFields.bibliographicInfo,
    supplierUniqueRecordId: systemInstanceIdentifier,
  };
  Object.entries(ID_ARRAYS).forEach(([arrayKey, spec]) => {
    const entries = rebuildIds(illRequestFields.bibliographicInfo?.[arrayKey], spec, identifiers);
    // Omit the key entirely rather than sending an empty array.
    if (entries.length > 0) bibliographicInfo[arrayKey] = entries;
    else delete bibliographicInfo[arrayKey];
  });

  // PUT needs an explicit empty string to clear a note; POST can omit an empty note.
  const brokerInternalNote = operation === EDIT
    ? { internalNote: internalNote ?? '' }
    : (internalNote ? { internalNote } : {});

  return {
    patron: illRequestFields?.patronInfo?.patronId,
    ...brokerInternalNote,
    illRequest: {
      ...illRequestFields,
      bibliographicInfo,
    },
  };
};

export { brokerToForm, formToBroker };
