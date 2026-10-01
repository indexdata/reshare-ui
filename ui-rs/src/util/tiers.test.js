import { findMatchingTier } from './tiers';

const standardLoan = { id: 't-std-loan', name: 'Standard loan', type: 'loan', level: 'standard', cost: 0 };
const expressLoan = { id: 't-exp-loan', name: 'Express loan', type: 'loan', level: 'express', cost: 15 };
const standardCopy = { id: 't-std-copy', name: 'Standard copy', type: 'copy', level: 'standard', cost: 5 };
const tiers = [standardLoan, expressLoan, standardCopy];

const request = (serviceLevel, monetaryValue) => ({
  serviceInfo: { serviceType: 'Loan', serviceLevel: { '#text': serviceLevel } },
  ...(monetaryValue !== undefined && {
    billingInfo: { maximumCosts: { monetaryValue, currencyCode: { '#text': 'USD' } } },
  }),
});

describe('findMatchingTier', () => {
  it('matches on type, level and maximum cost', () => {
    expect(findMatchingTier(request('Express', '15.00'), tiers)).toBe(expressLoan);
    expect(findMatchingTier(request('standard'), tiers)).toBe(standardLoan);
    expect(findMatchingTier(request('Standard', '0'), tiers)).toBe(standardLoan);
    expect(findMatchingTier(request('Express', '7'), tiers)).toBeUndefined();
    expect(findMatchingTier({ serviceInfo: { serviceType: 'Loan' } }, tiers)).toBeUndefined();
  });
});
