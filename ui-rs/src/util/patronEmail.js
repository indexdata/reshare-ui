// ISO 18626 has no flat patron email field: addresses hang off patronInfo, each
// tagged with a type. The broker collects every Email-typed address when it
// sends patron notifications; a single request rarely carries more than one, so
// the first is what gets displayed.
const patronEmail = (patronInfo) => (patronInfo?.address ?? [])
  .map(a => a?.electronicAddress)
  .find(e => e?.electronicAddressData
    && e?.electronicAddressType?.['#text']?.toLowerCase() === 'email')
  ?.electronicAddressData;

export default patronEmail;
