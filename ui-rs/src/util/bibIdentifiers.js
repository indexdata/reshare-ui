// ISO 18626 carries identifiers as two coded arrays rather than scalar fields,
// and the standard fixes which array a given code belongs to.
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

// Flattens the coded arrays into { ISBN, ISSN, OCLC }, omitting codes that are
// absent. A code repeated within an array keeps its first entry, which is all
// the form can round-trip.
const extractIdentifiers = (bibliographicInfo) => {
  const info = bibliographicInfo ?? {};
  const identifiers = {};
  Object.entries(ID_ARRAYS).forEach(([arrayKey, { idKey, codeKey, codes }]) => {
    codes.forEach(code => {
      const value = (info[arrayKey] ?? [])
        .find(e => e?.[codeKey]?.['#text'] === code)?.[idKey];
      if (value) identifiers[code] = value;
    });
  });
  return identifiers;
};

export { ID_ARRAYS, extractIdentifiers };
