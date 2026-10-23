export const joinPresent = (parts, separator) => parts.filter(Boolean).join(separator);

// An ISO 18626 PhysicalAddress, newline-separated; KeyValue renders its value with
// white-space: pre-wrap.
const formatAddress = address => address && joinPresent([
  address.line1,
  address.line2,
  joinPresent([
    address.locality,
    joinPresent([address.region?.['#text'], address.postalCode], ' '),
  ], ', '),
  address.country?.['#text'],
], '\n');

export default formatAddress;
