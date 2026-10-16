// ISO 18626 has no flat patron email field: addresses hang off patronInfo, each
// tagged with a type. The broker collects every Email-typed address when it
// sends patron notifications; a single request rarely carries more than one, so
// the first is what gets displayed.
const isEmailAddress = (address) => address?.electronicAddress
  ?.electronicAddressType?.['#text']?.toLowerCase() === 'email';

const patronEmail = (patronInfo) => (patronInfo?.address ?? [])
  .find(a => isEmailAddress(a) && a.electronicAddress.electronicAddressData)
  ?.electronicAddress.electronicAddressData;

// If the email field is unchanged, preserve the original address list so saving
// unrelated edits does not discard additional email addresses or their metadata.
const withPatronEmail = (addresses, email) => {
  if (email === patronEmail({ address: addresses })) return addresses ?? [];
  return [
    ...(addresses ?? []).filter(a => !isEmailAddress(a)),
    ...(email ? [{ electronicAddress: { electronicAddressType: { '#text': 'Email' }, electronicAddressData: email } }] : []),
  ];
};

export default patronEmail;
export { withPatronEmail };
