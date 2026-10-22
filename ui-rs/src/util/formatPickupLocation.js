import formatAddress, { joinPresent } from './formatAddress';

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

// One line, for list cells.
export const formatPickupLocationShort = (record, owned) => {
  if (record?.requesterPickupLocationId) return branchName(record, owned);
  const address = deliveryAddress(record);
  if (!address) return undefined;
  return joinPresent([address.line1, address.locality], ', ');
};

// Newline-separated, for KeyValue.
export const formatPickupLocationFull = (record, owned) => {
  if (record?.requesterPickupLocationId) return branchName(record, owned);
  return formatAddress(deliveryAddress(record));
};
