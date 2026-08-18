import { extractIdentifiers } from './bibIdentifiers';

const itemId = (code, value) => ({
  bibliographicItemIdentifier: value,
  bibliographicItemIdentifierCode: { '#text': code },
});

// Straightforward ISBN/ISSN/OCLC extraction is covered by the route tests that
// render and edit a request; these are the cases those never produce.
describe('extractIdentifiers', () => {
  it('keeps the first entry of a repeated code and skips codes it cannot display', () => {
    expect(extractIdentifiers({
      bibliographicItemId: [itemId('ISBN', 'isbn-1'), itemId('ISBN', 'isbn-2'), itemId('ISMN', 'ismn-1')],
    })).toEqual({ ISBN: 'isbn-1' });
  });

  it('returns an empty map rather than throwing on missing bibliographic info', () => {
    expect(extractIdentifiers(undefined)).toEqual({});
  });
});
