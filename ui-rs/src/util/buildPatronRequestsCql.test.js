import { buildPatronRequestsCql } from './buildPatronRequestsCql';

const cqlFor = (params) => buildPatronRequestsCql({ search: `?${params}` });

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
});
