import { buildPatronRequestsCql, buildFacetOptionsCql, escapeCqlTerm } from './buildPatronRequestsCql';

const cqlFor = (params) => buildPatronRequestsCql({ search: `?${params}` });
const facetCqlFor = (params, excludeName, narrow) => buildFacetOptionsCql({ search: `?${params}` }, excludeName, narrow);

describe('buildPatronRequestsCql', () => {
  describe('requester_name index', () => {
    it('treats the whole query as a surname when there is no comma', () => {
      const cql = cqlFor('qindex=requester_name&query=Smith');
      expect(cql).toContain('surname="Smith"');
      expect(cql).not.toContain('given_name');
    });

    it('splits "Surname, Given" into surname and given_name clauses', () => {
      const cql = cqlFor('qindex=requester_name&query=Smith%2C%20John');
      expect(cql).toContain('surname="Smith" and given_name="John"');
    });

    it('ignores an empty given name after the comma', () => {
      const cql = cqlFor('qindex=requester_name&query=Smith%2C%20');
      expect(cql).toContain('surname="Smith"');
      expect(cql).not.toContain('given_name');
    });

    it('does not emit the fake requester_name index', () => {
      const cql = cqlFor('qindex=requester_name&query=Smith');
      expect(cql).not.toContain('requester_name');
    });

    it('escapes quotes and backslashes in the name values', () => {
      const cql = cqlFor(`qindex=requester_name&query=${encodeURIComponent('Sm\\ith, Jo"hn')}`);
      expect(cql).toBe('surname="Sm\\\\ith" and given_name="Jo\\"hn"');
    });
  });

  describe('cql index', () => {
    it('passes a raw CQL query through verbatim', () => {
      const cql = cqlFor('qindex=cql&query=surname%3D%3D%22Smith%22');
      expect(cql).toContain('surname=="Smith"');
    });

    it('does not escape the user-supplied quotes', () => {
      const cql = cqlFor('qindex=cql&query=surname%3D%3D%22Smith%22');
      expect(cql).not.toContain('\\"');
    });

    it('composes filters on top of the raw query', () => {
      const cql = cqlFor('qindex=cql&query=surname%3D%3D%22Smith%22&filters=terminal.false');
      expect(cql).toContain('surname=="Smith"');
      expect(cql).toContain('terminal_state');
    });
  });

  it('leaves an ordinary qindex untouched', () => {
    const cql = cqlFor('qindex=title&query=Dune');
    expect(cql).toContain('title="Dune"');
  });

  describe('peer filter groups', () => {
    it('emits supplier_symbol with the broker single-= operator for a supplier filter', () => {
      const cql = cqlFor('filters=supplier.ISIL%3AUS-A');
      expect(cql).toContain('supplier_symbol="ISIL:US-A"');
      expect(cql).not.toContain('supplier_symbol==');
    });

    it('emits requester_symbol for a requester filter', () => {
      const cql = cqlFor('filters=requester.ISIL%3AUS-B');
      expect(cql).toContain('requester_symbol="ISIL:US-B"');
    });
  });
});

describe('escapeCqlTerm', () => {
  it('backslash-escapes CQL specials so they are matched literally', () => {
    expect(escapeCqlTerm('a"b\\c*d?e^f')).toBe('a\\"b\\\\c\\*d\\?e\\^f');
  });
});

describe('buildFacetOptionsCql', () => {
  it('drops the facet\'s own selection but keeps other filters and the query', () => {
    // Two supplier values, either side of another group: every value of the facet's own
    // group goes, wherever it sits in the list.
    const cql = facetCqlFor(
      'query=Dune&qindex=title&filters=supplier.ISIL%3AUS-A,terminal.false,supplier.ISIL%3AUS-B',
      'supplier',
    );
    expect(cql).toContain('title="Dune"');
    expect(cql).toContain('terminal_state');
    expect(cql).not.toContain('supplier_symbol');
  });

  it('drops sort so the option list is unordered aggregation only', () => {
    const cql = facetCqlFor('filters=terminal.false&sort=-dateCreated', 'supplier');
    expect(cql).not.toContain('sortby');
  });

  it('appends a parenthesised prefix clause over both name and symbol fields', () => {
    const cql = facetCqlFor('filters=terminal.false', 'supplier', {
      nameField: 'supplier_name',
      symbolField: 'supplier_symbol',
      term: 'smi',
    });
    // Both sides bracketed: the base may itself contain `or` (raw CQL index).
    expect(cql).toBe('(terminal_state="false") and (supplier_name = "smi*" or supplier_symbol = "smi*")');
  });

  it('escapes the typeahead term before appending the trailing wildcard', () => {
    const cql = facetCqlFor('filters=terminal.false', 'supplier', {
      nameField: 'supplier_name',
      symbolField: 'supplier_symbol',
      term: 'a"b',
    });
    expect(cql).toContain('supplier_name = "a\\"b*"');
  });

  it('stands the narrow clause alone when the base query is empty', () => {
    // Only the peer filter is set; dropping it for the option list leaves no query and no
    // filters, so makeQueryFunction returns null. The clause must not be ANDed onto a
    // literal "null"/"undefined".
    const cql = facetCqlFor('filters=supplier.ISIL%3AUS-A', 'supplier', {
      nameField: 'supplier_name', symbolField: 'supplier_symbol', term: 'smi',
    });
    expect(cql).toBe('(supplier_name = "smi*" or supplier_symbol = "smi*")');
    expect(cql).not.toMatch(/null|undefined/);
  });
});
