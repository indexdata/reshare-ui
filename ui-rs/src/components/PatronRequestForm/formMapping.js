import omit from 'lodash/omit';
import { ID_ARRAYS, extractIdentifiers } from '#/util/bibIdentifiers';
import { findMatchingTier, tierMaximumCosts, tierToServiceLevel } from '#/util/tiers';
import { CREATE, EDIT } from './operations';

// Entries for the codes the form exposes, with any other code left as it was, so
// identifiers we do not display survive a PUT.
const rebuildIds = (entries, { idKey, codeKey, codes }, identifiers) => [
  ...(entries ?? []).filter(e => !codes.includes(e?.[codeKey]?.['#text'])),
  ...codes.filter(code => identifiers[code]).map(code => ({
    [idKey]: identifiers[code],
    [codeKey]: { '#text': code },
  })),
];

// Lift the displayed codes into the form's `identifiers` fields, keeping the raw
// arrays in bibliographicInfo for rebuildIds to merge back into.
const brokerToForm = (request, { tiers = [] } = {}) => {
  const illRequest = request?.illRequest ?? {};
  const { supplierUniqueRecordId, ...bibliographicInfo } = illRequest.bibliographicInfo ?? {};

  const identifiers = extractIdentifiers(bibliographicInfo);
  const tier = findMatchingTier(illRequest, tiers);

  return {
    ...illRequest,
    bibliographicInfo,
    identifiers,
    ...(tier && { tier: tier.id }),
    ...(supplierUniqueRecordId && { systemInstanceIdentifier: supplierUniqueRecordId }),
    ...(request?.internalNote && { internalNote: request.internalNote }),
    ...(request?.requesterPickupLocationId && { requesterPickupLocationId: request.requesterPickupLocationId }),
  };
};

const formToBroker = (submittedRecord, { operation = CREATE, tiers = [] } = {}) => {
  const {
    internalNote,
    requesterPickupLocationId,
    identifiers = {},
    systemInstanceIdentifier,
    tier: tierId,
    ...illRequestFields
  } = submittedRecord;

  const bibliographicInfo = {
    ...illRequestFields.bibliographicInfo,
    supplierUniqueRecordId: systemInstanceIdentifier,
  };
  Object.entries(ID_ARRAYS).forEach(([arrayKey, spec]) => {
    const entries = rebuildIds(illRequestFields.bibliographicInfo?.[arrayKey], spec, identifiers);
    // Omit the key entirely rather than sending an empty array.
    if (entries.length > 0) bibliographicInfo[arrayKey] = entries;
    else delete bibliographicInfo[arrayKey];
  });

  // PUT needs an explicit empty string to clear a note; POST can omit an empty note.
  const brokerInternalNote = operation === EDIT
    ? { internalNote: internalNote ?? '' }
    : (internalNote ? { internalNote } : {});
  // PUT leaves an omitted pickup location as it was, so clearing one needs null.
  const brokerPickupLocation = operation === EDIT
    ? { requesterPickupLocationId: requesterPickupLocationId || null }
    : (requesterPickupLocationId ? { requesterPickupLocationId } : {});

  // Without a tier, an edit keeps the level and cost the request already had.
  const tier = tierId && tiers.find(t => t.id === tierId);
  const illRequest = { ...illRequestFields, bibliographicInfo };
  if (tier) {
    const maximumCosts = tierMaximumCosts(tier);
    const billingInfo = { ...omit(illRequest.billingInfo, 'maximumCosts'), ...(maximumCosts && { maximumCosts }) };
    illRequest.serviceInfo = { ...illRequest.serviceInfo, serviceLevel: tierToServiceLevel(tier) };
    if (Object.keys(billingInfo).length > 0) illRequest.billingInfo = billingInfo;
    else delete illRequest.billingInfo;
  }

  return {
    patron: illRequestFields?.patronInfo?.patronId,
    ...brokerInternalNote,
    ...brokerPickupLocation,
    illRequest,
  };
};

// A new transaction linked to the original only by prevReqId, so the original's
// protocol header and any Retry linkage go.
const formToRevision = (submittedRecord, prevReqId, options) => {
  const record = formToBroker(submittedRecord, options);
  const illRequest = omit(record.illRequest, 'header');
  const serviceInfo = omit(illRequest.serviceInfo, 'requestingAgencyPreviousRequestId');

  return {
    ...record,
    prevReqId,
    illRequest: {
      ...illRequest,
      serviceInfo: {
        ...serviceInfo,
        requestType: 'New',
      },
    },
  };
};

export { brokerToForm, formToBroker, formToRevision };
