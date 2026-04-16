import kebabToPascal from './kebabToPascal';

describe('kebabToPascal', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(kebabToPascal('foo-bar-baz')).toBe('FooBarBaz');
  });
  it('capitalises a single segment', () => {
    expect(kebabToPascal('foo')).toBe('Foo');
  });
  it('returns empty string unchanged', () => {
    expect(kebabToPascal('')).toBe('');
  });
  it('preserves already-capitalised segments', () => {
    expect(kebabToPascal('API-key')).toBe('APIKey');
  });
});
