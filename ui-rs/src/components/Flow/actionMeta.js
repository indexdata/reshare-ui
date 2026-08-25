// Per-action client-side display metadata not provided by the API.
//
// `hidden` keeps an action out of the secondary "More options" list
// e.g. for when the UI surfaces them elsewhere
const actionMeta = {
  'ship': { icon: 'archive' },
  'supply-document': { icon: 'link', primaryOnly: true },
  'ship-return': { icon: 'archive' },
  'cannot-supply': { icon: 'times-circle-solid' },
  'reject-cancel': { icon: 'times-circle-solid' },
  'reject-condition': { icon: 'times-circle-solid' },
  'cancel-request': { icon: 'times-circle-solid' },
  'accept-cancel': { icon: 'check-circle' },
  'accept-condition': { icon: 'check-circle' },
  'will-supply': { icon: 'check-circle' },
  'add-condition': { icon: 'plus-sign' },
  'add-item': { icon: 'plus-sign' },
  'remove-item': { icon: 'trash', hidden: true },
  'ask-retry': { icon: 'edit' },
};

export default actionMeta;
