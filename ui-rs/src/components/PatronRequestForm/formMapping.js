import omit from 'lodash/omit';
import { PublicationType } from '@projectreshare/stripes-reshare';
import { ID_ARRAYS, extractIdentifiers } from '#/util/bibIdentifiers';
import patronEmail, { withPatronEmail } from '#/util/patronEmail';
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

// Older requests used lowercase codes; select options now use ISO casing.
const withIsoPublicationType = publicationInfo => {
  const code = publicationInfo?.publicationType?.['#text'];
  if (!code || typeof code !== 'string') return publicationInfo;
  const isoCode = PublicationType.find(iso => iso.toLowerCase() === code.toLowerCase()) || code;
  return {
    ...publicationInfo,
    publicationType: { ...publicationInfo.publicationType, '#text': isoCode },
  };
};

// Lift the displayed codes into the form's `identifiers` fields, keeping the raw
// arrays in bibliographicInfo for rebuildIds to merge back into.
const brokerToForm = (request, { tiers = [] } = {}) => {
  const illRequest = request?.illRequest ?? {};
  const bibliographicInfo = illRequest.bibliographicInfo ?? {};
  const publicationInfo = withIsoPublicationType(illRequest.publicationInfo);

  const identifiers = extractIdentifiers(bibliographicInfo);
  const tier = findMatchingTier(illRequest, tiers);
  const email = patronEmail(illRequest.patronInfo);

  return {
    ...illRequest,
    bibliographicInfo,
    ...(publicationInfo && { publicationInfo }),
    identifiers,
    ...(tier && { tier: tier.id }),
    ...(email && { patronEmail: email }),
    ...(request?.internalNote && { internalNote: request.internalNote }),
    ...(request?.requesterPickupLocationId && { requesterPickupLocationId: request.requesterPickupLocationId }),
  };
};

const formToBroker = (submittedRecord, { operation = CREATE, tiers = [] } = {}) => {
  const {
    internalNote,
    requesterPickupLocationId,
    identifiers = {},
    tier: tierId,
    patronEmail: email,
    ...illRequestFields
  } = submittedRecord;

  const bibliographicInfo = { ...illRequestFields.bibliographicInfo };
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
  const address = withPatronEmail(illRequest.patronInfo?.address, email);
  if (address.length > 0) illRequest.patronInfo = { ...illRequest.patronInfo, address };
  else if (illRequest.patronInfo) illRequest.patronInfo = omit(illRequest.patronInfo, 'address');
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
