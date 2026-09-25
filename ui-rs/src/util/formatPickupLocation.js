// A requester's chosen branch by name, falling back to its id once owned entries
// have loaded without it. Otherwise the first physical delivery address, which is
// all a supplier's copy of the request carries.
const branchName = (record, { byId, isSettled }) => {
  const id = record?.requesterPickupLocationId;
  if (!id) return undefined;
  return byId.get(id)?.name ?? (isSettled ? id : undefined);
};

const deliveryAddress = record => record?.illRequest?.requestedDeliveryInfo
  ?.find(info => info?.address?.physicalAddress)?.address.physicalAddress;

const joinPresent = (parts, separator) => parts.filter(Boolean).join(separator);

// One line, for list cells.
export const formatPickupLocationShort = (record, owned) => {
  if (record?.requesterPickupLocationId) return branchName(record, owned);
  const address = deliveryAddress(record);
  if (!address) return undefined;
  return joinPresent([address.line1, address.locality], ', ');
};

// Newline-separated; KeyValue renders its value with white-space: pre-wrap.
export const formatPickupLocationFull = (record, owned) => {
  if (record?.requesterPickupLocationId) return branchName(record, owned);
  const address = deliveryAddress(record);
  if (!address) return undefined;
  return joinPresent([
    address.line1,
    address.line2,
    joinPresent([
      address.locality,
      joinPresent([address.region?.['#text'], address.postalCode], ' '),
    ], ', '),
    address.country?.['#text'],
  ], '\n');
};
