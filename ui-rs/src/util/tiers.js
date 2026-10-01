import { ServiceLevel } from '@projectreshare/stripes-reshare';

// The broker has no tier field; a request carries a tier only as its service
// level and maximum cost.

const lc = value => String(value ?? '').toLowerCase();

const tiersOfType = (tiers, serviceType) => tiers.filter(tier => lc(tier.type) === lc(serviceType));

const tierToServiceLevel = tier => ({ '#text': ServiceLevel.find(iso => lc(iso) === tier.level) });

// A free tier sends no maximum cost, which the broker reads as reciprocal only.
const tierMaximumCosts = tier => (tier.cost
  ? { monetaryValue: tier.cost.toFixed(2), currencyCode: { '#text': tier.currency } }
  : undefined);

// The tier isn't recorded on the request, so match on type, level and maximum cost.
const findMatchingTier = (illRequest, tiers) => {
  const serviceType = illRequest?.serviceInfo?.serviceType;
  const level = illRequest?.serviceInfo?.serviceLevel?.['#text'];
  if (!serviceType || !level) return undefined;
  const cost = Number(illRequest.billingInfo?.maximumCosts?.monetaryValue ?? 0);
  return tiers.find(tier => lc(tier.type) === lc(serviceType)
    && tier.level === lc(level)
    && tier.cost === cost);
};

const formatTierOption = (tier, intl) => ({
  value: tier.id,
  label: intl.formatMessage({ id: 'ui-rs.information.tierOption' }, {
    name: tier.name,
    cost: intl.formatNumber(tier.cost, { style: 'currency', currency: tier.currency }),
  }),
});

export { findMatchingTier, formatTierOption, tierMaximumCosts, tierToServiceLevel, tiersOfType };
