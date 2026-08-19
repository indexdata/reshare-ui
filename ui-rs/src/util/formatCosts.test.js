import formatCosts from './formatCosts';

// Ordinary "value currency" formatting is asserted by the Flow route tests.
describe('formatCosts', () => {
  it('keeps a zero cost, which is meaningfully different from none', () => {
    expect(formatCosts({ monetaryValue: 0, currencyCode: { '#text': 'GBP' } })).toBe('0 GBP');
    expect(formatCosts({ monetaryValue: '12.50' })).toBe('12.50');
    expect(formatCosts({})).toBeUndefined();
  });
});
