// Map shared-index fields into PatronRequestForm's nested field names.
const SI_FIELD_MAP = {
  title: 'bibliographicInfo.title',
  author: 'bibliographicInfo.author',
  edition: 'bibliographicInfo.edition',
  isbn: 'identifiers.ISBN',
  issn: 'identifiers.ISSN',
  oclcNumber: 'identifiers.OCLC',
  publisher: 'publicationInfo.publisher',
  publicationDate: 'publicationInfo.publicationDate',
  placeOfPublication: 'publicationInfo.placeOfPublication',
  publicationType: "publicationInfo.publicationType['#text']",
};

const handleSISelect = (args, state, tools) => {
  const leader = args?.[0]?.__leader__;
  if (leader && leader?.[6] === 'a') {
    const stval = state.formState.values?.serviceInfo?.serviceType;
    const leaderField = leader?.[7];
    const pubTypeMatch = {
      'Loan' : {
        'a' : 'chapter',
        'b' : 'article',
        'm' : 'book',
        's' : 'journal'
      },
      'Copy' : {
        'a' : 'chapter',
        'b' : 'article',
        'm' : 'chapter',
        's' : 'article'
      }
    };

    if (stval in pubTypeMatch) {
      const pubTypeVal = pubTypeMatch[stval][leaderField];
      if (pubTypeVal) {
        args[0].publicationType = pubTypeVal;
      }
    }
  }

  Object.entries(args[0]).forEach(([field, value]) => {
    const mappedField = SI_FIELD_MAP[field] ?? field;
    tools.changeValue(state, mappedField, () => value);
  });

  // Clear the mapped fields the selected instance did not supply, so a second
  // selection cannot leave values behind from the first.
  Object.entries(SI_FIELD_MAP)
    .filter(([field]) => !(field in args[0]))
    .forEach(([, mappedField]) => tools.changeValue(state, mappedField, () => undefined));
};

export default handleSISelect;
