// ISO 18626 has no flat patron email field: addresses hang off patronInfo, each
// tagged with a type. The broker collects every Email-typed address when it
// sends patron notifications; a single request rarely carries more than one, so
// the first is what gets displayed.
const isEmailAddress = (address) => address?.electronicAddress
  ?.electronicAddressType?.['#text']?.toLowerCase() === 'email';

const patronEmail = (patronInfo) => (patronInfo?.address ?? [])
  .find(a => isEmailAddress(a) && a.electronicAddress.electronicAddressData)
  ?.electronicAddress.electronicAddressData;

// Replaces every Email-typed address with this one, or removes them all when it
// is empty; other addresses are kept.
const withPatronEmail = (addresses, email) => [
  ...(addresses ?? []).filter(a => !isEmailAddress(a)),
  ...(email ? [{ electronicAddress: { electronicAddressType: { '#text': 'Email' }, electronicAddressData: email } }] : []),
];

export default patronEmail;
export { withPatronEmail };
