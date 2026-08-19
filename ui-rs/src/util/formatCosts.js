// ISO 18626 TypeCosts: a monetary value paired with an ISO 4217 currency code.
// Used for the requester's maximum cost and the supplier's delivery cost.
const formatCosts = (costs) => {
  const value = costs?.monetaryValue;
  if (value === undefined || value === null || value === '') return undefined;
  const currency = costs?.currencyCode?.['#text'];
  return currency ? `${value} ${currency}` : `${value}`;
};

export default formatCosts;
