/**
 * Takes a request and list of tiers and returns the tier associated with that request
 * or undefined if none matches.
 */
const tierForRequest = (request, tiers) => {
  return tiers?.find?.(t => t.level === request.serviceLevel?.value
      && t.cost === request.maximumCostsMonetaryValue
      && t.type === request.serviceType?.value);
};

export default tierForRequest;
